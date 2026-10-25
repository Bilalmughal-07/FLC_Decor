-- Production-shaped PostgreSQL migration for FLC Decor.
-- Generated from prisma/schema.prisma and kept explicit for review.
CREATE SCHEMA IF NOT EXISTS "public";
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "MediaState" AS ENUM ('PENDING', 'APPROVED', 'ORPHANED', 'PURGED');
CREATE TYPE "OrderStatus" AS ENUM ('RECEIVED', 'REVIEWING', 'CONFIRMED', 'DISPATCHED', 'COMPLETED', 'CANCELLED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "passwordHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Session" (
  "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Category" (
  "id" TEXT NOT NULL PRIMARY KEY, "parentId" TEXT, "name" TEXT NOT NULL, "slug" TEXT NOT NULL UNIQUE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'ACTIVE'
);
CREATE TABLE "Product" (
  "id" TEXT NOT NULL PRIMARY KEY, "primaryCategoryId" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT NOT NULL, "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT', "featured" BOOLEAN NOT NULL DEFAULT false,
  "featuredRank" INTEGER, "publishedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "ProductCategory" (
  "productId" TEXT NOT NULL, "categoryId" TEXT NOT NULL, PRIMARY KEY ("productId", "categoryId")
);
CREATE TABLE "Variant" (
  "id" TEXT NOT NULL PRIMARY KEY, "productId" TEXT NOT NULL, "sku" TEXT NOT NULL UNIQUE, "sizeLabel" TEXT, "colorLabel" TEXT,
  "regularPriceMinor" INTEGER NOT NULL, "salePriceMinor" INTEGER, "availableQty" INTEGER NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE ("productId", "sizeLabel", "colorLabel"),
  CHECK ("regularPriceMinor" > 0), CHECK ("salePriceMinor" IS NULL OR ("salePriceMinor" > 0 AND "salePriceMinor" < "regularPriceMinor")), CHECK ("availableQty" >= 0)
);
CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL PRIMARY KEY, "objectKey" TEXT NOT NULL UNIQUE, "mime" TEXT NOT NULL, "width" INTEGER NOT NULL, "height" INTEGER NOT NULL,
  "bytes" INTEGER NOT NULL, "state" "MediaState" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "orphanedAt" TIMESTAMP(3), "purgeAfter" TIMESTAMP(3)
);
CREATE TABLE "ProductMedia" (
  "productId" TEXT NOT NULL, "mediaId" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0, "altText" TEXT NOT NULL,
  PRIMARY KEY ("productId", "mediaId")
);
CREATE TABLE "VariantMedia" (
  "variantId" TEXT NOT NULL, "mediaId" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("variantId", "mediaId")
);
CREATE TABLE "Cart" (
  "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT, "guestTokenHash" TEXT UNIQUE, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "CartItem" (
  "id" TEXT NOT NULL PRIMARY KEY, "cartId" TEXT NOT NULL, "variantId" TEXT NOT NULL, "quantity" INTEGER NOT NULL,
  UNIQUE ("cartId", "variantId"), CHECK ("quantity" > 0)
);
CREATE TABLE "Order" (
  "id" TEXT NOT NULL PRIMARY KEY, "publicOrderNumber" TEXT NOT NULL UNIQUE, "userId" TEXT, "guestEmailNormalized" TEXT NOT NULL,
  "contactPhoneEncrypted" TEXT NOT NULL, "addressCiphertext" TEXT NOT NULL, "addressKeyVersion" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'RECEIVED', "paymentMethod" TEXT NOT NULL DEFAULT 'COD_DEMO', "currency" TEXT NOT NULL DEFAULT 'PKR',
  "subtotalMinor" INTEGER NOT NULL, "shippingMinor" INTEGER, "discountMinor" INTEGER NOT NULL DEFAULT 0, "totalMinor" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL PRIMARY KEY, "orderId" TEXT NOT NULL, "variantId" TEXT, "productNameSnapshot" TEXT NOT NULL,
  "variantSnapshotJson" JSONB NOT NULL, "unitPriceMinor" INTEGER NOT NULL, "quantity" INTEGER NOT NULL, "lineTotalMinor" INTEGER NOT NULL,
  CHECK ("quantity" > 0)
);
CREATE TABLE "InventoryLedger" (
  "id" TEXT NOT NULL PRIMARY KEY, "variantId" TEXT NOT NULL, "orderId" TEXT, "deltaQty" INTEGER NOT NULL, "reason" TEXT NOT NULL,
  "actorId" TEXT, "eventId" TEXT NOT NULL UNIQUE, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "CheckoutIdempotency" (
  "id" TEXT NOT NULL PRIMARY KEY, "scopeHash" TEXT NOT NULL, "keyHash" TEXT NOT NULL, "requestFingerprint" TEXT NOT NULL,
  "orderId" TEXT UNIQUE, "state" TEXT NOT NULL, "responseSnapshot" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL,
  UNIQUE ("scopeHash", "keyHash")
);
CREATE TABLE "GuestTrackingVerification" (
  "id" TEXT NOT NULL PRIMARY KEY, "orderId" TEXT NOT NULL, "verifierHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3), "attempts" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "OrderStatusEvent" (
  "id" TEXT NOT NULL PRIMARY KEY, "orderId" TEXT NOT NULL, "fromStatus" TEXT, "toStatus" TEXT NOT NULL, "actorId" TEXT,
  "reason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL PRIMARY KEY, "actorType" TEXT NOT NULL, "actorId" TEXT, "action" TEXT NOT NULL, "targetType" TEXT NOT NULL,
  "targetId" TEXT, "safeMetadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE INDEX "Category_parentId_sortOrder_idx" ON "Category"("parentId", "sortOrder");
CREATE INDEX "Product_status_featured_publishedAt_idx" ON "Product"("status", "featured", "publishedAt");
CREATE INDEX "Variant_productId_active_idx" ON "Variant"("productId", "active");
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE INDEX "InventoryLedger_variantId_createdAt_idx" ON "InventoryLedger"("variantId", "createdAt");
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_primaryCategoryId_fkey" FOREIGN KEY ("primaryCategoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductMedia" ADD CONSTRAINT "ProductMedia_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductMedia" ADD CONSTRAINT "ProductMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VariantMedia" ADD CONSTRAINT "VariantMedia_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VariantMedia" ADD CONSTRAINT "VariantMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryLedger" ADD CONSTRAINT "InventoryLedger_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryLedger" ADD CONSTRAINT "InventoryLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CheckoutIdempotency" ADD CONSTRAINT "CheckoutIdempotency_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GuestTrackingVerification" ADD CONSTRAINT "GuestTrackingVerification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
