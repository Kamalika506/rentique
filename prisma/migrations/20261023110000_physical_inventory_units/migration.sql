CREATE TYPE "InventoryUnitStatus" AS ENUM (
  'READY',
  'WITH_CUSTOMER',
  'INSPECTION_REQUIRED',
  'CLEANING',
  'REPAIR',
  'LOST',
  'RETIRED'
);

CREATE TYPE "InventoryUnitBlockType" AS ENUM ('BOOKING', 'OFFLINE', 'MAINTENANCE');

CREATE TABLE "InventoryUnit" (
  "id" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "code" VARCHAR(100) NOT NULL,
  "status" "InventoryUnitStatus" NOT NULL DEFAULT 'READY',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "InventoryUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryUnitBlock" (
  "id" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "bookingItemId" TEXT,
  "type" "InventoryUnitBlockType" NOT NULL,
  "startsAt" TIMESTAMPTZ(6) NOT NULL,
  "endsAt" TIMESTAMPTZ(6) NOT NULL,
  "returnedAt" TIMESTAMPTZ(6),
  "releasedAt" TIMESTAMPTZ(6),
  "notes" VARCHAR(1000),
  "createdById" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryUnitBlock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryUnitBlock_interval_check" CHECK ("endsAt" > "startsAt")
);

CREATE TABLE "InventoryUnitEvent" (
  "id" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "actorId" TEXT,
  "fromStatus" "InventoryUnitStatus",
  "toStatus" "InventoryUnitStatus" NOT NULL,
  "action" VARCHAR(80) NOT NULL,
  "notes" VARCHAR(1000),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryUnitEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryUnit_variantId_code_key" ON "InventoryUnit"("variantId", "code");
CREATE INDEX "InventoryUnit_variantId_status_code_idx" ON "InventoryUnit"("variantId", "status", "code");
CREATE INDEX "InventoryUnitBlock_unitId_releasedAt_startsAt_endsAt_idx" ON "InventoryUnitBlock"("unitId", "releasedAt", "startsAt", "endsAt");
CREATE INDEX "InventoryUnitBlock_bookingItemId_idx" ON "InventoryUnitBlock"("bookingItemId");
CREATE INDEX "InventoryUnitEvent_unitId_createdAt_idx" ON "InventoryUnitEvent"("unitId", "createdAt");
CREATE INDEX "InventoryUnitEvent_actorId_createdAt_idx" ON "InventoryUnitEvent"("actorId", "createdAt");

-- Preserve current quantity values as individually identifiable pieces.
INSERT INTO "InventoryUnit" ("id", "variantId", "code", "createdAt", "updatedAt")
SELECT variant.id || '_unit_' || piece.number::text,
       variant.id,
       left(regexp_replace(variant.size, '[^A-Za-z0-9-]', '-', 'g'), 70) || '-' || lpad(piece.number::text, 3, '0'),
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM "ProductVariant" AS variant
CROSS JOIN LATERAL generate_series(1, variant.quantity) AS piece(number);

-- Existing live reservations must keep blocking stock after the migration.
-- Assign each existing line to concrete units in deterministic date/code order.
DO $$
DECLARE
  line RECORD;
  slot INTEGER;
  selected_unit_id TEXT;
  block_end TIMESTAMPTZ(6);
BEGIN
  FOR line IN
    SELECT item.id AS item_id, item."variantId" AS variant_id, item.quantity,
           booking.id AS booking_id, booking.status, booking."pickupAt", booking."returnAt",
           booking."requestExpiresAt", booking."turnaroundMinutes", booking."stockReadyAt"
    FROM "BookingItem" AS item
    JOIN "Booking" AS booking ON booking.id = item."bookingId"
    WHERE booking.status IN ('PENDING', 'CONFIRMED', 'PICKED_UP', 'RETURNED', 'COMPLETED')
      AND (booking.status <> 'PENDING' OR booking."requestExpiresAt" IS NULL OR booking."requestExpiresAt" > CURRENT_TIMESTAMP)
      AND (booking.status NOT IN ('RETURNED', 'COMPLETED') OR booking."stockReadyAt" IS NULL AND booking."turnaroundMinutes" > 0)
    ORDER BY booking."pickupAt", booking.id, item.id
  LOOP
    IF line.status = 'PICKED_UP' AND line."returnAt" <= CURRENT_TIMESTAMP
       OR line.status IN ('RETURNED', 'COMPLETED') AND line."stockReadyAt" IS NULL AND line."turnaroundMinutes" > 0 THEN
      block_end := TIMESTAMPTZ '9999-12-31 23:59:59+00';
    ELSE
      block_end := line."returnAt" + make_interval(mins => line."turnaroundMinutes");
    END IF;

    FOR slot IN 1..line.quantity LOOP
      SELECT unit.id INTO selected_unit_id
      FROM "InventoryUnit" AS unit
      WHERE unit."variantId" = line.variant_id
        AND unit.status = 'READY'
        AND NOT EXISTS (
          SELECT 1 FROM "InventoryUnitBlock" AS existing
          WHERE existing."unitId" = unit.id
            AND existing."releasedAt" IS NULL
            AND existing."startsAt" < block_end
            AND existing."endsAt" > line."pickupAt"
        )
      ORDER BY unit.code
      LIMIT 1;

      IF selected_unit_id IS NULL THEN
        RAISE EXCEPTION 'Cannot safely migrate booking line %: not enough non-overlapping physical units for variant %', line.item_id, line.variant_id;
      END IF;

      INSERT INTO "InventoryUnitBlock" ("id", "unitId", "bookingItemId", "type", "startsAt", "endsAt", "returnedAt", "createdAt")
      VALUES ('legacy_' || line.item_id || '_' || slot, selected_unit_id, line.item_id, 'BOOKING', line."pickupAt", block_end,
        CASE WHEN line.status IN ('RETURNED', 'COMPLETED') THEN COALESCE((SELECT booking."returnedAt" FROM "Booking" AS booking WHERE booking.id = line.booking_id), line."returnAt") ELSE NULL END,
        CURRENT_TIMESTAMP);
      selected_unit_id := NULL;
    END LOOP;
  END LOOP;
END $$;

UPDATE "InventoryUnit" AS unit SET status = 'WITH_CUSTOMER', version = unit.version + 1, "updatedAt" = CURRENT_TIMESTAMP
FROM "InventoryUnitBlock" AS block
JOIN "BookingItem" AS item ON item.id = block."bookingItemId"
JOIN "Booking" AS booking ON booking.id = item."bookingId"
WHERE block."unitId" = unit.id AND block."releasedAt" IS NULL
  AND booking.status = 'PICKED_UP' AND item."returnedQuantity" < item.quantity;

UPDATE "InventoryUnit" AS unit SET status = 'CLEANING', version = unit.version + 1, "updatedAt" = CURRENT_TIMESTAMP
FROM "InventoryUnitBlock" AS block
JOIN "BookingItem" AS item ON item.id = block."bookingItemId"
JOIN "Booking" AS booking ON booking.id = item."bookingId"
WHERE block."unitId" = unit.id AND block."releasedAt" IS NULL
  AND booking.status IN ('RETURNED', 'COMPLETED');

ALTER TABLE "InventoryUnit" ADD CONSTRAINT "InventoryUnit_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryUnitBlock" ADD CONSTRAINT "InventoryUnitBlock_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryUnitBlock" ADD CONSTRAINT "InventoryUnitBlock_bookingItemId_fkey"
  FOREIGN KEY ("bookingItemId") REFERENCES "BookingItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryUnitBlock" ADD CONSTRAINT "InventoryUnitBlock_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryUnitEvent" ADD CONSTRAINT "InventoryUnitEvent_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryUnitEvent" ADD CONSTRAINT "InventoryUnitEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "InventoryUnitBlock" ADD CONSTRAINT "InventoryUnitBlock_no_overlapping_active_blocks"
  EXCLUDE USING gist (
    "unitId" WITH =,
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  ) WHERE ("releasedAt" IS NULL);
