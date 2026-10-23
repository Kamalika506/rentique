import type { Prisma } from "@/generated/prisma/client";
import { allowedActions } from "./rules";

export const productInclude = { boutique: { select: { id: true, name: true, description: true, city: true, state: true, address: true, phone: true, contactEmail: true, socialLink: true, timezone: true, openingHours: true, rentalPolicy: true } }, catalogCategory: true, reviews: { where: { isHidden: false }, select: { rating: true } }, variants: { where: { archived: false }, include: { inventoryUnits: { where: { status: { notIn: ["LOST" as const, "RETIRED" as const] } }, select: { id: true, code: true, status: true } } }, orderBy: { size: "asc" as const } }, images: { orderBy: { position: "asc" as const } } };
export const bookingInclude = { customer: { select: { name: true, email: true, phone: true } }, boutique: { select: { name: true, phone: true, address: true, city: true, openingHours: true, rentalPolicy: true } }, items: { include: { variant: { select: { productId: true } }, unitBlocks: { where: { type: "BOOKING" as const }, include: { unit: { select: { id: true, code: true, status: true } } }, orderBy: { unit: { code: "asc" as const } } } } }, reviews: { select: { id: true, productId: true, rating: true, comment: true, isHidden: true } }, events: { orderBy: { createdAt: "asc" as const } }, inspection: true, refundRecord: true };
type Product = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
type Booking = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;
export const categoryMap = { Bridal: "BRIDAL_WEAR", "Ethnic wear": "ETHNIC_WEAR", "Occasion wear": "PARTY_WEAR", "Western wear": "WESTERN_WEAR", Accessories: "ACCESSORIES" } as const;
export function categoryLabel(category: string) { return Object.entries(categoryMap).find(([, value]) => value === category)?.[0] ?? category.replaceAll("_", " "); }
export function catalogProduct(product: Product) {
  const rates = product.variants.filter(variant => variant.quantity > 0).map(variant => Number(variant.rentalPriceMinor ?? product.rentalPriceMinor));
  const listedRate = rates.length ? Math.min(...rates) : Number(product.rentalPriceMinor);
  return { id: product.id, name: product.name, description: product.description, category: product.catalogCategory?.name ?? categoryLabel(product.category), categoryId: product.categoryId, categorySlug: product.catalogCategory?.slug, occasionTags: product.occasionTags, colours: product.colours, collection: product.boutique.name, boutique: product.boutique,
    garmentType: product.garmentType, includedPieces: product.includedPieces, fabricStyle: product.fabricStyle,
    price: listedRate / 100, rentalPriceMinor: listedRate, depositMinor: 0, rentalPriceUnit: product.rentalPriceUnit,
    rentalPeriod: product.rentalPriceUnit === "PER_DAY" ? "day" : "rental", image: product.images[0]?.secureUrl ?? "", images: product.images.map(image => image.secureUrl),
    ratingAverage: product.reviews.length ? Math.round(product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length * 10) / 10 : null, ratingCount: product.reviews.length,
    variants: product.variants.map(variant => ({ id: variant.id, size: variant.size, measurements: variant.measurements, quantity: variant.inventoryUnits.length, rentalPriceMinor: Number(variant.rentalPriceMinor ?? product.rentalPriceMinor), depositMinor: 0 })) };
}
export function managementProduct(product: Product) {
  const variant = product.variants[0];
  return { id: product.id, boutiqueId: product.boutiqueId, name: product.name, description: product.description, category: product.catalogCategory?.name ?? categoryLabel(product.category), categoryId: product.categoryId, occasionTags: product.occasionTags, colours: product.colours,
    size: variant?.size ?? "", measurements: variant?.measurements ?? "", garmentType: product.garmentType, includedPieces: product.includedPieces, quantity: variant?.quantity ?? 0, unitCounts: variant?.inventoryUnits.reduce((counts, unit) => ({ ...counts, [unit.status]: (counts[unit.status] ?? 0) + 1 }), {} as Record<string, number>) ?? {}, units: variant?.inventoryUnits.map(unit => ({ id: unit.id, code: unit.code, status: unit.status })) ?? [], fabricStyle: product.fabricStyle, rentalPriceMinor: Number(product.rentalPriceMinor), depositMinor: Number(product.depositMinor), archived: product.archived, version: product.version, updatedAt: product.updatedAt.toISOString(),
    rentalPriceUnit: product.rentalPriceUnit, variants: product.variants.map(v => ({ id: v.id, size: v.size, quantity: v.quantity, rentalPriceMinor: Number(v.rentalPriceMinor ?? product.rentalPriceMinor), depositMinor: Number(v.depositMinor ?? product.depositMinor) })),
    images: product.images.map(image => ({ id: image.id, source: "cloudinary", url: image.secureUrl, secureUrl: image.secureUrl, publicId: image.publicId, alt: image.alt })) };
}
export function bookingRecord(booking: Booking) {
  const status = booking.status === "PENDING" && booking.requestExpiresAt && booking.requestExpiresAt <= new Date() ? "EXPIRED" as const : booking.status;
  return { id: booking.id, boutiqueId: booking.boutiqueId, boutique: booking.boutique, status, version: booking.version,
    customer: { name: booking.customer.name ?? "Customer", email: booking.customer.email ?? "", phone: booking.customer.phone ?? "" },
    products: booking.items.map(item => ({ id: item.variant.productId, itemId: item.id, returnedQuantity: item.returnedQuantity, name: item.productNameSnap, size: item.sizeSnapshot, quantity: item.quantity, rentalMinor: Number(item.rentalMinor), depositMinor: 0, units: item.unitBlocks.map(block => ({ id: block.unit.id, code: block.unit.code, status: block.unit.status, returnedAt: block.returnedAt?.toISOString(), releasedAt: block.releasedAt?.toISOString() })) })),
    pickupAt: booking.pickupAt.toISOString(), returnAt: booking.returnAt.toISOString(), createdAt: booking.createdAt.toISOString(), rentalMinor: Number(booking.rentalMinor), depositMinor: 0,
    allowedActions: [...allowedActions(status, Boolean(booking.inspection)).filter(action => action !== "RECORD_REFUND"), ...(status === "COMPLETED" && booking.turnaroundMinutes > 0 && !booking.stockReadyAt ? ["MARK_READY" as const] : [])],
    reviews: booking.reviews, review: booking.reviews[0] ?? null, requestExpiresAt: booking.requestExpiresAt?.toISOString(), policySnapshot: booking.policySnapshot,
    partiallyReturned: booking.status === "PICKED_UP" && booking.items.some(item => item.returnedQuantity > 0),
    timeline: booking.events.map(event => ({ id: event.id, action: event.action, fromStatus: event.fromStatus, toStatus: event.toStatus, createdAt: event.createdAt.toISOString() })),
    rejectionReason: booking.rejectionReason ?? undefined, cancellationReason: booking.cancellationReason ?? undefined,
    pickedUpAt: booking.pickedUpAt?.toISOString(), returnedAt: booking.returnedAt?.toISOString(), completedAt: booking.completedAt?.toISOString(), stockReadyAt: booking.stockReadyAt?.toISOString(),
    inspection: booking.inspection ? { condition: booking.inspection.condition, notes: booking.inspection.notes ?? "", recordedAt: booking.inspection.recordedAt.toISOString() } : undefined,
    manualRefund: booking.refundRecord ? { status: booking.refundRecord.status, notes: booking.refundRecord.notes ?? "", recordedAt: booking.refundRecord.recordedAt.toISOString() } : undefined };
}
