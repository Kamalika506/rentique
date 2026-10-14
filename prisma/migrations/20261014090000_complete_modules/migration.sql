ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Review" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "moderationReason" TEXT;
CREATE TABLE "Category" (
  "id" TEXT NOT NULL PRIMARY KEY, "slug" VARCHAR(120) NOT NULL, "name" VARCHAR(120) NOT NULL,
  "legacyKey" "ProductCategory", "isActive" BOOLEAN NOT NULL DEFAULT true, "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL
);
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Category_legacyKey_key" ON "Category"("legacyKey");
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Product_categoryId_archived_idx" ON "Product"("categoryId", "archived");
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY, "actorId" TEXT, "action" VARCHAR(120) NOT NULL, "entityType" VARCHAR(80) NOT NULL,
  "entityId" TEXT, "details" JSONB, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE TYPE "AuthTokenType" AS ENUM ('PASSWORD_RESET', 'EMAIL_VERIFICATION');
CREATE TABLE "AuthToken" (
  "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "tokenHash" VARCHAR(64) NOT NULL,
  "type" "AuthTokenType" NOT NULL, "expiresAt" TIMESTAMPTZ(6) NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");
CREATE INDEX "AuthToken_userId_type_idx" ON "AuthToken"("userId", "type");
CREATE INDEX "AuthToken_expiresAt_idx" ON "AuthToken"("expiresAt");
CREATE TABLE "RateLimitBucket" ("key" VARCHAR(160) NOT NULL PRIMARY KEY, "count" INTEGER NOT NULL DEFAULT 1, "resetAt" TIMESTAMPTZ(6) NOT NULL);
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");

INSERT INTO "Category" ("id","slug","name","legacyKey","updatedAt") VALUES
('cat-bridal','bridal','Bridal','BRIDAL_WEAR',CURRENT_TIMESTAMP),
('cat-ethnic','ethnic-wear','Ethnic wear','ETHNIC_WEAR',CURRENT_TIMESTAMP),
('cat-occasion','occasion-wear','Occasion wear','PARTY_WEAR',CURRENT_TIMESTAMP),
('cat-western','western-wear','Western wear','WESTERN_WEAR',CURRENT_TIMESTAMP),
('cat-accessories','accessories','Accessories','ACCESSORIES',CURRENT_TIMESTAMP),
('cat-formal','formal-wear','Formal wear','FORMAL_WEAR',CURRENT_TIMESTAMP),
('cat-footwear','footwear','Footwear','FOOTWEAR',CURRENT_TIMESTAMP),
('cat-other','other','Other','OTHER',CURRENT_TIMESTAMP);
UPDATE "Product" SET "categoryId" = "Category"."id" FROM "Category" WHERE "Product"."category" = "Category"."legacyKey";
