import { z } from "zod";
import { endpoint, currentUser, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const GET = endpoint(async request => {
  const params = new URL(request.url).searchParams;
  const productId = z.string().min(1).parse(params.get("productId"));
  const page = z.coerce.number().int().min(1).parse(params.get("page") ?? 1);
  const product = await prisma.product.findFirst({ where: { id: productId, archived: false, boutique: { status: "APPROVED", owner: { isActive: true } }, OR: [{ categoryId: null }, { catalogCategory: { isActive: true } }] }, select: { id: true } });
  if (!product) throw new ApiError(404, "Product unavailable.");
  const where = { productId, isHidden: false };
  const [reviews, summary] = await prisma.$transaction([
    prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 20, take: 20, select: { id: true, rating: true, comment: true, createdAt: true, customer: { select: { name: true } } } }),
    prisma.review.aggregate({ where, _avg: { rating: true }, _count: true }),
  ]);
  return { items: reviews.map(review => ({ id: review.id, rating: review.rating, comment: review.comment, createdAt: review.createdAt.toISOString(), customerName: review.customer.name ?? "Customer" })), ratingAverage: summary._avg.rating === null ? null : Math.round(summary._avg.rating * 10) / 10, ratingCount: summary._count, page, totalPages: Math.ceil(summary._count / 20) };
});
export const POST = endpoint(async request => {
  const customer = await currentUser("CUSTOMER");
  const input = z.object({ bookingId: z.string().min(1), productId: z.string().min(1), rating: z.number().int().min(1).max(5), comment: z.string().trim().max(2000).default("") }).strict().parse(await request.json());
  return prisma.$transaction(async tx => {
    const booking = await tx.booking.findFirst({ where: { id: input.bookingId, customerId: customer.id, status: "COMPLETED", pickedUpAt: { not: null }, completedAt: { gte: new Date(Date.now() - 30 * 86400000) }, boutique: { ownerId: { not: customer.id } }, items: { some: { variant: { productId: input.productId } } } } });
    if (!booking) throw new ApiError(403, "You can review only a product from your own completed rental.");
    if (await tx.review.findUnique({ where: { bookingId_productId: { bookingId: booking.id, productId: input.productId } } })) throw new ApiError(409, "This product has already been reviewed for this rental.");
    const review = await tx.review.create({ data: { ...input, customerId: customer.id }, select: { id: true, rating: true, comment: true, createdAt: true } });
    await tx.auditLog.create({ data: { actorId: customer.id, action: "REVIEW_CREATED", entityType: "Review", entityId: review.id, details: { productId: input.productId, bookingId: input.bookingId } } });
    return review;
  });
}, 201);
