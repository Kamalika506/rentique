-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'EXPIRED';

-- AlterEnum
ALTER TYPE "BookingEventAction" ADD VALUE 'EXPIRED';

-- DropIndex
DROP INDEX "Review_bookingId_key";

-- AlterTable
ALTER TABLE "Boutique" ADD COLUMN     "openingHours" VARCHAR(1000) NOT NULL DEFAULT '',
ADD COLUMN     "rentalPolicy" VARCHAR(3000) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "garmentType" VARCHAR(40) NOT NULL DEFAULT 'other',
ADD COLUMN     "includedPieces" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "measurements" VARCHAR(1000) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "policySnapshot" JSONB,
ADD COLUMN     "requestExpiresAt" TIMESTAMPTZ(6),
ADD COLUMN     "requestKey" VARCHAR(100),
ADD COLUMN     "stockReadyAt" TIMESTAMPTZ(6),
ADD COLUMN     "turnaroundMinutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "BookingItem" ADD COLUMN     "returnedQuantity" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "BasketItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BasketItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingQuote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "dedupeKey" VARCHAR(200) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "href" VARCHAR(300) NOT NULL,
    "scheduledFor" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMPTZ(6),
    "emailedAt" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "leaseUntil" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "subject" VARCHAR(160) NOT NULL,
    "message" VARCHAR(3000) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    "response" VARCHAR(3000) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BasketItem_userId_variantId_key" ON "BasketItem"("userId", "variantId");

-- CreateIndex
CREATE INDEX "BookingQuote_expiresAt_idx" ON "BookingQuote"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_userId_scheduledFor_idx" ON "Notification"("userId", "scheduledFor");

-- CreateIndex
CREATE INDEX "SupportRequest_userId_createdAt_idx" ON "SupportRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportRequest_status_createdAt_idx" ON "SupportRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_customerId_requestKey_key" ON "Booking"("customerId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_productId_key" ON "Review"("bookingId", "productId");

-- AddForeignKey
ALTER TABLE "BasketItem" ADD CONSTRAINT "BasketItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasketItem" ADD CONSTRAINT "BasketItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingQuote" ADD CONSTRAINT "BookingQuote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve the meaning of historical completed/returned rentals.
UPDATE "BookingItem" AS item SET "returnedQuantity" = item.quantity
FROM "Booking" AS booking WHERE item."bookingId" = booking.id
AND booking.status IN ('RETURNED', 'COMPLETED');

ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_returned_quantity_check"
  CHECK ("returnedQuantity" >= 0 AND "returnedQuantity" <= quantity);
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_turnaround_check" CHECK ("turnaroundMinutes" >= 0);
ALTER TABLE "BasketItem" ADD CONSTRAINT "BasketItem_quantity_check" CHECK (quantity BETWEEN 1 AND 10);
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_status_check"
  CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED'));
