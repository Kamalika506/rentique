import { z } from "zod";
import { ApiError, ownedBoutique } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { availableInventoryUnits, lockVariantUnits, recordUnitStatus } from "./inventory-units";

export async function boutiqueInventoryUnits(request: Request) {
  const { boutique } = await ownedBoutique();
  const productId = z.string().min(1).parse(new URL(request.url).searchParams.get("productId"));
  const product = await prisma.product.findFirst({ where: { id: productId, boutiqueId: boutique.id }, select: { id: true } });
  if (!product) throw new ApiError(404, "Product unavailable.");
  const units = await prisma.inventoryUnit.findMany({
    where: { variant: { productId, product: { boutiqueId: boutique.id } }, status: { not: "RETIRED" } },
    include: {
      variant: { select: { size: true } },
      blocks: {
        where: { releasedAt: null },
        include: { bookingItem: { include: { booking: { select: { id: true, status: true, pickupAt: true, returnAt: true } } } } },
        orderBy: { startsAt: "asc" },
      },
    },
    orderBy: [{ variant: { size: "asc" } }, { code: "asc" }],
  });
  return units.map(unit => ({ id: unit.id, code: unit.code, size: unit.variant.size, status: unit.status, version: unit.version, blocks: unit.blocks.map(block => ({ type: block.type, startsAt: block.startsAt.toISOString(), endsAt: block.endsAt.toISOString(), returnedAt: block.returnedAt?.toISOString(), bookingId: block.bookingItem?.booking.id, bookingStatus: block.bookingItem?.booking.status, bookingReturnAt: block.bookingItem?.booking.returnAt.toISOString(), notes: block.notes })) }));
}

export async function updateBoutiqueInventoryUnit(request: Request) {
  const { user, boutique } = await ownedBoutique();
  const input = z.object({ action: z.enum(["STATUS", "OFFLINE"]), unitId: z.string().min(1), version: z.number().int().positive(), status: z.enum(["READY", "INSPECTION_REQUIRED", "CLEANING", "REPAIR", "LOST", "RETIRED"]).optional(), startsAt: z.string().datetime({ offset: true }).optional(), endsAt: z.string().datetime({ offset: true }).optional(), notes: z.string().trim().max(500).optional() }).strict().parse(await request.json());
  return prisma.$transaction(async tx => {
    const unit = await tx.inventoryUnit.findFirst({ where: { id: input.unitId, variant: { product: { boutiqueId: boutique.id } } }, include: { variant: true } });
    if (!unit || unit.version !== input.version) throw new ApiError(409, "This piece changed or is unavailable. Reload its inventory record.");
    await lockVariantUnits(tx, unit.variantId);
    if (input.action === "STATUS") {
      if (!input.status) throw new ApiError(400, "Choose the piece status.");
      return recordUnitStatus(tx, { unitId: unit.id, boutiqueId: boutique.id, actorId: user.id, version: input.version, status: input.status, notes: input.notes });
    }
    if (!input.startsAt || !input.endsAt) throw new ApiError(400, "Enter the offline commitment dates.");
    const startsAt = new Date(input.startsAt), endsAt = new Date(input.endsAt), now = new Date();
    if (startsAt >= endsAt || endsAt <= now) throw new ApiError(400, "The commitment must end after it starts and cannot already be over.");
    if (unit.status !== "READY") throw new ApiError(409, "Only a ready piece can be committed offline.");
    const available = await availableInventoryUnits(tx, unit.variantId, startsAt, new Date(endsAt.getTime() + 24 * 60 * 60000), now);
    if (!available.some(candidate => candidate.id === unit.id)) throw new ApiError(409, "This piece is already committed or unavailable for those dates.");
    const immediate = startsAt <= now;
    await tx.inventoryUnitBlock.create({ data: { unitId: unit.id, type: "OFFLINE", startsAt, endsAt: new Date(endsAt.getTime() + 24 * 60 * 60000), notes: input.notes, createdById: user.id } });
    if (immediate) {
      await tx.inventoryUnit.update({ where: { id: unit.id }, data: { status: "WITH_CUSTOMER", version: { increment: 1 } } });
      await tx.inventoryUnitEvent.create({ data: { unitId: unit.id, actorId: user.id, fromStatus: unit.status, toStatus: "WITH_CUSTOMER", action: "OFFLINE_COMMITMENT_CREATED", notes: input.notes } });
    } else await tx.inventoryUnitEvent.create({ data: { unitId: unit.id, actorId: user.id, fromStatus: unit.status, toStatus: unit.status, action: "OFFLINE_COMMITMENT_SCHEDULED", notes: input.notes } });
    return { ok: true };
  }, { isolationLevel: "Serializable" });
}
