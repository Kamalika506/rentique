import { requestExpired } from "./expiry";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, currentUser, ownedBoutique } from "@/lib/api";
import { bookingInclude, bookingRecord, catalogProduct, categoryMap, managementProduct, productInclude } from "./records";
import { rentalDays } from "./rules";
import { productInputSchema } from "../boutiques/inventory/schema";
import { lifecycleCommandSchema } from "../boutiques/booking-management/lifecycle";
import type { Prisma } from "@/generated/prisma/client";
import { reservedUnits } from "./availability";
import { resolveCategory } from "@/features/admin/categories";
import { notifyBooking } from "@/features/notifications/server";
import { validateReturnItems } from "./customer-contracts";
import { peakReserved, reservationWindows } from "./stock";
export { createReviewedBooking as createBooking } from "./customer-server";

export async function catalog(request: Request) {
  const params = new URL(request.url).searchParams, id = params.get("id");
  const conditions: Prisma.ProductWhereInput[] = [{ archived: false, boutique: { status: "APPROVED", owner: { isActive: true } }, OR: [{ categoryId: null }, { catalogCategory: { isActive: true } }] }];
  if (id) conditions.push({ id });
  if (params.get("boutiqueId")) conditions.push({ boutiqueId: params.get("boutiqueId")! });
  if (params.get("city")?.trim()) conditions.push({ boutique: { city: { equals: params.get("city")!.trim(), mode: "insensitive" } } });
  if (params.get("garmentType")) {
    const garment = z.enum(["saree", "lehenga", "gown", "suit", "dress", "jewellery", "accessory", "other"]).parse(params.get("garmentType"));
    conditions.push({ OR: [{ garmentType: garment }, { garmentType: "other", name: { contains: garment, mode: "insensitive" } }] });
  }
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
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) throw new ApiError(400, "Minimum price must not exceed maximum price.");
  if (minPrice !== undefined || maxPrice !== undefined) conditions.push({ variants: { some: { archived: false, ...(params.get("size") ? { size: { equals: params.get("size")!, mode: "insensitive" as const } } : {}), OR: [{ rentalPriceMinor: { gte: minPrice, lte: maxPrice } }, { rentalPriceMinor: null, product: { rentalPriceMinor: { gte: minPrice, lte: maxPrice } } }] } } });
  const where: Prisma.ProductWhereInput = { AND: conditions };
  const sort = params.get("sort"), orderBy: Prisma.ProductOrderByWithRelationInput[] = sort === "price-low" ? [{ rentalPriceMinor: "asc" }, { id: "asc" }] : sort === "price-high" ? [{ rentalPriceMinor: "desc" }, { id: "asc" }] : sort === "name" ? [{ name: "asc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "asc" }];
  if (!id && (params.has("pickupAt") || params.has("returnAt"))) {
    const dates = z.object({ pickupAt: z.string().datetime({ offset: true }), returnAt: z.string().datetime({ offset: true }) }).parse({ pickupAt: params.get("pickupAt"), returnAt: params.get("returnAt") });
    const start = new Date(dates.pickupAt), end = new Date(dates.returnAt);
    try { rentalDays(start, end); } catch (error) { throw new ApiError(400, (error as Error).message); }
    const products = await prisma.product.findMany({ where, orderBy, take: 2001, include: { ...productInclude, variants: { ...productInclude.variants, include: { bookingItems: { select: { quantity: true, booking: { select: { pickupAt: true, returnAt: true, status: true, requestExpiresAt: true, turnaroundMinutes: true, stockReadyAt: true } } } } } } } });
    if (products.length > 2000) throw new ApiError(400, "Narrow your search before filtering availability.");
    const size = params.get("size")?.toLowerCase();
    const matching = products.flatMap(product => {
      const variants = product.variants.filter(variant => {
        const price = variant.rentalPriceMinor ?? product.rentalPriceMinor;
        return (!size || variant.size.toLowerCase() === size) && (minPrice === undefined || price >= minPrice) && (maxPrice === undefined || price <= maxPrice)
          && variant.quantity > peakReserved(reservationWindows(variant.bookingItems), start, new Date(end.getTime() + 86400000));
      });
      return variants.length ? [catalogProduct({ ...product, variants })] : [];
    });
    const page = z.coerce.number().int().min(1).max(100000).parse(params.get("page") ?? 1), pageSize = z.coerce.number().int().min(1).max(50).parse(params.get("pageSize") ?? 12);
    if (!params.has("page") && params.get("paged") !== "1") return matching;
    return { items: matching.slice((page - 1) * pageSize, page * pageSize), total: matching.length, page, pageSize, totalPages: Math.ceil(matching.length / pageSize), facets: { occasions: [...new Set(matching.flatMap(product => product.occasionTags))].sort(), colours: [...new Set(matching.flatMap(product => product.colours))].sort(), sizes: [...new Set(matching.flatMap(product => product.variants.map(variant => variant.size)))].sort() } };
  }
  if (id) { const product = await prisma.product.findFirst({ where, include: productInclude }); if (!product) throw new ApiError(404, "Product unavailable."); return catalogProduct(product); }
  if (!params.has("page") && params.get("paged") !== "1") return (await prisma.product.findMany({ where, include: productInclude, orderBy, take: 1000 })).map(catalogProduct);
  const page = z.coerce.number().int().min(1).max(100000).parse(params.get("page") ?? 1), pageSize = z.coerce.number().int().min(1).max(50).parse(params.get("pageSize") ?? 12);
  const [products, total, tokens] = await Promise.all([
    prisma.product.findMany({ where, include: productInclude, orderBy, skip: (page - 1) * pageSize, take: pageSize }), prisma.product.count({ where }),
    prisma.product.findMany({ where: conditions[0], select: { colours: true, occasionTags: true, variants: { where: { archived: false }, select: { size: true } } }, take: 2000 }),
  ]);
  return { items: products.map(catalogProduct), total, page, pageSize, totalPages: Math.ceil(total / pageSize), facets: { occasions: [...new Set(tokens.flatMap(p => p.occasionTags))].sort(), colours: [...new Set(tokens.flatMap(p => p.colours))].sort(), sizes: [...new Set(tokens.flatMap(p => p.variants.map(v => v.size)))].sort() } };
}
export async function customerBookings() {
  const user = await currentUser("CUSTOMER");
  return (await prisma.booking.findMany({ where: { customerId: user.id }, include: bookingInclude, orderBy: { createdAt: "desc" } })).map(bookingRecord);
}
export async function cancelCustomerBooking(request: Request) {
  const user = await currentUser("CUSTOMER");
  const input = z.object({ id: z.string(), version: z.number().int().positive(), reason: z.string().trim().min(3).max(500) }).strict().parse(await request.json());
  return prisma.$transaction(async tx => {
    const changed = await tx.booking.updateMany({ where: { id: input.id, customerId: user.id, version: input.version, status: { in: ["PENDING", "CONFIRMED"] } }, data: { status: "CANCELLED", cancellationReason: input.reason, version: { increment: 1 } } });
    if (!changed.count) throw new ApiError(409, "Booking unavailable or no longer cancellable. Refresh your rentals.");
    await tx.bookingEvent.create({ data: { bookingId: input.id, actorId: user.id, action: "CANCELLED", toStatus: "CANCELLED", details: { reason: input.reason } } });
    const updated = await tx.booking.findUniqueOrThrow({ where: { id: input.id }, include: bookingInclude });
    await notifyBooking(tx, updated, "CANCELLED", "Reservation cancelled", input.reason);
    return bookingRecord(updated);
  });
}
export async function boutiqueBookings(request: Request) {
  const { boutique } = await ownedBoutique();
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  if (id) {
    const booking = await prisma.booking.findFirst({ where: { id, boutiqueId: boutique.id }, include: bookingInclude });
    if (!booking) throw new ApiError(404, "Booking unavailable.");
    return bookingRecord(booking);
  }
  const now = new Date(), until = new Date(now.getTime() + 7 * 86400000);
  const page = z.coerce.number().int().min(1).max(100000).parse(params.get("page") ?? 1), pageSize = 20;
  const search = z.string().max(200).parse(params.get("search") ?? "").trim();
  const status = z.enum(["PENDING", "CONFIRMED", "PICKED_UP", "RETURNED", "COMPLETED", "CANCELLED", "REJECTED", "EXPIRED"]).optional().parse(params.get("status") || undefined);
  const activeRequest: Prisma.BookingWhereInput = { status: "PENDING", OR: [{ requestExpiresAt: { gt: now } }, { requestExpiresAt: null, pickupAt: { gt: now } }] };
  const expiredRequest: Prisma.BookingWhereInput = { OR: [{ status: "EXPIRED" }, { status: "PENDING", OR: [{ requestExpiresAt: { lte: now } }, { requestExpiresAt: null, pickupAt: { lte: now } }] }] };
  const where: Prisma.BookingWhereInput = { boutiqueId: boutique.id, AND: [
    ...(status ? [status === "PENDING" ? activeRequest : status === "EXPIRED" ? expiredRequest : { status }] : []),
    ...(search ? [{ OR: [{ id: { contains: search, mode: "insensitive" as const } }, { customer: { name: { contains: search, mode: "insensitive" as const } } }, { customer: { email: { contains: search, mode: "insensitive" as const } } }, { items: { some: { productNameSnap: { contains: search, mode: "insensitive" as const } } } }] }] : []),
  ] };
  const [total, rows, pickups, returns] = await prisma.$transaction([
    prisma.booking.count({ where }),
    prisma.booking.findMany({ where, include: bookingInclude, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.booking.findMany({ where: { boutiqueId: boutique.id, status: "CONFIRMED", pickupAt: { gte: now, lt: until } }, include: bookingInclude, orderBy: [{ pickupAt: "asc" }, { id: "asc" }], take: 20 }),
    prisma.booking.findMany({ where: { boutiqueId: boutique.id, status: { in: ["CONFIRMED", "PICKED_UP"] }, returnAt: { gte: now, lt: until } }, include: bookingInclude, orderBy: [{ returnAt: "asc" }, { id: "asc" }], take: 20 }),
  ], { isolationLevel: "RepeatableRead" });
  return { items: rows.map(bookingRecord), page, pageSize, total, totalPages: Math.ceil(total / pageSize), upcomingPickups: pickups.map(bookingRecord), upcomingReturns: returns.map(bookingRecord) };
}
export async function updateBooking(request: Request) {
  const { user, boutique } = await ownedBoutique();
  const input = z.object({ id: z.string(), version: z.number().int().positive(), command: lifecycleCommandSchema }).parse(await request.json());
  return prisma.$transaction(async tx => {
    const booking = await tx.booking.findFirst({ where: { id: input.id, boutiqueId: boutique.id }, include: bookingInclude });
    if (!booking) throw new ApiError(404, "Booking unavailable.");
    const command = input.command;
    if (booking.version !== input.version || !bookingRecord(booking).allowedActions.some(action => action === command.action)) throw new ApiError(409, "The booking changed or this action is no longer allowed. Reload it.");
    if (command.action === "CONFIRM" && requestExpired(booking)) throw new ApiError(409, "This reservation request has expired.");
    const data: Prisma.BookingUpdateManyMutationInput = { version: { increment: 1 } };
    const now = new Date();
    if (command.action === "PICK_UP") {
      if (now < booking.pickupAt || now >= booking.returnAt) throw new ApiError(409, "Record collection during the agreed rental interval.");
      for (const item of [...booking.items].sort((a, b) => a.variantId.localeCompare(b.variantId))) {
        await tx.$queryRawUnsafe('SELECT id FROM "ProductVariant" WHERE id = $1 FOR UPDATE', item.variantId);
        const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: item.variantId } });
        if (item.quantity + await reservedUnits(tx, item.variantId, now, new Date(booking.returnAt.getTime() + booking.turnaroundMinutes * 60000), booking.id) > variant.quantity) throw new ApiError(409, "Stock is still with another customer or awaiting cleaning. Resolve this before collection.");
      }
    }
    const transitions = { CONFIRM: "CONFIRMED", REJECT: "REJECTED", CANCEL: "CANCELLED", PICK_UP: "PICKED_UP", RETURN: "RETURNED", COMPLETE: "COMPLETED" } as const;
    if (command.action in transitions) data.status = transitions[command.action as keyof typeof transitions];
    if (command.action === "REJECT") data.rejectionReason = command.reason;
    if (command.action === "CANCEL") data.cancellationReason = command.reason;
    if (command.action === "PICK_UP") data.pickedUpAt = now;
    if (command.action === "RETURN") {
      const returns = command.items ?? booking.items.filter(item => item.returnedQuantity < item.quantity).map(item => ({ itemId: item.id, quantity: item.quantity - item.returnedQuantity }));
      try { validateReturnItems(booking.items, returns); } catch (error) { throw new ApiError(400, (error as Error).message); }
      for (const item of returns) await tx.bookingItem.update({ where: { id: item.itemId }, data: { returnedQuantity: { increment: item.quantity } } });
      const remaining = await tx.bookingItem.findMany({ where: { bookingId: booking.id }, select: { quantity: true, returnedQuantity: true } });
      if (remaining.every(item => item.returnedQuantity === item.quantity)) data.returnedAt = now;
      else data.status = "PICKED_UP";
    }
    if (command.action === "MARK_READY") {
      if (!booking.returnedAt || now.getTime() < booking.returnedAt.getTime() + booking.turnaroundMinutes * 60000) throw new ApiError(409, "The 24-hour cleaning buffer has not finished.");
      data.stockReadyAt = now;
    }
    if (command.action === "COMPLETE") data.completedAt = now;
    const changed = await tx.booking.updateMany({ where: { id: booking.id, boutiqueId: boutique.id, version: input.version }, data });
    if (!changed.count) throw new ApiError(409, "The booking changed. Reload it.");
    if (command.action === "RECORD_INSPECTION") {
      const photos = command.photos ?? booking.inspection?.photos ?? [];
      const cloud = process.env.CLOUDINARY_CLOUD_NAME;
      if (photos.some(photo => {
        const url = new URL(photo);
        return !cloud || url.origin !== "https://res.cloudinary.com" || !url.pathname.startsWith(`/${cloud}/image/upload/`) || !url.pathname.includes(`/rentique/${boutique.id}/`);
      })) throw new ApiError(400, "Use photos uploaded by this boutique.");
      const record = { condition: command.condition, photos, notes: command.notes, recordedById: user.id, recordedAt: now };
      await tx.bookingInspection.upsert({ where: { bookingId: booking.id }, create: { bookingId: booking.id, ...record }, update: record });
    }
    if (command.action === "RECORD_REFUND") {
      const record = { status: command.status, notes: command.notes, recordedById: user.id, recordedAt: now };
      await tx.manualRefundRecord.upsert({ where: { bookingId: booking.id }, create: { bookingId: booking.id, ...record }, update: record });
    }
    const action = command.action === "RECORD_INSPECTION" ? "INSPECTION_RECORDED" : command.action === "RECORD_REFUND" ? "REFUND_UPDATED" : command.action === "MARK_READY" ? "NOTE_ADDED" : transitions[command.action];
    await tx.bookingEvent.create({ data: { bookingId: booking.id, actorId: user.id, action, fromStatus: booking.status, toStatus: typeof data.status === "string" ? data.status : booking.status, details: command } });
    const updated = await tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: bookingInclude });
    if (command.action !== "MARK_READY") await notifyBooking(tx, updated, String(action), "Reservation update", "Your reservation is now " + (updated.status === "PICKED_UP" && updated.items.some(item => item.returnedQuantity > 0) ? "partially returned" : updated.status.toLowerCase().replaceAll("_", " ")) + ".");
    return bookingRecord(updated);
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
  const fields = { name: input.name, description: input.description, category: category.legacyKey ?? "OTHER" as const, categoryId: category.id, rentalPriceUnit: input.rentalPriceUnit ?? "PER_DAY" as const, occasionTags: input.occasionTags, colours: input.colours, fabricStyle: input.fabricStyle, garmentType: input.garmentType, includedPieces: input.includedPieces, rentalPriceMinor: BigInt(input.rentalPriceMinor), depositMinor: BigInt(0) };
  if (request.method === "POST") return managementProduct(await prisma.product.create({ data: { ...fields, boutiqueId: boutique.id, variants: { create: { size: input.size, quantity: input.quantity, measurements: input.measurements } }, images: { create: images } }, include: productInclude }));
  const { id, version } = z.object({ id: z.string(), version: z.number().int().positive() }).parse(body);
  return prisma.$transaction(async tx => {
    const product = await tx.product.findFirst({ where: { id, boutiqueId: boutique.id }, include: productInclude });
    if (!product) throw new ApiError(404, "Product unavailable.");
    const variant = product.variants[0];
    if (product.variants.length > 1) throw new ApiError(409, "This editor supports one size per listing. Multi-size products need a variant editor.");
    if (variant && variant.size !== input.size && await tx.bookingItem.count({ where: { variantId: variant.id } })) throw new ApiError(409, "A booked size cannot be renamed. Create a new listing for another size.");
    if (variant && input.quantity < await reservedUnits(tx, variant.id, new Date(), new Date(8640000000000000))) throw new ApiError(409, "This stock is committed to rentals. Resolve those bookings before reducing quantity.");
    const changed = await tx.product.updateMany({ where: { id, boutiqueId: boutique.id, version }, data: { ...fields, version: { increment: 1 } } });
    if (!changed.count) throw new ApiError(409, "Product changed. Reload before saving.");
    if (variant) await tx.productVariant.update({ where: { id: variant.id }, data: { size: input.size, quantity: input.quantity, measurements: input.measurements, version: { increment: 1 } } });
    else await tx.productVariant.create({ data: { productId: id, size: input.size, quantity: input.quantity, measurements: input.measurements } });
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
