import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, currentUser } from "@/lib/api";
import type { Prisma } from "@/generated/prisma/client";
import { publicProductWhere, reservedUnits } from "./availability";
import { selectionSchema, reviewedQuoteSchema, validContactPhone } from "./customer-contracts";
import { rateAllowed } from "@/lib/rate-limit";
import { rentalDays, lineAmounts } from "./rules";
import { bookingInclude, bookingRecord } from "./records";
import { notifyBooking } from "@/features/notifications/server";

const requestSchema = z.object({ quoteId: z.string().min(1).max(100), acceptedTerms: z.literal(true) }).strict();
const terms = "Reservation requests require boutique confirmation. Collect and return every item at the shop. Cancel before pickup. Rental prices are informational; Rentique does not collect payments.";

async function quoteSelection(tx: Prisma.TransactionClient, userId: string, raw: unknown) {
  const input = selectionSchema.parse(raw);
  const pickupAt = new Date(input.pickupAt), returnAt = new Date(input.returnAt);
  let days: number;
  try { days = rentalDays(pickupAt, returnAt); } catch (error) { throw new ApiError(400, (error as Error).message); }
  if (pickupAt.getTime() < Date.now() + 24 * 3600000 || returnAt.getTime() - pickupAt.getTime() > 14 * 86400000 || pickupAt.getTime() > Date.now() + 180 * 86400000) throw new ApiError(400, "Choose pickup at least 24 hours ahead, within 180 days, and a rental of up to 14 days.");
  const variants = await tx.productVariant.findMany({ where: { id: { in: input.items.map(item => item.variantId) }, archived: false, product: publicProductWhere }, include: { product: { include: { boutique: true, images: { orderBy: { position: "asc" }, take: 1 } } } } });
  if (variants.length !== input.items.length) throw new ApiError(409, "A selected item or size is no longer available.");
  const shop = variants[0].product.boutique;
  if (variants.some(variant => variant.product.boutiqueId !== shop.id)) throw new ApiError(400, "All items must belong to one boutique.");
  if (shop.ownerId === userId) throw new ApiError(403, "You cannot reserve your own boutique's inventory.");
  const lines = [];
  for (const selected of input.items) {
    const variant = variants.find(variant => variant.id === selected.variantId)!;
    const availableUnits = Math.max(0, variant.quantity - await reservedUnits(tx, variant.id, pickupAt, new Date(returnAt.getTime() + 86400000)));
    if (selected.quantity > availableUnits) throw new ApiError(409, variant.product.name + " is unavailable in this quantity for your dates.");
    const amounts = lineAmounts(variant.rentalPriceMinor ?? variant.product.rentalPriceMinor, BigInt(0), variant.product.rentalPriceUnit, days, selected.quantity);
    lines.push({ variantId: variant.id, productId: variant.productId, name: variant.product.name, size: variant.size,
      image: variant.product.images[0]?.secureUrl ?? "", measurements: variant.measurements, includedPieces: variant.product.includedPieces, category: variant.product.category,
      quantity: selected.quantity, rentalMinor: Number(amounts.rentalMinor), productVersion: variant.product.version, variantVersion: variant.version });
  }
  const rentalMinor = lines.reduce((sum, line) => sum + line.rentalMinor, 0);
  if (!Number.isSafeInteger(rentalMinor)) throw new ApiError(400, "Rental estimate is too large.");
  const policy = terms + [["Shop policy", shop.rentalPolicy], ["Collection instructions", shop.collectionInstructions], ["Cancellation policy", shop.cancellationPolicy], ["Return policy", shop.returnPolicy]].filter(([, value]) => value).map(([label, value]) => "\n" + label + ": " + value).join("");
  const fingerprint = createHash("sha256").update(JSON.stringify({ lines: [...lines].sort((a, b) => a.variantId.localeCompare(b.variantId)), policy, shopContact: [shop.name, shop.address, shop.city, shop.phone, shop.contactEmail], hours: shop.openingHours, pickupAt: input.pickupAt, returnAt: input.returnAt })).digest("hex");
  return { payload: { ...input, boutiqueId: shop.id, rentalMinor, fingerprint, policy, openingHours: shop.openingHours, collectionInstructions: shop.collectionInstructions, cancellationPolicy: shop.cancellationPolicy, returnPolicy: shop.returnPolicy },
    lines, boutique: { id: shop.id, name: shop.name, address: shop.address, city: shop.city, phone: shop.phone, contactEmail: shop.contactEmail }, rentalDays: days, currency: "INR" };
}

export async function createQuote(request: Request) {
  const user = await currentUser("CUSTOMER");
  if (!await rateAllowed("reservation-quote", user.id, 30, 60000)) throw new ApiError(429, "Please wait before checking another estimate.");
  const raw = await request.json();
  return prisma.$transaction(async tx => {
    const quote = await quoteSelection(tx, user.id, raw);
    const expiresAt = new Date(Date.now() + 5 * 60000);
    const record = await tx.bookingQuote.create({ data: { userId: user.id, payload: quote.payload, expiresAt } });
    return { ...quote.payload, lines: quote.lines, boutique: quote.boutique, rentalDays: quote.rentalDays, currency: "INR", quoteId: record.id, expiresAt: expiresAt.toISOString() };
  }, { isolationLevel: "RepeatableRead" });
}

export async function createReviewedBooking(request: Request) {
  const user = await currentUser("CUSTOMER");
  if (!user.emailVerified) throw new ApiError(403, "Verify your email from your profile before requesting a reservation.");
  if (!validContactPhone(user.phone)) throw new ApiError(400, "Add a valid contact phone number to your profile before reserving.");
  const input = requestSchema.parse(await request.json());
  const key = z.string().min(16).max(100).parse(request.headers.get("Idempotency-Key"));
  return prisma.$transaction(async tx => {
    // Parameterized SQL and deterministic locks serialize a customer's request cap and stock writes.
    await tx.$queryRawUnsafe('SELECT id FROM "User" WHERE id = $1 FOR UPDATE', user.id);
    const active = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!active.isActive || !active.emailVerified || active.role === "ADMIN") throw new ApiError(403, "An active customer account with verified email is required.");
    if (!validContactPhone(active.phone)) throw new ApiError(400, "Add a valid contact phone number to your profile.");
    const existing = await tx.booking.findUnique({ where: { customerId_requestKey: { customerId: user.id, requestKey: key } }, include: bookingInclude });
    if (existing) {
      const snapshot = existing.policySnapshot as { quoteId?: string } | null;
      if (snapshot?.quoteId !== input.quoteId) throw new ApiError(409, "This request key was already used for another estimate.");
      return bookingRecord(existing);
    }
    const record = await tx.bookingQuote.findFirst({ where: { id: input.quoteId, userId: user.id, expiresAt: { gt: new Date() } } });
    if (!record) throw new ApiError(409, "Your estimate expired. Review a new estimate before requesting.");
    const reviewed = reviewedQuoteSchema.parse(record.payload);
    for (const id of reviewed.items.map(item => item.variantId).sort()) await tx.$queryRawUnsafe('SELECT id FROM "ProductVariant" WHERE id = $1 FOR UPDATE', id);
    const count = await tx.booking.count({ where: { customerId: user.id, status: "PENDING", OR: [{ requestExpiresAt: null, pickupAt: { gt: new Date() } }, { requestExpiresAt: { gt: new Date() } }] } });
    if (count >= 3) throw new ApiError(409, "You already have three pending requests. Wait for a decision or cancel one.");
    const current = await quoteSelection(tx, user.id, { items: reviewed.items, pickupAt: reviewed.pickupAt, returnAt: reviewed.returnAt });
    if (current.payload.fingerprint !== reviewed.fingerprint) throw new ApiError(409, "Prices, item details, or shop terms changed. Review a new estimate.");
    const booking = await tx.booking.create({ data: {
      customerId: user.id, boutiqueId: reviewed.boutiqueId, pickupAt: new Date(reviewed.pickupAt), returnAt: new Date(reviewed.returnAt),
      requestExpiresAt: new Date(Date.now() + 12 * 3600000), turnaroundMinutes: 1440, requestKey: key,
      rentalMinor: BigInt(reviewed.rentalMinor), depositMinor: BigInt(0),
      policySnapshot: { boutique: current.boutique, collectionInstructions: reviewed.collectionInstructions, cancellationPolicy: reviewed.cancellationPolicy, returnPolicy: reviewed.returnPolicy, quoteId: record.id, policy: reviewed.policy, openingHours: reviewed.openingHours, items: current.lines },
      items: { create: current.lines.map(line => ({ variantId: line.variantId, quantity: line.quantity, productNameSnap: line.name, sizeSnapshot: line.size, categorySnapshot: line.category, rentalMinor: BigInt(line.rentalMinor), depositMinor: BigInt(0) })) },
      events: { create: { actorId: user.id, action: "CREATED", toStatus: "PENDING" } },
    }, include: bookingInclude });
    await tx.basketItem.deleteMany({ where: { userId: user.id, variantId: { in: reviewed.items.map(item => item.variantId) } } });
    await notifyBooking(tx, booking, "REQUESTED", "Reservation requested", "Your request awaits boutique confirmation. It expires in 12 hours.");
    return bookingRecord(booking);
  }, { isolationLevel: "Serializable", timeout: 15000 }).catch(async (error: unknown) => {
    if (typeof error === "object" && error && "code" in error && ["P2034", "P2002"].includes(String(error.code))) {
      const existing = await prisma.booking.findUnique({ where: { customerId_requestKey: { customerId: user.id, requestKey: key } }, include: bookingInclude });
      if (existing && (existing.policySnapshot as { quoteId?: string } | null)?.quoteId === input.quoteId) return bookingRecord(existing);
    }
    throw error;
  });
}

export async function basket(request: Request) {
  const user = await currentUser("CUSTOMER");
  if (request.method === "GET") {
    const items = await prisma.basketItem.findMany({ where: { userId: user.id }, include: { variant: { include: { product: { include: { boutique: true, images: { orderBy: { position: "asc" }, take: 1 } } } } } }, orderBy: { createdAt: "asc" } });
    return items.map(item => ({ id: item.id, variantId: item.variantId, quantity: item.quantity, size: item.variant.size, name: item.variant.product.name,
      productId: item.variant.productId, boutiqueId: item.variant.product.boutiqueId, boutiqueName: item.variant.product.boutique.name,
      image: item.variant.product.images[0]?.secureUrl ?? "", rentalPriceMinor: Number(item.variant.rentalPriceMinor ?? item.variant.product.rentalPriceMinor), rentalPriceUnit: item.variant.product.rentalPriceUnit,
      unavailable: item.variant.archived || item.variant.product.archived || item.variant.product.boutique.status !== "APPROVED" }));
  }
  const input = z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(10).optional() }).strict().parse(await request.json());
  if (request.method === "DELETE") { await prisma.basketItem.deleteMany({ where: { userId: user.id, variantId: input.variantId } }); return { removed: true }; }
  return prisma.$transaction(async tx => {
    await tx.$queryRawUnsafe('SELECT id FROM "User" WHERE id = $1 FOR UPDATE', user.id);
    const variant = await tx.productVariant.findFirst({ where: { id: input.variantId, archived: false, product: publicProductWhere }, include: { product: { select: { boutiqueId: true, boutique: { select: { ownerId: true } } } } } });
    if (!variant || variant.product.boutique.ownerId === user.id) throw new ApiError(400, "Choose an available item from another boutique.");
    const existing = await tx.basketItem.findMany({ where: { userId: user.id }, include: { variant: { select: { product: { select: { boutiqueId: true } } } } } });
    if (existing.some(item => item.variant.product.boutiqueId !== variant.product.boutiqueId)) throw new ApiError(409, "Your basket already contains another boutique. Remove those items before switching shops.");
    if (existing.length >= 10 && !existing.some(item => item.variantId === input.variantId)) throw new ApiError(400, "A basket can contain up to ten sizes.");
    const quantity = input.quantity ?? 1;
    if (quantity > variant.quantity) throw new ApiError(409, "The requested quantity exceeds total stock.");
    return tx.basketItem.upsert({ where: { userId_variantId: { userId: user.id, variantId: variant.id } }, create: { userId: user.id, variantId: variant.id, quantity }, update: { quantity } });
  });
}
