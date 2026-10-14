import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, currentUser } from "@/lib/api";
import { ensureCategories } from "./categories";
import { notifyBoutiqueDecision } from "./notifications";
import type { Prisma } from "@/generated/prisma/client";

const id = z.string().min(1).max(100);
const querySchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), q: z.string().trim().max(120).default(""), status: z.string().trim().max(40).default("") });
function query(request: Request) { return querySchema.parse(Object.fromEntries(new URL(request.url).searchParams)); }
function paged<T>(items: T[], total: number, page: number, pageSize: number) { return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) }; }
function audit(tx: Prisma.TransactionClient, actorId: string, action: string, entityType: string, entityId: string, details: Prisma.InputJsonValue) {
  return tx.auditLog.create({ data: { actorId, action, entityType, entityId, details } });
}
const userSelect = { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true, updatedAt: true, boutique: { select: { id: true, name: true, status: true } }, _count: { select: { bookings: true } } } satisfies Prisma.UserSelect;

export async function users(request: Request) {
  const actor = await currentUser("ADMIN");
  if (request.method === "GET") {
    const { page, pageSize, q, status } = query(request);
    if (status && !["CUSTOMER", "BOUTIQUE_OWNER", "ADMIN", "ACTIVE", "INACTIVE"].includes(status)) throw new ApiError(400, "Invalid user filter.");
    const where: Prisma.UserWhereInput = { ...(status === "ACTIVE" || status === "INACTIVE" ? { isActive: status === "ACTIVE" } : status ? { role: status as "CUSTOMER" | "BOUTIQUE_OWNER" | "ADMIN" } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q, mode: "insensitive" } }] } : {}) };
    const [items, total] = await prisma.$transaction([prisma.user.findMany({ where, select: userSelect, skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }), prisma.user.count({ where })]);
    return paged(items, total, page, pageSize);
  }
  const input = z.object({ id, isActive: z.boolean(), reason: z.string().trim().min(3).max(1000) }).strict().parse(await request.json());
  if (input.id === actor.id && !input.isActive) throw new ApiError(400, "You cannot deactivate your own administrator account.");
  return prisma.$transaction(async tx => {
    const target = await tx.user.findUnique({ where: { id: input.id } });
    if (!target) throw new ApiError(404, "User not found.");
    if (!input.isActive && target.role === "ADMIN" && target.isActive && await tx.user.count({ where: { role: "ADMIN", isActive: true } }) <= 1) throw new ApiError(409, "The platform must retain an active administrator.");
    const user = await tx.user.update({ where: { id: target.id }, data: { isActive: input.isActive, ...(!input.isActive ? { sessionVersion: { increment: 1 } } : {}) }, select: userSelect });
    if (!input.isActive) await tx.session.deleteMany({ where: { userId: target.id } });
    await audit(tx, actor.id, input.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED", "User", target.id, { reason: input.reason });
    return user;
  }, { isolationLevel: "Serializable" });
}

const boutiqueInclude = { owner: { select: { id: true, name: true, email: true, isActive: true } }, _count: { select: { products: true, bookings: true } } } satisfies Prisma.BoutiqueInclude;
export async function boutiques(request: Request) {
  const actor = await currentUser("ADMIN");
  if (request.method === "GET") {
    const { page, pageSize, q, status } = query(request);
    if (status && !["PENDING", "APPROVED", "REJECTED"].includes(status)) throw new ApiError(400, "Invalid boutique status.");
    const where: Prisma.BoutiqueWhereInput = { ...(status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }, { contactEmail: { contains: q, mode: "insensitive" } }, { owner: { email: { contains: q, mode: "insensitive" } } }] } : {}) };
    const [items, total] = await prisma.$transaction([prisma.boutique.findMany({ where, include: boutiqueInclude, skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ submittedAt: "desc" }, { id: "desc" }] }), prisma.boutique.count({ where })]);
    return paged(items, total, page, pageSize);
  }
  const input = z.object({ id, status: z.enum(["PENDING", "APPROVED", "REJECTED"]), version: z.number().int().positive().optional(), reason: z.string().trim().max(1000).optional() }).strict().parse(await request.json());
  if (input.status !== "APPROVED" && (!input.reason || input.reason.length < 3)) throw new ApiError(400, "Provide a reason for this decision.");
  const boutique = await prisma.$transaction(async tx => {
    const record = await tx.boutique.findUnique({ where: { id: input.id }, include: { owner: { select: { isActive: true } } } });
    if (!record) throw new ApiError(404, "Boutique not found.");
    if (input.status === "APPROVED" && !record.owner.isActive) throw new ApiError(409, "Activate the owner's account before approving their boutique.");
    if (record.status === input.status) throw new ApiError(409, "The boutique already has this status.");
    const changed = await tx.boutique.updateMany({ where: { id: record.id, version: input.version ?? record.version }, data: { status: input.status, rejectionReason: input.status === "REJECTED" ? input.reason : null, reviewedAt: input.status === "PENDING" ? null : new Date(), reviewedById: input.status === "PENDING" ? null : actor.id, version: { increment: 1 } } });
    if (!changed.count) throw new ApiError(409, "Boutique changed. Refresh and try again.");
    await tx.boutiqueReviewEvent.create({ data: { boutiqueId: record.id, reviewerId: actor.id, action: input.status === "PENDING" ? "REOPENED" : input.status, reason: input.reason } });
    await audit(tx, actor.id, `BOUTIQUE_${input.status === "PENDING" ? "REOPENED" : input.status}`, "Boutique", record.id, { reason: input.reason ?? "", previousStatus: record.status });
    return tx.boutique.findUniqueOrThrow({ where: { id: record.id }, include: boutiqueInclude });
  }, { isolationLevel: "Serializable" });
  const notification = await notifyBoutiqueDecision(boutique);
  return { ...boutique, notification };
}

export async function products(request: Request) {
  const actor = await currentUser("ADMIN");
  if (request.method === "GET") {
    const { page, pageSize, q, status } = query(request);
    if (status && !["ACTIVE", "ARCHIVED"].includes(status)) throw new ApiError(400, "Invalid product status.");
    const where: Prisma.ProductWhereInput = { ...(status ? { archived: status === "ARCHIVED" } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { boutique: { name: { contains: q, mode: "insensitive" } } }] } : {}) };
    const [records, total] = await prisma.$transaction([prisma.product.findMany({ where, include: { boutique: { select: { id: true, name: true, status: true } }, catalogCategory: { select: { name: true } }, variants: { where: { archived: false }, select: { quantity: true, size: true } }, images: { take: 1, orderBy: { position: "asc" } } }, skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }), prisma.product.count({ where })]);
    const items = records.map(product => ({ ...product, rentalPriceMinor: Number(product.rentalPriceMinor), depositMinor: Number(product.depositMinor), categoryName: product.catalogCategory?.name ?? product.category.replaceAll("_", " "), stock: product.variants.reduce((sum, variant) => sum + variant.quantity, 0) }));
    return paged(items, total, page, pageSize);
  }
  const input = z.object({ id, archived: z.boolean(), version: z.number().int().positive(), reason: z.string().trim().min(3).max(1000) }).strict().parse(await request.json());
  return prisma.$transaction(async tx => {
    const updated = await tx.product.updateMany({ where: { id: input.id, version: input.version }, data: { archived: input.archived, version: { increment: 1 } } });
    if (!updated.count) throw new ApiError(409, "Product changed or is unavailable. Refresh and try again.");
    await audit(tx, actor.id, input.archived ? "PRODUCT_ARCHIVED" : "PRODUCT_RESTORED", "Product", input.id, { reason: input.reason });
    return { id: input.id, archived: input.archived, version: input.version + 1 };
  });
}

export async function bookings(request: Request) {
  await currentUser("ADMIN");
  const { page, pageSize, q, status } = query(request);
  if (status && !["PENDING", "CONFIRMED", "PICKED_UP", "RETURNED", "COMPLETED", "REJECTED", "CANCELLED"].includes(status)) throw new ApiError(400, "Invalid booking status.");
  const where: Prisma.BookingWhereInput = { ...(status ? { status: status as "PENDING" | "CONFIRMED" | "PICKED_UP" | "RETURNED" | "COMPLETED" | "REJECTED" | "CANCELLED" } : {}), ...(q ? { OR: [{ id: { contains: q, mode: "insensitive" } }, { customer: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } }, { boutique: { name: { contains: q, mode: "insensitive" } } }, { items: { some: { productNameSnap: { contains: q, mode: "insensitive" } } } }] } : {}) };
  const [records, total] = await prisma.$transaction([prisma.booking.findMany({ where, include: { customer: { select: { name: true, email: true } }, boutique: { select: { id: true, name: true } }, items: true, inspection: true, refundRecord: true }, skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }), prisma.booking.count({ where })]);
  return paged(records.map(record => ({ ...record, rentalMinor: Number(record.rentalMinor), depositMinor: Number(record.depositMinor), items: record.items.map(item => ({ ...item, rentalMinor: Number(item.rentalMinor), depositMinor: Number(item.depositMinor) })), refundRecord: record.refundRecord ? { ...record.refundRecord, amountMinor: record.refundRecord.amountMinor === null ? null : Number(record.refundRecord.amountMinor) } : null })), total, page, pageSize);
}

export async function categories(request: Request) {
  const actor = await currentUser("ADMIN");
  await ensureCategories();
  if (request.method === "GET") {
    const { page, pageSize, q, status } = query(request);
    if (status && !["ACTIVE", "INACTIVE"].includes(status)) throw new ApiError(400, "Invalid category status.");
    const where: Prisma.CategoryWhereInput = { ...(q ? { name: { contains: q, mode: "insensitive" } } : {}), ...(status ? { isActive: status === "ACTIVE" } : {}) };
    const [items, total] = await prisma.$transaction([prisma.category.findMany({ where, include: { _count: { select: { products: true } } }, orderBy: { name: "asc" }, skip: (page - 1) * pageSize, take: pageSize }), prisma.category.count({ where })]);
    return paged(items, total, page, pageSize);
  }
  const shape = { name: z.string().trim().min(2).max(80), slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens for the slug."), isActive: z.boolean().default(true) };
  if (request.method === "POST") {
    const input = z.object(shape).strict().parse(await request.json());
    return prisma.$transaction(async tx => { const category = await tx.category.create({ data: input }); await audit(tx, actor.id, "CATEGORY_CREATED", "Category", category.id, input); return category; });
  }
  const input = z.object({ id, version: z.number().int().positive(), ...shape }).strict().parse(await request.json());
  return prisma.$transaction(async tx => {
    const original = await tx.category.findUnique({ where: { id: input.id } });
    if (original?.legacyKey) await tx.product.updateMany({ where: { categoryId: null, category: original.legacyKey }, data: { categoryId: original.id } });
    const changed = await tx.category.updateMany({ where: { id: input.id, version: input.version }, data: { name: input.name, slug: input.slug, isActive: input.isActive, version: { increment: 1 } } });
    if (!changed.count) throw new ApiError(409, "Category changed. Refresh and try again.");
    await audit(tx, actor.id, "CATEGORY_UPDATED", "Category", input.id, { name: input.name, slug: input.slug, isActive: input.isActive });
    return tx.category.findUniqueOrThrow({ where: { id: input.id } });
  });
}

export async function reviews(request: Request) {
  const actor = await currentUser("ADMIN");
  if (request.method !== "GET") {
    const input = z.object({ id, isHidden: z.boolean(), reason: z.string().trim().min(3).max(1000) }).strict().parse(await request.json());
    return prisma.$transaction(async tx => { const changed = await tx.review.updateMany({ where: { id: input.id }, data: { isHidden: input.isHidden, moderationReason: input.isHidden ? input.reason : null } }); if (!changed.count) throw new ApiError(404, "Review not found."); await audit(tx, actor.id, input.isHidden ? "REVIEW_HIDDEN" : "REVIEW_RESTORED", "Review", input.id, { reason: input.reason }); return { id: input.id, isHidden: input.isHidden }; });
  }
  const { page, pageSize, q, status } = query(request);
  if (status && !["VISIBLE", "HIDDEN"].includes(status)) throw new ApiError(400, "Invalid review status.");
  const where: Prisma.ReviewWhereInput = { ...(status ? { isHidden: status === "HIDDEN" } : {}), ...(q ? { OR: [{ comment: { contains: q, mode: "insensitive" } }, { product: { name: { contains: q, mode: "insensitive" } } }, { customer: { name: { contains: q, mode: "insensitive" } } }] } : {}) };
  const [items, total] = await prisma.$transaction([prisma.review.findMany({ where, include: { customer: { select: { name: true, email: true } }, product: { select: { name: true } } }, skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }), prisma.review.count({ where })]);
  return paged(items, total, page, pageSize);
}

async function activityData(page: number, pageSize: number, q = "") {
  // Each source is read through the requested offset; merging those prefixes
  // gives the same globally ordered page without an unbounded database read.
  const take = page * pageSize;
  if (take > 2000) throw new ApiError(400, "Activity is limited to the latest 2,000 entries. Narrow the search.");
  const auditWhere: Prisma.AuditLogWhereInput = q ? { OR: [{ action: { contains: q, mode: "insensitive" } }, { entityId: { contains: q, mode: "insensitive" } }, { entityType: { contains: q, mode: "insensitive" } }, { actor: { name: { contains: q, mode: "insensitive" } } }] } : {};
  const bookingWhere: Prisma.BookingEventWhereInput = q ? { OR: [{ bookingId: { contains: q, mode: "insensitive" } }, { booking: { boutique: { name: { contains: q, mode: "insensitive" } } } }, { actor: { name: { contains: q, mode: "insensitive" } } }] } : {};
  const reviewWhere: Prisma.BoutiqueReviewEventWhereInput = q ? { OR: [{ boutiqueId: { contains: q, mode: "insensitive" } }, { boutique: { name: { contains: q, mode: "insensitive" } } }, { reviewer: { name: { contains: q, mode: "insensitive" } } }] } : {};
  const [logs, events, decisions, auditTotal, eventTotal, decisionTotal] = await Promise.all([
    prisma.auditLog.findMany({ where: auditWhere, include: { actor: { select: { name: true, email: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take }),
    prisma.bookingEvent.findMany({ where: bookingWhere, include: { actor: { select: { name: true, email: true } }, booking: { select: { boutique: { select: { name: true } } } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take }),
    prisma.boutiqueReviewEvent.findMany({ where: reviewWhere, include: { reviewer: { select: { name: true, email: true } }, boutique: { select: { name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take }),
    prisma.auditLog.count({ where: auditWhere }), prisma.bookingEvent.count({ where: bookingWhere }), prisma.boutiqueReviewEvent.count({ where: reviewWhere }),
  ]);
  const merged = [
    ...logs.map(log => ({ id: `audit-${log.id}`, action: log.action, entityType: log.entityType, entityId: log.entityId, actor: log.actor?.name ?? log.actor?.email ?? "System", createdAt: log.createdAt, details: log.details })),
    ...events.map(event => ({ id: `booking-${event.id}`, action: `BOOKING_${event.action}`, entityType: "Booking", entityId: event.bookingId, actor: event.actor?.name ?? event.actor?.email ?? "System", createdAt: event.createdAt, details: { boutique: event.booking.boutique.name, from: event.fromStatus, to: event.toStatus } })),
    ...decisions.map(decision => ({ id: `boutique-${decision.id}`, action: `APPLICATION_${decision.action}`, entityType: "Boutique", entityId: decision.boutiqueId, actor: decision.reviewer.name ?? decision.reviewer.email ?? "Administrator", createdAt: decision.createdAt, details: { boutique: decision.boutique.name, reason: decision.reason } })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id));
  return paged(merged.slice((page - 1) * pageSize, take), auditTotal + eventTotal + decisionTotal, page, pageSize);
}
export async function activity(request: Request) { await currentUser("ADMIN"); const { page, pageSize, q } = query(request); return activityData(page, pageSize, q); }

export async function dashboard() {
  await currentUser("ADMIN");
  const [customers, activeUsers, boutiquesCount, pendingBoutiques, approvedBoutiques, productsCount, activeProducts, totalBookings, pendingBookings, activeRentals, completedRentals, revenue, recentBookings, recentActivity, bookingStatuses, popular, monthly] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }), prisma.user.count({ where: { isActive: true } }), prisma.boutique.count(), prisma.boutique.count({ where: { status: "PENDING" } }), prisma.boutique.count({ where: { status: "APPROVED", owner: { isActive: true } } }), prisma.product.count(), prisma.product.count({ where: { archived: false, boutique: { status: "APPROVED", owner: { isActive: true } }, OR: [{ categoryId: null }, { catalogCategory: { isActive: true } }] } }), prisma.booking.count(), prisma.booking.count({ where: { status: "PENDING" } }), prisma.booking.count({ where: { status: "PICKED_UP" } }), prisma.booking.count({ where: { status: "COMPLETED" } }), prisma.booking.aggregate({ where: { status: "COMPLETED" }, _sum: { rentalMinor: true } }),
    prisma.booking.findMany({ include: { customer: { select: { name: true } }, boutique: { select: { name: true } }, items: { select: { productNameSnap: true } } }, orderBy: { createdAt: "desc" }, take: 8 }), activityData(1, 8), prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.bookingItem.groupBy({ by: ["productNameSnap"], where: { booking: { status: { notIn: ["REJECTED", "CANCELLED"] } } }, _sum: { quantity: true }, orderBy: { _sum: { quantity: "desc" } }, take: 8 }),
    prisma.$queryRaw<{ month: string; bookings: bigint; revenue: bigint }[]>`SELECT to_char(date_trunc('month', "createdAt" AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM') AS month, COUNT(*) AS bookings, COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN "rentalMinor" ELSE 0 END), 0)::bigint AS revenue FROM "Booking" WHERE "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '12 months' GROUP BY 1 ORDER BY 1`,
  ]);
  return { asOf: new Date().toISOString(), summary: { customers, activeUsers, boutiques: boutiquesCount, pendingBoutiques, approvedBoutiques, products: productsCount, activeProducts, totalBookings, pendingBookings, activeRentals, completedRentals, completedRentalRevenueMinor: Number(revenue._sum.rentalMinor ?? 0) }, recentBookings: recentBookings.map(booking => ({ id: booking.id, customer: booking.customer.name ?? "Customer", boutique: booking.boutique.name, products: booking.items.map(item => item.productNameSnap).join(", "), status: booking.status, createdAt: booking.createdAt, rentalMinor: Number(booking.rentalMinor) })), recentActivity: recentActivity.items, bookingStatuses: bookingStatuses.map(group => ({ status: group.status, count: group._count._all })), popularProducts: popular.map(group => ({ name: group.productNameSnap, quantity: group._sum.quantity ?? 0 })), months: monthly.map(month => ({ month: month.month, bookings: Number(month.bookings), completedRevenueMinor: Number(month.revenue) })) };
}
