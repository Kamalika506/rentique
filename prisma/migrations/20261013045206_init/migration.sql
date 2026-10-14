-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'BOUTIQUE_OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "BoutiqueStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('ETHNIC_WEAR', 'WESTERN_WEAR', 'FORMAL_WEAR', 'PARTY_WEAR', 'BRIDAL_WEAR', 'ACCESSORIES', 'FOOTWEAR', 'OTHER');

-- CreateEnum
CREATE TYPE "RentalPricingUnit" AS ENUM ('PER_DAY', 'PER_RENTAL');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PICKED_UP', 'RETURNED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InspectionCondition" AS ENUM ('GOOD', 'MINOR_DAMAGE', 'MAJOR_DAMAGE');

-- CreateEnum
CREATE TYPE "ManualRefundStatus" AS ENUM ('PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED', 'WITHHELD', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "BookingEventAction" AS ENUM ('CREATED', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'PICKED_UP', 'RETURNED', 'COMPLETED', 'INSPECTION_RECORDED', 'REFUND_UPDATED', 'NOTE_ADDED');

-- CreateEnum
CREATE TYPE "BoutiqueReviewAction" AS ENUM ('APPROVED', 'REJECTED', 'REOPENED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120),
    "email" VARCHAR(254),
    "emailVerified" TIMESTAMPTZ(6),
    "image" TEXT,
    "passwordHash" VARCHAR(255),
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "phone" VARCHAR(32),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "provider" VARCHAR(100) NOT NULL,
    "providerAccountId" VARCHAR(191) NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" VARCHAR(100),
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" VARCHAR(255) NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" VARCHAR(254) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL
);

-- CreateTable
CREATE TABLE "Boutique" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "contactEmail" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "address" VARCHAR(300) NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "state" VARCHAR(120) NOT NULL,
    "postalCode" VARCHAR(12) NOT NULL,
    "categories" "ProductCategory"[],
    "socialLink" VARCHAR(300),
    "status" "BoutiqueStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(6),
    "reviewedById" TEXT,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Boutique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoutiqueReviewEvent" (
    "id" TEXT NOT NULL,
    "boutiqueId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "action" "BoutiqueReviewAction" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoutiqueReviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "boutiqueId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "occasionTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "colours" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fabricStyle" VARCHAR(200) NOT NULL,
    "rentalPriceMinor" BIGINT NOT NULL,
    "rentalPriceUnit" "RentalPricingUnit" NOT NULL DEFAULT 'PER_DAY',
    "depositMinor" BIGINT NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "size" VARCHAR(80) NOT NULL,
    "sku" VARCHAR(100),
    "quantity" INTEGER NOT NULL,
    "rentalPriceMinor" BIGINT,
    "depositMinor" BIGINT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "publicId" VARCHAR(255) NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "alt" VARCHAR(160) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "boutiqueId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "pickupAt" TIMESTAMPTZ(6) NOT NULL,
    "returnAt" TIMESTAMPTZ(6) NOT NULL,
    "rentalMinor" BIGINT NOT NULL,
    "depositMinor" BIGINT NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "rejectionReason" TEXT,
    "cancellationReason" TEXT,
    "pickedUpAt" TIMESTAMPTZ(6),
    "returnedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingItem" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "productNameSnap" VARCHAR(120) NOT NULL,
    "sizeSnapshot" VARCHAR(80) NOT NULL,
    "categorySnapshot" "ProductCategory" NOT NULL,
    "rentalMinor" BIGINT NOT NULL,
    "depositMinor" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "BookingEventAction" NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus",
    "details" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingInspection" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "condition" "InspectionCondition" NOT NULL,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BookingInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualRefundRecord" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" "ManualRefundStatus" NOT NULL DEFAULT 'PENDING',
    "amountMinor" BIGINT,
    "notes" TEXT,
    "recordedById" TEXT,
    "recordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ManualRefundRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expires_idx" ON "Session"("expires");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_expires_idx" ON "VerificationToken"("expires");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Boutique_ownerId_key" ON "Boutique"("ownerId");

-- CreateIndex
CREATE INDEX "Boutique_status_submittedAt_idx" ON "Boutique"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "Boutique_city_state_status_idx" ON "Boutique"("city", "state", "status");

-- CreateIndex
CREATE INDEX "Boutique_reviewedById_idx" ON "Boutique"("reviewedById");

-- CreateIndex
CREATE INDEX "BoutiqueReviewEvent_boutiqueId_createdAt_idx" ON "BoutiqueReviewEvent"("boutiqueId", "createdAt");

-- CreateIndex
CREATE INDEX "BoutiqueReviewEvent_reviewerId_createdAt_idx" ON "BoutiqueReviewEvent"("reviewerId", "createdAt");

-- CreateIndex
CREATE INDEX "Product_boutiqueId_archived_createdAt_idx" ON "Product"("boutiqueId", "archived", "createdAt");

-- CreateIndex
CREATE INDEX "Product_category_archived_idx" ON "Product"("category", "archived");

-- CreateIndex
CREATE INDEX "Product_archived_createdAt_idx" ON "Product"("archived", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_archived_idx" ON "ProductVariant"("productId", "archived");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_size_key" ON "ProductVariant"("productId", "size");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_productId_position_key" ON "ProductImage"("productId", "position");

-- CreateIndex
CREATE INDEX "Booking_customerId_createdAt_idx" ON "Booking"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_boutiqueId_status_createdAt_idx" ON "Booking"("boutiqueId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_status_pickupAt_returnAt_idx" ON "Booking"("status", "pickupAt", "returnAt");

-- CreateIndex
CREATE INDEX "Booking_boutiqueId_pickupAt_returnAt_idx" ON "Booking"("boutiqueId", "pickupAt", "returnAt");

-- CreateIndex
CREATE INDEX "BookingItem_variantId_bookingId_idx" ON "BookingItem"("variantId", "bookingId");

-- CreateIndex
CREATE INDEX "BookingItem_bookingId_idx" ON "BookingItem"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingItem_bookingId_variantId_key" ON "BookingItem"("bookingId", "variantId");

-- CreateIndex
CREATE INDEX "BookingEvent_bookingId_createdAt_idx" ON "BookingEvent"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingEvent_actorId_createdAt_idx" ON "BookingEvent"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookingInspection_bookingId_key" ON "BookingInspection"("bookingId");

-- CreateIndex
CREATE INDEX "BookingInspection_recordedById_recordedAt_idx" ON "BookingInspection"("recordedById", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ManualRefundRecord_bookingId_key" ON "ManualRefundRecord"("bookingId");

-- CreateIndex
CREATE INDEX "ManualRefundRecord_status_updatedAt_idx" ON "ManualRefundRecord"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Wishlist_userId_createdAt_idx" ON "Wishlist"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_userId_productId_key" ON "Wishlist"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "Review_productId_createdAt_idx" ON "Review"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_customerId_createdAt_idx" ON "Review"("customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_customerId_productId_bookingId_key" ON "Review"("customerId", "productId", "bookingId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boutique" ADD CONSTRAINT "Boutique_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boutique" ADD CONSTRAINT "Boutique_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoutiqueReviewEvent" ADD CONSTRAINT "BoutiqueReviewEvent_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoutiqueReviewEvent" ADD CONSTRAINT "BoutiqueReviewEvent_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingInspection" ADD CONSTRAINT "BookingInspection_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingInspection" ADD CONSTRAINT "BookingInspection_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualRefundRecord" ADD CONSTRAINT "ManualRefundRecord_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualRefundRecord" ADD CONSTRAINT "ManualRefundRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Product price and version constraints
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_rentalPriceMinor_nonnegative"
    CHECK ("rentalPriceMinor" >= 0),
  ADD CONSTRAINT "Product_depositMinor_nonnegative"
    CHECK ("depositMinor" >= 0),
  ADD CONSTRAINT "Product_version_positive"
    CHECK ("version" >= 1);

-- Variant inventory constraints
ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "ProductVariant_quantity_range"
    CHECK ("quantity" BETWEEN 0 AND 10000),
  ADD CONSTRAINT "ProductVariant_version_positive"
    CHECK ("version" >= 1),
  ADD CONSTRAINT "ProductVariant_rentalPriceMinor_nonnegative"
    CHECK ("rentalPriceMinor" IS NULL OR "rentalPriceMinor" >= 0),
  ADD CONSTRAINT "ProductVariant_depositMinor_nonnegative"
    CHECK ("depositMinor" IS NULL OR "depositMinor" >= 0);

-- Maximum six images per product, positions 0 through 5
ALTER TABLE "ProductImage"
  ADD CONSTRAINT "ProductImage_position_range"
    CHECK ("position" BETWEEN 0 AND 5);

-- Booking interval and monetary constraints
ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_valid_interval"
    CHECK ("pickupAt" < "returnAt"),
  ADD CONSTRAINT "Booking_amounts_nonnegative"
    CHECK ("rentalMinor" >= 0 AND "depositMinor" >= 0),
  ADD CONSTRAINT "Booking_version_positive"
    CHECK ("version" >= 1);

ALTER TABLE "BookingItem"
  ADD CONSTRAINT "BookingItem_quantity_positive"
    CHECK ("quantity" > 0),
  ADD CONSTRAINT "BookingItem_amounts_nonnegative"
    CHECK ("rentalMinor" >= 0 AND "depositMinor" >= 0);

-- Refund and review constraints
ALTER TABLE "ManualRefundRecord"
  ADD CONSTRAINT "ManualRefundRecord_amount_nonnegative"
    CHECK ("amountMinor" IS NULL OR "amountMinor" >= 0);

ALTER TABLE "Review"
  ADD CONSTRAINT "Review_rating_range"
    CHECK ("rating" BETWEEN 1 AND 5);
