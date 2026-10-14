import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { lineAmounts, rentalDays, reservingStatuses } from "./rules";
import type { Prisma } from "@/generated/prisma/client";

/** Peak simultaneous stock, clipped to the requested half-open interval. */
export function peakReserved(items: { quantity: number; booking: { pickupAt: Date; returnAt: Date } }[], pickupAt: Date, returnAt: Date) {
  const changes = items.flatMap(item => [
    { time: Math.max(item.booking.pickupAt.getTime(), pickupAt.getTime()), units: item.quantity },
    { time: Math.min(item.booking.returnAt.getTime(), returnAt.getTime()), units: -item.quantity },
  ]).sort((a, b) => a.time - b.time || a.units - b.units);
  let current = 0, peak = 0;
  for (const change of changes) { current += change.units; peak = Math.max(peak, current); }
  return peak;
}
export async function reservedUnits(db: Prisma.TransactionClient, variantId: string, pickupAt: Date, returnAt: Date) {
  const items = await db.bookingItem.findMany({ where: { variantId, booking: { status: { in: reservingStatuses }, pickupAt: { lt: returnAt }, returnAt: { gt: pickupAt } } }, select: { quantity: true, booking: { select: { pickupAt: true, returnAt: true } } } });
  return peakReserved(items, pickupAt, returnAt);
}
export const quoteSchema = z.object({ variantId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(100).default(1), pickupAt: z.string().datetime({ offset: true }), returnAt: z.string().datetime({ offset: true }) });
export async function availability(request: Request) {
  const input = quoteSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const pickupAt = new Date(input.pickupAt), returnAt = new Date(input.returnAt);
  let days: number;
  try { days = rentalDays(pickupAt, returnAt); } catch (error) { throw new ApiError(400, (error as Error).message); }
  return prisma.$transaction(async tx => {
    const variant = await tx.productVariant.findFirst({ where: { id: input.variantId, archived: false, product: { archived: false, boutique: { status: "APPROVED", owner: { isActive: true } }, OR: [{ categoryId: null }, { catalogCategory: { isActive: true } }] } }, include: { product: true } });
    if (!variant) throw new ApiError(404, "Product or size unavailable.");
    const availableUnits = Math.max(0, variant.quantity - await reservedUnits(tx, variant.id, pickupAt, returnAt));
    const amounts = lineAmounts(variant.rentalPriceMinor ?? variant.product.rentalPriceMinor, variant.depositMinor ?? variant.product.depositMinor, variant.product.rentalPriceUnit, days, input.quantity);
    return { variantId: variant.id, available: input.quantity <= availableUnits, availableUnits, rentalDays: days, rentalMinor: Number(amounts.rentalMinor), depositMinor: Number(amounts.depositMinor), totalMinor: Number(amounts.rentalMinor + amounts.depositMinor), currency: "INR", checkedAt: new Date().toISOString() };
  }, { isolationLevel: "RepeatableRead" });
}
