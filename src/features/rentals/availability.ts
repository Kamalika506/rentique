import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { lineAmounts, rentalDays } from "./rules";
import type { Prisma } from "@/generated/prisma/client";

import { availableInventoryUnits } from "./inventory-units";
export { peakReserved } from "./stock";
export const publicProductWhere: Prisma.ProductWhereInput = { archived: false, boutique: { status: "APPROVED", owner: { isActive: true } }, OR: [{ categoryId: null }, { catalogCategory: { isActive: true } }] };
export async function availablePhysicalUnits(db: Prisma.TransactionClient, variantId: string, pickupAt: Date, inventoryEndAt: Date) {
  return availableInventoryUnits(db, variantId, pickupAt, inventoryEndAt);
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
    const availableUnits = (await availablePhysicalUnits(tx, variant.id, pickupAt, new Date(returnAt.getTime() + 86400000))).length;
    const amounts = lineAmounts(variant.rentalPriceMinor ?? variant.product.rentalPriceMinor, BigInt(0), variant.product.rentalPriceUnit, days, input.quantity);
    return { variantId: variant.id, available: input.quantity <= availableUnits, availableUnits, rentalDays: days, rentalMinor: Number(amounts.rentalMinor), totalMinor: Number(amounts.rentalMinor), currency: "INR", checkedAt: new Date().toISOString() };
  }, { isolationLevel: "RepeatableRead" });
}
