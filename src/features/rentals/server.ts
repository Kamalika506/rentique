import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, currentUser, ownedBoutique } from "@/lib/api";
import { bookingInclude, bookingRecord, catalogProduct, categoryMap, managementProduct, productInclude } from "./records";
import { allowedActions, lineAmounts, rentalDays, reservingStatuses } from "./rules";
import { productInputSchema } from "../boutiques/inventory/schema";
import { lifecycleCommandSchema } from "../boutiques/booking-management/lifecycle";
import type { Prisma } from "@/generated/prisma/client";

export async function catalog(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const products = await prisma.product.findMany({ where: { ...(id ? { id } : {}), archived: false, boutique: { status: "APPROVED", owner: { isActive: true } } }, include: productInclude, orderBy: { createdAt: "desc" } });
  if (id && !products.length) throw new ApiError(404, "Product unavailable.");
  return id ? catalogProduct(products[0]) : products.map(catalogProduct);
}
const bookingSchema = z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(100), pickupAt: z.string().datetime({ offset: true }), returnAt: z.string().datetime({ offset: true }) });
export async function createBooking(request: Request) {
  const user = await currentUser("CUSTOMER");
  const input = bookingSchema.parse(await request.json());
  const pickupAt = new Date(input.pickupAt), returnAt = new Date(input.returnAt);
  let days: number;
  try { days = rentalDays(pickupAt, returnAt); } catch (error) { throw new ApiError(400, (error as Error).message); }
  return prisma.$transaction(async tx => {
    const variant = await tx.productVariant.findFirst({ where: { id: input.variantId, archived: false, product: { archived: false, boutique: { status: "APPROVED", owner: { isActive: true } } } }, include: { product: true } });
    if (!variant) throw new ApiError(404, "Product or size unavailable.");
    // Serializability protects simultaneous requests for the final unit.
    const reserved = await tx.bookingItem.aggregate({ where: { variantId: variant.id, booking: { status: { in: reservingStatuses }, pickupAt: { lt: returnAt }, returnAt: { gt: pickupAt } } }, _sum: { quantity: true } });
    if (input.quantity + (reserved._sum.quantity ?? 0) > variant.quantity) throw new ApiError(409, "This size is unavailable for the selected dates. Choose different dates or a smaller quantity.");
    const amounts = lineAmounts(variant.rentalPriceMinor ?? variant.product.rentalPriceMinor, variant.depositMinor ?? variant.product.depositMinor, variant.product.rentalPriceUnit, days, input.quantity);
    const booking = await tx.booking.create({ data: { customerId: user.id, boutiqueId: variant.product.boutiqueId, pickupAt, returnAt, ...amounts,
      items: { create: { variantId: variant.id, quantity: input.quantity, productNameSnap: variant.product.name, sizeSnapshot: variant.size, categorySnapshot: variant.product.category, ...amounts } },
      events: { create: { actorId: user.id, action: "CREATED", toStatus: "PENDING" } } }, include: bookingInclude });
    return bookingRecord(booking);
  }, { isolationLevel: "Serializable" });
}
export async function customerBookings() {
  const user = await currentUser("CUSTOMER");
  return (await prisma.booking.findMany({ where: { customerId: user.id }, include: bookingInclude, orderBy: { createdAt: "desc" } })).map(bookingRecord);
}
export async function cancelCustomerBooking(request: Request) {
  const user = await currentUser("CUSTOMER");
  const input = z.object({ id: z.string(), version: z.number().int().positive(), reason: z.string().trim().min(3).max(500) }).parse(await request.json());
  return prisma.$transaction(async tx => {
    const changed = await tx.booking.updateMany({ where: { id: input.id, customerId: user.id, version: input.version, status: { in: ["PENDING", "CONFIRMED"] } }, data: { status: "CANCELLED", cancellationReason: input.reason, version: { increment: 1 } } });
    if (!changed.count) throw new ApiError(409, "Booking unavailable or no longer cancellable. Refresh your rentals.");
    await tx.bookingEvent.create({ data: { bookingId: input.id, actorId: user.id, action: "CANCELLED", toStatus: "CANCELLED", details: { reason: input.reason } } });
    return bookingRecord(await tx.booking.findUniqueOrThrow({ where: { id: input.id }, include: bookingInclude }));
  });
}
export async function boutiqueBookings(request: Request) {
  const { boutique } = await ownedBoutique();
  const params = new URL(request.url).searchParams;
  const bookings = (await prisma.booking.findMany({ where: { boutiqueId: boutique.id }, include: bookingInclude, orderBy: { createdAt: "desc" } })).map(bookingRecord);
  const id = params.get("id");
  if (id) { const booking = bookings.find(b => b.id === id); if (!booking) throw new ApiError(404, "Booking unavailable."); return booking; }
  const now = Date.now(), until = now + 7 * 86400000;
  const inWindow = (value: string) => Date.parse(value) >= now && Date.parse(value) < until;
  const search = (params.get("search") ?? "").toLowerCase(), status = params.get("status");
  return { items: bookings.filter(b => (!status || b.status === status) && `${b.id} ${b.customer.name} ${b.customer.email} ${b.products.map(p => p.name).join(" ")}`.toLowerCase().includes(search)),
    upcomingPickups: bookings.filter(b => b.status === "CONFIRMED" && inWindow(b.pickupAt)), upcomingReturns: bookings.filter(b => ["CONFIRMED", "PICKED_UP"].includes(b.status) && inWindow(b.returnAt)) };
}
export async function updateBooking(request: Request) {
  const { user, boutique } = await ownedBoutique();
  const input = z.object({ id: z.string(), version: z.number().int().positive(), command: lifecycleCommandSchema }).parse(await request.json());
  return prisma.$transaction(async tx => {
    const booking = await tx.booking.findFirst({ where: { id: input.id, boutiqueId: boutique.id }, include: bookingInclude });
    if (!booking) throw new ApiError(404, "Booking unavailable.");
    const command = input.command;
    if (booking.version !== input.version || !allowedActions(booking.status, Boolean(booking.inspection)).includes(command.action)) throw new ApiError(409, "The booking changed or this action is no longer allowed. Reload it.");
    const data: Prisma.BookingUpdateManyMutationInput = { version: { increment: 1 } };
    const now = new Date();
    const transitions = { CONFIRM: "CONFIRMED", REJECT: "REJECTED", CANCEL: "CANCELLED", PICK_UP: "PICKED_UP", RETURN: "RETURNED", COMPLETE: "COMPLETED" } as const;
    if (command.action in transitions) data.status = transitions[command.action as keyof typeof transitions];
    if (command.action === "REJECT") data.rejectionReason = command.reason;
    if (command.action === "CANCEL") data.cancellationReason = command.reason;
    if (command.action === "PICK_UP") data.pickedUpAt = now;
    if (command.action === "RETURN") data.returnedAt = now;
    if (command.action === "COMPLETE") data.completedAt = now;
    const changed = await tx.booking.updateMany({ where: { id: booking.id, boutiqueId: boutique.id, version: input.version }, data });
    if (!changed.count) throw new ApiError(409, "The booking changed. Reload it.");
    if (command.action === "RECORD_INSPECTION") {
      const record = { condition: command.condition, notes: command.notes, recordedById: user.id, recordedAt: now };
      await tx.bookingInspection.upsert({ where: { bookingId: booking.id }, create: { bookingId: booking.id, ...record }, update: record });
    }
    if (command.action === "RECORD_REFUND") {
      const record = { status: command.status, notes: command.notes, recordedById: user.id, recordedAt: now };
      await tx.manualRefundRecord.upsert({ where: { bookingId: booking.id }, create: { bookingId: booking.id, ...record }, update: record });
    }
    const action = command.action === "RECORD_INSPECTION" ? "INSPECTION_RECORDED" : command.action === "RECORD_REFUND" ? "REFUND_UPDATED" : transitions[command.action];
    await tx.bookingEvent.create({ data: { bookingId: booking.id, actorId: user.id, action, fromStatus: booking.status, toStatus: typeof data.status === "string" ? data.status : booking.status, details: command } });
    return bookingRecord(await tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: bookingInclude }));
  });
}
export async function boutiqueProducts(request: Request) {
  const { boutique } = await ownedBoutique();
  const id = new URL(request.url).searchParams.get("id");
  const products = await prisma.product.findMany({ where: { boutiqueId: boutique.id, ...(id ? { id } : {}) }, include: productInclude, orderBy: { createdAt: "desc" } });
  if (id && !products.length) throw new ApiError(404, "Product unavailable.");
  return id ? managementProduct(products[0]) : products.map(managementProduct);
}
export async function saveProduct(request: Request) {
  const { boutique } = await ownedBoutique();
  const body = z.object({ input: productInputSchema, id: z.string().optional(), version: z.number().int().positive().optional() }).parse(await request.json());
  const input = body.input;
  if (input.images.some(image => image.source !== "cloudinary" || !image.publicId.startsWith(`rentique/${boutique.id}/`) || !image.secureUrl.startsWith(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`))) throw new ApiError(400, "Use images uploaded by your boutique.");
  const images = input.images.map((image, position) => { if (image.source !== "cloudinary") throw new ApiError(400, "Invalid image."); return { publicId: image.publicId, secureUrl: image.secureUrl, alt: image.alt, position }; });
  const fields = { name: input.name, description: input.description, category: categoryMap[input.category], occasionTags: input.occasionTags, colours: input.colours, fabricStyle: input.fabricStyle, rentalPriceMinor: BigInt(input.rentalPriceMinor), depositMinor: BigInt(input.depositMinor) };
  if (request.method === "POST") return managementProduct(await prisma.product.create({ data: { ...fields, boutiqueId: boutique.id, variants: { create: { size: input.size, quantity: input.quantity } }, images: { create: images } }, include: productInclude }));
  const { id, version } = z.object({ id: z.string(), version: z.number().int().positive() }).parse(body);
  return prisma.$transaction(async tx => {
    const product = await tx.product.findFirst({ where: { id, boutiqueId: boutique.id }, include: productInclude });
    if (!product) throw new ApiError(404, "Product unavailable.");
    const variant = product.variants[0];
    if (product.variants.length > 1) throw new ApiError(409, "This editor supports one size per listing. Multi-size products need a variant editor.");
    if (variant && variant.size !== input.size && await tx.bookingItem.count({ where: { variantId: variant.id } })) throw new ApiError(409, "A booked size cannot be renamed. Create a new listing for another size.");
    const changed = await tx.product.updateMany({ where: { id, boutiqueId: boutique.id, version }, data: { ...fields, version: { increment: 1 } } });
    if (!changed.count) throw new ApiError(409, "Product changed. Reload before saving.");
    if (variant) await tx.productVariant.update({ where: { id: variant.id }, data: { size: input.size, quantity: input.quantity, version: { increment: 1 } } });
    else await tx.productVariant.create({ data: { productId: id, size: input.size, quantity: input.quantity } });
    await tx.productImage.deleteMany({ where: { productId: id } });
    await tx.productImage.createMany({ data: images.map(image => ({ ...image, productId: id })) });
    return managementProduct(await tx.product.findUniqueOrThrow({ where: { id }, include: productInclude }));
  }, { isolationLevel: "Serializable" });
}
export async function archiveProduct(request: Request) {
  const { boutique } = await ownedBoutique();
  const input = z.object({ id: z.string(), version: z.number().int().positive(), archived: z.boolean() }).parse(await request.json());
  const changed = await prisma.product.updateMany({ where: { id: input.id, boutiqueId: boutique.id, version: input.version }, data: { archived: input.archived, version: { increment: 1 } } });
  if (!changed.count) throw new ApiError(409, "Product unavailable or changed. Reload inventory.");
  return managementProduct(await prisma.product.findFirstOrThrow({ where: { id: input.id, boutiqueId: boutique.id }, include: productInclude }));
}
