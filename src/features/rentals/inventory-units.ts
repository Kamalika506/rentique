import { ApiError } from "@/lib/api";
import type { Prisma } from "@/generated/prisma/client";

type Db = Prisma.TransactionClient;
type InventoryReader = Pick<Prisma.TransactionClient, "inventoryUnit">;
type UnitBlockRecord = Prisma.InventoryUnitBlockGetPayload<{
  include: { bookingItem: { include: { booking: true } } };
}>;
type UnitRecord = Prisma.InventoryUnitGetPayload<{ include: { blocks: { include: { bookingItem: { include: { booking: true } } } } } }>;

function blockEndIsUnknown(block: UnitBlockRecord, now: Date) {
  if (block.type === "OFFLINE" || block.type === "MAINTENANCE") return block.endsAt <= now;
  const booking = block.bookingItem?.booking;
  if (!booking) return false;
  if (["CANCELLED", "REJECTED", "EXPIRED"].includes(booking.status)) return false;
  if (booking.status === "PICKED_UP" && booking.returnAt <= now) return true;
  return ["RETURNED", "COMPLETED"].includes(booking.status)
    && booking.stockReadyAt === null
    && booking.turnaroundMinutes > 0;
}

function unitHasOverlap(unit: UnitRecord, startsAt: Date, endsAt: Date, now: Date) {
  return unit.blocks.some(block => {
    if (block.type === "BOOKING") {
      const booking = block.bookingItem?.booking;
      if (!booking || ["CANCELLED", "REJECTED", "EXPIRED"].includes(booking.status)) return false;
    }
    const endsAfter = blockEndIsUnknown(block, now) || block.endsAt > startsAt;
    return block.startsAt < endsAt && endsAfter;
  });
}

export async function availableInventoryForVariants(db: InventoryReader, variantIds: string[], startsAt: Date, endsAt: Date, now = new Date()) {
  if (!variantIds.length) return new Map<string, UnitRecord[]>();
  const units = await db.inventoryUnit.findMany({
    where: { variantId: { in: variantIds }, status: "READY" },
    include: { blocks: { where: { releasedAt: null }, include: { bookingItem: { include: { booking: true } } } } },
    orderBy: { code: "asc" },
  });
  const result = new Map(variantIds.map(id => [id, [] as UnitRecord[]]));
  for (const unit of units) if (!unitHasOverlap(unit, startsAt, endsAt, now)) result.get(unit.variantId)?.push(unit);
  return result;
}

export async function availableInventoryUnits(db: InventoryReader, variantId: string, startsAt: Date, endsAt: Date, now = new Date()) {
  return (await availableInventoryForVariants(db, [variantId], startsAt, endsAt, now)).get(variantId) ?? [];
}

export async function lockVariantUnits(db: Db, variantId: string) {
  // Lock the parent too, so even a zero-stock variant has a serialization point.
  await db.$queryRaw`SELECT "id" FROM "ProductVariant" WHERE "id" = ${variantId} FOR UPDATE`;
  // Row locks serialize all online, offline and maintenance writes for one size.
  await db.$queryRaw`SELECT "id" FROM "InventoryUnit" WHERE "variantId" = ${variantId} ORDER BY "id" FOR UPDATE`;
}

export async function allocateBookingUnits(
  db: Db,
  input: { bookingItemId: string; variantId: string; quantity: number; startsAt: Date; endsAt: Date },
) {
  await lockVariantUnits(db, input.variantId);
  const available = await availableInventoryUnits(db, input.variantId, input.startsAt, input.endsAt);
  if (available.length < input.quantity) throw new ApiError(409, "A physical piece is no longer available for these dates. Review a new estimate.");
  await db.inventoryUnitBlock.createMany({
    data: available.slice(0, input.quantity).map(unit => ({
      unitId: unit.id,
      bookingItemId: input.bookingItemId,
      type: "BOOKING" as const,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    })),
  });
  return available.slice(0, input.quantity);
}

export async function syncVariantUnits(db: Db, input: { variantId: string; size: string; quantity: number; actorId: string }) {
  await lockVariantUnits(db, input.variantId);
  const units = await db.inventoryUnit.findMany({ where: { variantId: input.variantId }, orderBy: { code: "asc" } });
  const activeUnits = units.filter(unit => unit.status !== "RETIRED");
  if (input.quantity > activeUnits.length) {
    const allCodes = new Set(units.map(unit => unit.code));
    const prefix = (input.size.trim().replace(/[^A-Za-z0-9-]/g, "-").slice(0, 70) || "UNIT");
    let sequence = 1;
    const data = [];
    while (data.length < input.quantity - activeUnits.length) {
      const code = `${prefix}-${String(sequence++).padStart(3, "0")}`;
      if (allCodes.has(code)) continue;
      allCodes.add(code);
      data.push({ variantId: input.variantId, code });
    }
    await db.inventoryUnit.createMany({ data });
  } else if (input.quantity < activeUnits.length) {
    const retireCount = activeUnits.length - input.quantity;
    const candidates = await db.inventoryUnit.findMany({
      where: { variantId: input.variantId, status: "READY", blocks: { none: { releasedAt: null } } },
      orderBy: { code: "desc" }, take: retireCount,
    });
    if (candidates.length !== retireCount) throw new ApiError(409, "Some pieces are reserved or unavailable. Resolve their bookings or status before reducing stock.");
    await db.inventoryUnit.updateMany({ where: { id: { in: candidates.map(unit => unit.id) } }, data: { status: "RETIRED", version: { increment: 1 } } });
    await db.inventoryUnitEvent.createMany({ data: candidates.map(unit => ({ unitId: unit.id, actorId: input.actorId, fromStatus: unit.status, toStatus: "RETIRED" as const, action: "RETIRED_FROM_INVENTORY", notes: "Removed while updating the registered stock quantity." })) });
  }
}

export async function recordUnitStatus(db: Db, input: { unitId: string; boutiqueId: string; actorId: string; version: number; status: "READY" | "WITH_CUSTOMER" | "INSPECTION_REQUIRED" | "CLEANING" | "REPAIR" | "LOST" | "RETIRED"; notes?: string }) {
  // Caller owns the transaction and holds a lock on all units in the variant.
  const unit = await db.inventoryUnit.findFirst({ where: { id: input.unitId, variant: { product: { boutiqueId: input.boutiqueId } } } });
  if (!unit || unit.version !== input.version) throw new ApiError(409, "This piece changed or is unavailable. Reload its inventory record.");
  const allowed: Record<typeof input.status, string[]> = {
    READY: ["CLEANING", "REPAIR", "INSPECTION_REQUIRED"],
    WITH_CUSTOMER: ["READY"],
    INSPECTION_REQUIRED: ["WITH_CUSTOMER", "READY"],
    CLEANING: ["INSPECTION_REQUIRED", "REPAIR", "CLEANING"],
    REPAIR: ["INSPECTION_REQUIRED", "CLEANING"],
    LOST: ["READY", "WITH_CUSTOMER", "INSPECTION_REQUIRED", "CLEANING", "REPAIR"],
    RETIRED: ["READY"],
  };
  if (!allowed[input.status].includes(unit.status)) throw new ApiError(409, `A piece cannot move from ${unit.status.replaceAll("_", " ")} to ${input.status.replaceAll("_", " ")}.`);
  if (input.status === "INSPECTION_REQUIRED" && unit.status === "READY") {
    const overdueOffline = await db.inventoryUnitBlock.findFirst({ where: { unitId: unit.id, type: "OFFLINE", releasedAt: null, endsAt: { lte: new Date() } } });
    if (!overdueOffline) throw new ApiError(409, "A ready piece can only be marked returned when an offline commitment is overdue.");
  }
  if (["LOST", "RETIRED"].includes(input.status)) {
    const activeBlock = await db.inventoryUnitBlock.findFirst({ where: { unitId: unit.id, releasedAt: null } });
    if (activeBlock) throw new ApiError(409, "This piece has an active reservation or offline commitment. Resolve it before marking the piece lost or retiring it.");
  }
  if (input.status === "READY") {
    const unreturnedOffline = await db.inventoryUnitBlock.findFirst({ where: { unitId: unit.id, releasedAt: null, type: "OFFLINE", returnedAt: null } });
    if (unreturnedOffline) throw new ApiError(409, "Record the offline return and cleaning before marking this piece ready.");
    const activeBooking = await db.inventoryUnitBlock.findFirst({ where: { unitId: unit.id, releasedAt: null, type: "BOOKING", bookingItem: { booking: { status: { in: ["PENDING", "CONFIRMED", "PICKED_UP", "RETURNED", "COMPLETED"] } } } } });
    if (activeBooking) throw new ApiError(409, "This piece still has a booking allocation. Complete the booking's cleaning step before releasing it.");
  }
  const changed = await db.inventoryUnit.updateMany({ where: { id: unit.id, version: input.version }, data: { status: input.status, version: { increment: 1 } } });
  if (!changed.count) throw new ApiError(409, "This piece changed. Reload its inventory record.");
  if (input.status === "INSPECTION_REQUIRED") {
    await db.inventoryUnitBlock.updateMany({ where: { unitId: unit.id, type: "OFFLINE", releasedAt: null }, data: { returnedAt: new Date(), endsAt: new Date(Date.now() + 24 * 60 * 60000) } });
  }
  if (input.status === "READY") {
    await db.inventoryUnitBlock.updateMany({ where: { unitId: unit.id, releasedAt: null, type: { in: ["OFFLINE", "MAINTENANCE"] } }, data: { releasedAt: new Date() } });
  }
  await db.inventoryUnitEvent.create({ data: { unitId: unit.id, actorId: input.actorId, fromStatus: unit.status, toStatus: input.status, action: `STATUS_${input.status}`, notes: input.notes } });
  return db.inventoryUnit.findUniqueOrThrow({ where: { id: unit.id } });
}
