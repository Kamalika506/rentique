import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, currentUser, ownedBoutique } from "@/lib/api";
import { bookingInclude, bookingRecord, catalogProduct, categoryMap, managementProduct, productInclude } from "./records";
import { allowedActions, lineAmounts, rentalDays } from "./rules";
import { productInputSchema } from "../boutiques/inventory/schema";
import { lifecycleCommandSchema } from "../boutiques/booking-management/lifecycle";
import type { Prisma } from "@/generated/prisma/client";
import { reservedUnits } from "./availability";
import { resolveCategory } from "@/features/admin/categories";

export async function catalog(request: Request) {
  const params = new URL(request.url).searchParams, id = params.get("id");
  const conditions: Prisma.ProductWhereInput[] = [{ archived: false, boutique: { status: "APPROVED", owner: { isActive: true } }, OR: [{ categoryId: null }, { catalogCategory: { isActive: true } }] }];
  if (id) conditions.push({ id });
  if (params.get("boutiqueId")) conditions.push({ boutiqueId: params.get("boutiqueId")! });
  const search = params.get("search")?.trim().slice(0, 120);
  if (search) conditions.push({ OR: [{ name: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }, { boutique: { name: { contains: search, mode: "insensitive" } } }] });
  const category = params.get("category");
  if (category) {
    const match = await prisma.category.findFirst({ where: { isActive: true, OR: [{ id: category }, { slug: category }, { name: { equals: category, mode: "insensitive" } }] } });
    const legacy = Object.entries(categoryMap).find(([label, key]) => label.toLowerCase() === category.toLowerCase() || key === category)?.[1];
    conditions.push(match ? { OR: [{ categoryId: match.id }, ...(match.legacyKey ? [{ categoryId: null, category: match.legacyKey }] : [])] } : legacy ? { category: legacy, categoryId: null } : { id: "" });
  }
  for (const [param, field] of [["occasion", "occasionTags"], ["colour", "colours"]] as const) {
    const value = params.get(param)?.trim();
    if (value) {
      // PostgreSQL string arrays compare exactly; resolve case-insensitive UI input
      // to the actual stored token so existing mixed-case tags remain searchable.
      const rows = await prisma.product.findMany({ where: { AND: conditions }, select: { colours: true, occasionTags: true } });
      const tags = [...new Set(rows.flatMap(row => row[field].filter(tag => tag.toLowerCase() === value.toLowerCase())))];
      conditions.push({ [field]: { hasSome: tags } });
    }
  }
  if (params.get("size")) conditions.push({ variants: { some: { archived: false, size: { equals: params.get("size")!, mode: "insensitive" } } } });
  const money = (key: string) => params.has(key) ? BigInt(Math.round(z.coerce.number().finite().min(0).max(10000000).parse(params.get(key)) * 100)) : undefined;
  const minPrice = money("minPrice"), maxPrice = money("maxPrice");
  if (minPrice !== undefined || maxPrice !== undefined) conditions.push({ rentalPriceMinor: { gte: minPrice, lte: maxPrice } });
  const where: Prisma.ProductWhereInput = { AND: conditions };
  const sort = params.get("sort"), orderBy: Prisma.ProductOrderByWithRelationInput[] = sort === "price-low" ? [{ rentalPriceMinor: "asc" }, { id: "asc" }] : sort === "price-high" ? [{ rentalPriceMinor: "desc" }, { id: "asc" }] : sort === "name" ? [{ name: "asc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "asc" }];
  if (id) { const product = await prisma.product.findFirst({ where, include: productInclude }); if (!product) throw new ApiError(404, "Product unavailable."); return catalogProduct(product); }
  if (!params.has("page") && params.get("paged") !== "1") return (await prisma.product.findMany({ where, include: productInclude, orderBy, take: 1000 })).map(catalogProduct);
  const page = z.coerce.number().int().min(1).max(100000).parse(params.get("page") ?? 1), pageSize = z.coerce.number().int().min(1).max(50).parse(params.get("pageSize") ?? 12);
  const [products, total, tokens] = await Promise.all([
    prisma.product.findMany({ where, include: productInclude, orderBy, skip: (page - 1) * pageSize, take: pageSize }), prisma.product.count({ where }),
    prisma.product.findMany({ where: conditions[0], select: { colours: true, occasionTags: true, variants: { where: { archived: false }, select: { size: true } } }, take: 2000 }),
  ]);
  return { items: products.map(catalogProduct), total, page, pageSize, totalPages: Math.ceil(total / pageSize), facets: { occasions: [...new Set(tokens.flatMap(p => p.occasionTags))].sort(), colours: [...new Set(tokens.flatMap(p => p.colours))].sort(), sizes: [...new Set(tokens.flatMap(p => p.variants.map(v => v.size)))].sort() } };
}
const bookingSchema = z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(100), pickupAt: z.string().datetime({ offset: true }), returnAt: z.string().datetime({ offset: true }) });
export async function createBooking(request: Request) {
  const user = await currentUser("CUSTOMER");
  const input = bookingSchema.parse(await request.json());
  const pickupAt = new Date(input.pickupAt), returnAt = new Date(input.returnAt);
  let days: number;
  try { days = rentalDays(pickupAt, returnAt); } catch (error) { throw new ApiError(400, (error as Error).message); }
  return prisma.$transaction(async tx => {
    const variant = await tx.productVariant.findFirst({ where: { id: input.variantId, archived: false, product: { archived: false, boutique: { status: "APPROVED", owner: { isActive: true } }, OR: [{ categoryId: null }, { catalogCategory: { isActive: true } }] } }, include: { product: true } });
    if (!variant) throw new ApiError(404, "Product or size unavailable.");
    // Serializability protects simultaneous requests for the final unit.
    const reserved = await reservedUnits(tx, variant.id, pickupAt, returnAt);
    if (input.quantity + reserved > variant.quantity) throw new ApiError(409, "This size is unavailable for the selected dates. Choose different dates or a smaller quantity.");
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
  const category = await resolveCategory(input.category);
  if (input.images.some(image => image.source !== "cloudinary" || !image.publicId.startsWith(`rentique/${boutique.id}/`) || !image.secureUrl.startsWith(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`))) throw new ApiError(400, "Use images uploaded by your boutique.");
  const images = input.images.map((image, position) => { if (image.source !== "cloudinary") throw new ApiError(400, "Invalid image."); return { publicId: image.publicId, secureUrl: image.secureUrl, alt: image.alt, position }; });
  const fields = { name: input.name, description: input.description, category: category.legacyKey ?? "OTHER" as const, categoryId: category.id, rentalPriceUnit: input.rentalPriceUnit ?? "PER_DAY" as const, occasionTags: input.occasionTags, colours: input.colours, fabricStyle: input.fabricStyle, rentalPriceMinor: BigInt(input.rentalPriceMinor), depositMinor: BigInt(input.depositMinor) };
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
