import type { Prisma } from "@/generated/prisma/client";
import { allowedActions } from "./rules";

export const productInclude = { boutique: { select: { id: true, name: true, description: true, city: true, state: true, address: true, phone: true, contactEmail: true, socialLink: true, timezone: true } }, catalogCategory: true, reviews: { where: { isHidden: false }, select: { rating: true } }, variants: { where: { archived: false }, orderBy: { size: "asc" as const } }, images: { orderBy: { position: "asc" as const } } };
export const bookingInclude = { customer: { select: { name: true, email: true, phone: true } }, boutique: { select: { name: true, phone: true, address: true, city: true } }, items: { include: { variant: { select: { productId: true } } } }, review: { select: { id: true, rating: true, comment: true, isHidden: true } }, inspection: true, refundRecord: true };
type Product = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
type Booking = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;
export const categoryMap = { Bridal: "BRIDAL_WEAR", "Ethnic wear": "ETHNIC_WEAR", "Occasion wear": "PARTY_WEAR", "Western wear": "WESTERN_WEAR", Accessories: "ACCESSORIES" } as const;
export function categoryLabel(category: string) { return Object.entries(categoryMap).find(([, value]) => value === category)?.[0] ?? category.replaceAll("_", " "); }
export function catalogProduct(product: Product) {
  return { id: product.id, name: product.name, description: product.description, category: product.catalogCategory?.name ?? categoryLabel(product.category), categoryId: product.categoryId, categorySlug: product.catalogCategory?.slug, occasionTags: product.occasionTags, colours: product.colours, collection: product.boutique.name, boutique: product.boutique,
    price: Number(product.rentalPriceMinor) / 100, rentalPriceMinor: Number(product.rentalPriceMinor), depositMinor: Number(product.depositMinor), rentalPriceUnit: product.rentalPriceUnit,
    rentalPeriod: product.rentalPriceUnit === "PER_DAY" ? "day" : "rental", image: product.images[0]?.secureUrl ?? "", images: product.images.map(image => image.secureUrl),
    ratingAverage: product.reviews.length ? Math.round(product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length * 10) / 10 : null, ratingCount: product.reviews.length,
    variants: product.variants.map(variant => ({ id: variant.id, size: variant.size, quantity: variant.quantity, rentalPriceMinor: Number(variant.rentalPriceMinor ?? product.rentalPriceMinor), depositMinor: Number(variant.depositMinor ?? product.depositMinor) })) };
}
export function managementProduct(product: Product) {
  const variant = product.variants[0];
  return { id: product.id, boutiqueId: product.boutiqueId, name: product.name, description: product.description, category: product.catalogCategory?.name ?? categoryLabel(product.category), categoryId: product.categoryId, occasionTags: product.occasionTags, colours: product.colours,
    size: variant?.size ?? "", quantity: variant?.quantity ?? 0, fabricStyle: product.fabricStyle, rentalPriceMinor: Number(product.rentalPriceMinor), depositMinor: Number(product.depositMinor), archived: product.archived, version: product.version, updatedAt: product.updatedAt.toISOString(),
    rentalPriceUnit: product.rentalPriceUnit, variants: product.variants.map(v => ({ id: v.id, size: v.size, quantity: v.quantity, rentalPriceMinor: Number(v.rentalPriceMinor ?? product.rentalPriceMinor), depositMinor: Number(v.depositMinor ?? product.depositMinor) })),
    images: product.images.map(image => ({ id: image.id, source: "cloudinary", url: image.secureUrl, secureUrl: image.secureUrl, publicId: image.publicId, alt: image.alt })) };
}
export function bookingRecord(booking: Booking) {
  return { id: booking.id, boutiqueId: booking.boutiqueId, boutique: booking.boutique, status: booking.status, version: booking.version,
    customer: { name: booking.customer.name ?? "Customer", email: booking.customer.email ?? "", phone: booking.customer.phone ?? "" },
    products: booking.items.map(item => ({ id: item.variant.productId, name: item.productNameSnap, size: item.sizeSnapshot, quantity: item.quantity, rentalMinor: Number(item.rentalMinor), depositMinor: Number(item.depositMinor) })),
    pickupAt: booking.pickupAt.toISOString(), returnAt: booking.returnAt.toISOString(), createdAt: booking.createdAt.toISOString(), rentalMinor: Number(booking.rentalMinor), depositMinor: Number(booking.depositMinor), allowedActions: allowedActions(booking.status, Boolean(booking.inspection)), review: booking.review,
    rejectionReason: booking.rejectionReason ?? undefined, cancellationReason: booking.cancellationReason ?? undefined,
    pickedUpAt: booking.pickedUpAt?.toISOString(), returnedAt: booking.returnedAt?.toISOString(), completedAt: booking.completedAt?.toISOString(),
    inspection: booking.inspection ? { condition: booking.inspection.condition, notes: booking.inspection.notes ?? "", recordedAt: booking.inspection.recordedAt.toISOString() } : undefined,
    manualRefund: booking.refundRecord ? { status: booking.refundRecord.status, notes: booking.refundRecord.notes ?? "", recordedAt: booking.refundRecord.recordedAt.toISOString() } : undefined };
}
