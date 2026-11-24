-- Additive production database foundation. Existing rows and legacy columns
-- remain intact. No destructive DDL or implicit policy activation is performed.
BEGIN;

CREATE TYPE "FulfillmentStatus" AS ENUM ('PLACED','CONFIRMED','PREPARING','SHIPPED','DELIVERED','CANCELED','RETURN_REQUESTED','RETURNED','EXCEPTION');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','AUTHORIZED','PAID','FAILED','REFUND_PENDING','PARTIALLY_REFUNDED','REFUNDED');
CREATE TYPE "PaymentMethod" AS ENUM ('COD','EASYPAISA','JAZZCASH','CARD');
CREATE TYPE "InventoryMovementKind" AS ENUM ('BASELINE_IMPORT','RECEIPT','RESERVE','RELEASE','SHIP','RETURN_INSPECTED','ADJUSTMENT');
CREATE TYPE "ReservationState" AS ENUM ('ACTIVE','COMMITTED','RELEASED');
CREATE TYPE "PaymentIntentState" AS ENUM ('PENDING','REQUIRES_ACTION','AUTHORIZED','PAID','FAILED','CANCELED','REFUND_PENDING','PARTIALLY_REFUNDED','REFUNDED');
CREATE TYPE "PaymentTransactionKind" AS ENUM ('AUTHORIZED','CAPTURED','FAILED','COD_COLLECTED','REFUNDED','REVERSED');
CREATE TYPE "OutboxState" AS ENUM ('PENDING','PROCESSING','RETRY','COMPLETED','DEAD');
CREATE TYPE "NotificationState" AS ENUM ('QUEUED','ACCEPTED','DELIVERED','FAILED');
CREATE TYPE "FulfillmentSource" AS ENUM ('GUEST','CUSTOMER','ADMIN');

ALTER TABLE "Order"
  ADD COLUMN "placedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "fulfillmentStatus" "FulfillmentStatus",
  ADD COLUMN "paymentStatus" "PaymentStatus",
  ADD COLUMN "source" "FulfillmentSource" NOT NULL DEFAULT 'GUEST',
  ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'PK',
  ADD COLUMN "customerProfileId" TEXT;
ALTER TABLE "OrderStatusEvent" ADD COLUMN "actorType" TEXT NOT NULL DEFAULT 'SYSTEM', ADD COLUMN "correlationId" TEXT;
UPDATE "Order" SET "placedAt" = "createdAt";
UPDATE "Order" SET "fulfillmentStatus" = CASE "status"
  WHEN 'RECEIVED' THEN 'PLACED'::"FulfillmentStatus"
  WHEN 'CONFIRMED' THEN 'CONFIRMED'::"FulfillmentStatus"
  WHEN 'DISPATCHED' THEN 'SHIPPED'::"FulfillmentStatus"
  WHEN 'COMPLETED' THEN 'DELIVERED'::"FulfillmentStatus"
  WHEN 'CANCELLED' THEN 'CANCELED'::"FulfillmentStatus"
  ELSE NULL END;
UPDATE "Order" SET "source" = CASE WHEN "userId" IS NULL THEN 'GUEST'::"FulfillmentSource" ELSE 'CUSTOMER'::"FulfillmentSource" END;
INSERT INTO "OrderStatusEvent" ("id","orderId","fromStatus","toStatus","reason","actorType","createdAt")
SELECT gen_random_uuid()::text,o."id",NULL,o."status",'Preserved legacy status at database foundation migration','SYSTEM',o."createdAt"
FROM "Order" o WHERE NOT EXISTS (SELECT 1 FROM "OrderStatusEvent" e WHERE e."orderId"=o."id");
ALTER TABLE "Order" ADD CONSTRAINT "Order_countryCode_pk_check" CHECK ("countryCode" = 'PK');
ALTER TABLE "Order" ADD CONSTRAINT "Order_subtotal_nonnegative_v2" CHECK ("subtotalMinor" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_shipping_nonnegative_v2" CHECK ("shippingMinor" IS NULL OR "shippingMinor" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_discount_nonnegative_v2" CHECK ("discountMinor" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_tax_nonnegative_v2" CHECK ("taxMinor" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_nonnegative_v2" CHECK ("totalMinor" IS NULL OR "totalMinor" >= 0);

ALTER TABLE "MediaAsset"
  ADD COLUMN "checksumSha256" TEXT,
  ADD COLUMN "ownerAuthUserId" TEXT,
  ADD COLUMN "processingErrorCode" TEXT;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_image_bounds_check" CHECK ("bytes" > 0 AND "width" > 0 AND "height" > 0);
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_regular_price_positive_v2" CHECK ("regularPriceMinor" > 0);
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_sale_price_valid_v2" CHECK ("salePriceMinor" IS NULL OR ("salePriceMinor" > 0 AND "salePriceMinor" < "regularPriceMinor"));
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_available_nonnegative_v2" CHECK ("availableQty" >= 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_positive_v2" CHECK ("quantity" > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_unit_price_positive_v2" CHECK ("unitPriceMinor" > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_line_total_nonnegative_v2" CHECK ("lineTotalMinor" >= 0);
ALTER TABLE "OrderItem" ADD COLUMN "discountMinor" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "taxMinor" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'PKR';
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_financials_nonnegative_v2" CHECK ("discountMinor">=0 AND "taxMinor">=0 AND "currency"='PKR');
ALTER TABLE "Cart" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'PKR', ADD COLUMN "state" TEXT NOT NULL DEFAULT 'ACTIVE', ADD COLUMN "expiresAt" TIMESTAMPTZ(6);
ALTER TABLE "AuditEvent" ADD COLUMN "requestId" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Variant" GROUP BY "productId","sizeLabel","colorLabel" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Variant has duplicate product/size/color tuples; resolve duplicates before migration 0004';
  END IF;
  IF EXISTS (
    WITH RECURSIVE parent_walk(start_id,id,"parentId",depth,path,cycle) AS (
      SELECT c."id",c."id",c."parentId",1,ARRAY[c."id"],false FROM "Category" c
      UNION ALL
      SELECT w.start_id,p."id",p."parentId",w.depth+1,w.path || p."id",p."id"=ANY(w.path)
      FROM parent_walk w JOIN "Category" p ON p."id"=w."parentId" WHERE NOT w.cycle
    ) SELECT 1 FROM parent_walk WHERE depth > 2 OR cycle
  ) THEN
    RAISE EXCEPTION 'Existing Category rows violate maximum depth two or contain a cycle; migration 0004 made no data changes';
  END IF;
END $$;
CREATE UNIQUE INDEX "Variant_product_size_color_nulls_not_distinct_idx"
  ON "Variant"("productId","sizeLabel","colorLabel") NULLS NOT DISTINCT;

CREATE TABLE "CustomerProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "authUserId" TEXT UNIQUE,
  "displayName" TEXT,
  "normalizedEmail" TEXT UNIQUE,
  "normalizedPhone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CustomerProfile_normalizedPhone_idx" ON "CustomerProfile"("normalizedPhone");
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CustomerAddress" (
  "id" TEXT NOT NULL PRIMARY KEY, "customerId" TEXT NOT NULL, "label" TEXT,
  "recipientFirst" TEXT NOT NULL, "recipientLast" TEXT NOT NULL, "address1" TEXT NOT NULL,
  "address2" TEXT, "city" TEXT NOT NULL, "region" TEXT, "postalCode" TEXT,
  "countryCode" TEXT NOT NULL DEFAULT 'PK', "phone" TEXT NOT NULL, "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerAddress_country_pk_check" CHECK ("countryCode" = 'PK'),
  CONSTRAINT "CustomerAddress_lengths_check" CHECK (char_length("recipientFirst") BETWEEN 1 AND 120 AND char_length("recipientLast") BETWEEN 1 AND 120 AND char_length("address1") BETWEEN 1 AND 300 AND char_length("city") BETWEEN 1 AND 120 AND char_length("phone") BETWEEN 5 AND 40),
  CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CustomerAddress_customerId_isDefault_idx" ON "CustomerAddress"("customerId","isDefault");

CREATE TABLE "CustomerConsent" (
  "id" TEXT NOT NULL PRIMARY KEY, "customerId" TEXT NOT NULL, "purpose" TEXT NOT NULL,
  "channel" TEXT NOT NULL, "version" TEXT NOT NULL, "grantedAt" TIMESTAMPTZ(6), "revokedAt" TIMESTAMPTZ(6),
  "evidenceRef" TEXT, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerConsent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "CustomerConsent_customer_purpose_created_idx" ON "CustomerConsent"("customerId","purpose","createdAt");

CREATE TABLE "Role" ("id" TEXT NOT NULL PRIMARY KEY,"code" TEXT NOT NULL UNIQUE,"description" TEXT);
CREATE TABLE "Permission" ("id" TEXT NOT NULL PRIMARY KEY,"code" TEXT NOT NULL UNIQUE,"description" TEXT);
CREATE TABLE "RolePermission" (
  "roleId" TEXT NOT NULL,"permissionId" TEXT NOT NULL,PRIMARY KEY ("roleId","permissionId"),
  CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "UserRole" (
  "id" TEXT NOT NULL PRIMARY KEY,"authUserId" TEXT NOT NULL,"roleId" TEXT NOT NULL,"grantedBy" TEXT,
  "grantedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,"revokedAt" TIMESTAMPTZ(6),
  CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "UserRole_authUserId_roleId_grantedAt_key" UNIQUE ("authUserId","roleId","grantedAt")
);
CREATE INDEX "UserRole_authUserId_revokedAt_idx" ON "UserRole"("authUserId","revokedAt");

CREATE TABLE "InventoryLocation" (
  "id" TEXT NOT NULL PRIMARY KEY,"code" TEXT NOT NULL UNIQUE,"name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "InventoryBalance" (
  "id" TEXT NOT NULL PRIMARY KEY,"variantId" TEXT NOT NULL,"locationId" TEXT NOT NULL,
  "onHand" INTEGER NOT NULL DEFAULT 0,"reserved" INTEGER NOT NULL DEFAULT 0,"version" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryBalance_variantId_locationId_key" UNIQUE ("variantId","locationId"),
  CONSTRAINT "InventoryBalance_nonnegative_check" CHECK ("onHand" >= 0 AND "reserved" >= 0 AND "reserved" <= "onHand"),
  CONSTRAINT "InventoryBalance_version_check" CHECK ("version" >= 0),
  CONSTRAINT "InventoryBalance_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryBalance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "InventoryBalance_locationId_variantId_idx" ON "InventoryBalance"("locationId","variantId");
CREATE TABLE "InventoryMovement" (
  "id" TEXT NOT NULL PRIMARY KEY,"variantId" TEXT NOT NULL,"locationId" TEXT NOT NULL,
  "deltaOnHand" INTEGER NOT NULL,"deltaReserved" INTEGER NOT NULL,"kind" "InventoryMovementKind" NOT NULL,
  "referenceType" TEXT,"referenceId" TEXT,"eventId" TEXT NOT NULL UNIQUE,"actorAuthUserId" TEXT,"reason" TEXT,
  "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_nonzero_check" CHECK ("deltaOnHand" <> 0 OR "deltaReserved" <> 0),
  CONSTRAINT "InventoryMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "InventoryMovement_variantId_occurredAt_id_idx" ON "InventoryMovement"("variantId","occurredAt","id");
CREATE INDEX "InventoryMovement_referenceType_referenceId_idx" ON "InventoryMovement"("referenceType","referenceId");
CREATE TABLE "StockReservation" (
  "id" TEXT NOT NULL PRIMARY KEY,"orderId" TEXT NOT NULL,"variantId" TEXT NOT NULL,"locationId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,"state" "ReservationState" NOT NULL DEFAULT 'ACTIVE',"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "committedAt" TIMESTAMPTZ(6),"releasedAt" TIMESTAMPTZ(6),
  CONSTRAINT "StockReservation_quantity_positive_check" CHECK ("quantity" > 0),
  CONSTRAINT "StockReservation_order_variant_location_key" UNIQUE ("orderId","variantId","locationId"),
  CONSTRAINT "StockReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StockReservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StockReservation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "StockReservation_state_createdAt_idx" ON "StockReservation"("state","createdAt");

-- Development baseline location and non-destructive stock mirror. Keep the
-- existing Variant.availableQty column until a separately verified cutover.
INSERT INTO "InventoryLocation" ("id","code","name","active")
VALUES ('00000000-0000-4000-8000-000000000001','MAIN','Unconfigured initial stock location',false)
ON CONFLICT ("code") DO NOTHING;
INSERT INTO "InventoryBalance" ("id","variantId","locationId","onHand","reserved","version")
SELECT gen_random_uuid()::text,v."id",l."id",v."availableQty",0,0
FROM "Variant" v CROSS JOIN "InventoryLocation" l WHERE l."code"='MAIN'
ON CONFLICT ("variantId","locationId") DO NOTHING;
INSERT INTO "InventoryMovement" ("id","variantId","locationId","deltaOnHand","deltaReserved","kind","eventId","reason")
SELECT gen_random_uuid()::text,b."variantId",b."locationId",b."onHand",0,'BASELINE_IMPORT',
       'baseline-import:' || b."variantId",'Mirrored from legacy Variant.availableQty during additive migration'
FROM "InventoryBalance" b JOIN "InventoryLocation" l ON l."id"=b."locationId" AND l."code"='MAIN'
WHERE b."onHand" <> 0
ON CONFLICT ("eventId") DO NOTHING;

CREATE TABLE "OrderAddressSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,"orderId" TEXT NOT NULL UNIQUE,
  "recipientFirstCiphertext" TEXT NOT NULL,"recipientLastCiphertext" TEXT NOT NULL,"phoneCiphertext" TEXT NOT NULL,
  "address1Ciphertext" TEXT NOT NULL,"address2Ciphertext" TEXT,"cityCiphertext" TEXT NOT NULL,"regionCiphertext" TEXT,
  "postalCodeCiphertext" TEXT,"countryCode" TEXT NOT NULL DEFAULT 'PK',"keyVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderAddressSnapshot_country_pk_check" CHECK ("countryCode"='PK'),
  CONSTRAINT "OrderAddressSnapshot_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "ProductPriceHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,"variantId" TEXT NOT NULL,"previousPriceMinor" INTEGER,"newPriceMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'PKR',"effectiveAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorAuthUserId" TEXT,"reason" TEXT,
  CONSTRAINT "ProductPriceHistory_prices_check" CHECK (("previousPriceMinor" IS NULL OR "previousPriceMinor">0) AND "newPriceMinor">0),
  CONSTRAINT "ProductPriceHistory_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ProductPriceHistory_variantId_effectiveAt_idx" ON "ProductPriceHistory"("variantId","effectiveAt");

CREATE TABLE "Shipment" (
  "id" TEXT NOT NULL PRIMARY KEY,"orderId" TEXT NOT NULL,"courierCode" TEXT,"trackingNumber" TEXT,"serviceCode" TEXT,
  "shippingMinor" INTEGER,"currency" TEXT NOT NULL DEFAULT 'PKR',"state" TEXT NOT NULL DEFAULT 'PENDING',
  "shippedAt" TIMESTAMPTZ(6),"deliveredAt" TIMESTAMPTZ(6),"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Shipment_shipping_nonnegative_check" CHECK ("shippingMinor" IS NULL OR "shippingMinor">=0),
  CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Shipment_orderId_createdAt_idx" ON "Shipment"("orderId","createdAt");
CREATE TABLE "ShipmentItem" (
  "shipmentId" TEXT NOT NULL,"orderItemId" TEXT NOT NULL,"quantity" INTEGER NOT NULL,PRIMARY KEY ("shipmentId","orderItemId"),
  CONSTRAINT "ShipmentItem_quantity_positive_check" CHECK ("quantity">0),
  CONSTRAINT "ShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ShipmentItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "ShipmentTrackingEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,"shipmentId" TEXT NOT NULL,"providerCode" TEXT NOT NULL,"externalEventId" TEXT NOT NULL,
  "status" TEXT NOT NULL,"locationSummary" TEXT,"eventAt" TIMESTAMPTZ(6) NOT NULL,"ingestedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShipmentTrackingEvent_provider_external_key" UNIQUE ("providerCode","externalEventId"),
  CONSTRAINT "ShipmentTrackingEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ShipmentTrackingEvent_shipmentId_eventAt_idx" ON "ShipmentTrackingEvent"("shipmentId","eventAt");

CREATE TABLE "PaymentIntent" (
  "id" TEXT NOT NULL PRIMARY KEY,"orderId" TEXT NOT NULL,"method" "PaymentMethod" NOT NULL,"providerCode" TEXT,
  "amountMinor" INTEGER NOT NULL,"currency" TEXT NOT NULL DEFAULT 'PKR',"state" "PaymentIntentState" NOT NULL DEFAULT 'PENDING',
  "idempotencyRef" TEXT NOT NULL UNIQUE,"providerReference" TEXT,"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentIntent_amount_nonnegative_check" CHECK ("amountMinor">=0),
  CONSTRAINT "PaymentIntent_currency_pkr_check" CHECK ("currency"='PKR'),
  CONSTRAINT "PaymentIntent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PaymentIntent_orderId_state_idx" ON "PaymentIntent"("orderId","state");
CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL PRIMARY KEY,"intentId" TEXT NOT NULL,"providerRequestId" TEXT UNIQUE,"state" TEXT NOT NULL,
  "responseCode" TEXT,"safeMetadata" JSONB,"initiatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,"completedAt" TIMESTAMPTZ(6),
  CONSTRAINT "PaymentAttempt_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "PaymentIntent"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PaymentAttempt_intentId_initiatedAt_idx" ON "PaymentAttempt"("intentId","initiatedAt");
CREATE TABLE "PaymentTransaction" (
  "id" TEXT NOT NULL PRIMARY KEY,"attemptId" TEXT NOT NULL,"providerCode" TEXT,"providerTransactionId" TEXT,
  "kind" "PaymentTransactionKind" NOT NULL,"amountMinor" INTEGER NOT NULL,"currency" TEXT NOT NULL DEFAULT 'PKR',
  "occurredAt" TIMESTAMPTZ(6) NOT NULL,"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentTransaction_amount_nonnegative_check" CHECK ("amountMinor">=0),
  CONSTRAINT "PaymentTransaction_provider_ref_key" UNIQUE ("providerCode","providerTransactionId"),
  CONSTRAINT "PaymentTransaction_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PaymentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PaymentTransaction_attemptId_occurredAt_idx" ON "PaymentTransaction"("attemptId","occurredAt");
CREATE TABLE "PaymentWebhookEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,"providerCode" TEXT NOT NULL,"externalEventId" TEXT NOT NULL,
  "signatureVerified" BOOLEAN NOT NULL DEFAULT false,"payloadDigest" TEXT NOT NULL,"processingResult" TEXT,
  "receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,"processedAt" TIMESTAMPTZ(6),
  CONSTRAINT "PaymentWebhookEvent_provider_event_key" UNIQUE ("providerCode","externalEventId")
);
CREATE INDEX "PaymentWebhookEvent_provider_receivedAt_idx" ON "PaymentWebhookEvent"("providerCode","receivedAt");
CREATE TABLE "Refund" (
  "id" TEXT NOT NULL PRIMARY KEY,"orderId" TEXT NOT NULL,"transactionId" TEXT,"amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'PKR',"reasonCode" TEXT NOT NULL,"state" TEXT NOT NULL,"providerReference" TEXT,
  "requestedBy" TEXT,"requestedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,"processedAt" TIMESTAMPTZ(6),
  CONSTRAINT "Refund_amount_positive_check" CHECK ("amountMinor">0),
  CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Refund_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Refund_orderId_requestedAt_idx" ON "Refund"("orderId","requestedAt");
CREATE TABLE "PaymentReconciliation" (
  "id" TEXT NOT NULL PRIMARY KEY,"providerCode" TEXT NOT NULL,"periodStart" TIMESTAMPTZ(6) NOT NULL,"periodEnd" TIMESTAMPTZ(6) NOT NULL,
  "expectedMinor" INTEGER NOT NULL,"settledMinor" INTEGER NOT NULL,"currency" TEXT NOT NULL DEFAULT 'PKR',
  "discrepancyMinor" INTEGER NOT NULL DEFAULT 0,"state" TEXT NOT NULL,"actorAuthUserId" TEXT,"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentReconciliation_period_check" CHECK ("periodEnd">"periodStart")
);
CREATE INDEX "PaymentReconciliation_provider_period_idx" ON "PaymentReconciliation"("providerCode","periodStart","periodEnd");

CREATE TABLE "OutboxEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,"aggregateType" TEXT NOT NULL,"aggregateId" TEXT NOT NULL,"eventType" TEXT NOT NULL,
  "payloadVersion" INTEGER NOT NULL DEFAULT 1,"payload" JSONB NOT NULL,"dedupeKey" TEXT NOT NULL UNIQUE,
  "state" "OutboxState" NOT NULL DEFAULT 'PENDING',"attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,"processedAt" TIMESTAMPTZ(6),
  CONSTRAINT "OutboxEvent_attempts_nonnegative_check" CHECK ("attempts">=0)
);
CREATE INDEX "OutboxEvent_state_availableAt_idx" ON "OutboxEvent"("state","availableAt");
CREATE INDEX "OutboxEvent_aggregate_createdAt_idx" ON "OutboxEvent"("aggregateType","aggregateId","createdAt");
CREATE TABLE "JobAttempt" (
  "id" TEXT NOT NULL PRIMARY KEY,"outboxEventId" TEXT NOT NULL,"workerCode" TEXT NOT NULL,"attemptNumber" INTEGER NOT NULL,
  "result" TEXT NOT NULL,"errorCategory" TEXT,"startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,"finishedAt" TIMESTAMPTZ(6),
  CONSTRAINT "JobAttempt_attempt_positive_check" CHECK ("attemptNumber">0),
  CONSTRAINT "JobAttempt_outbox_attempt_key" UNIQUE ("outboxEventId","attemptNumber"),
  CONSTRAINT "JobAttempt_outboxEventId_fkey" FOREIGN KEY ("outboxEventId") REFERENCES "OutboxEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL PRIMARY KEY,"orderId" TEXT,"eventKey" TEXT NOT NULL,"channel" TEXT NOT NULL,"recipientRef" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL UNIQUE,"state" "NotificationState" NOT NULL DEFAULT 'QUEUED',"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Notification_state_createdAt_idx" ON "Notification"("state","createdAt");
CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL PRIMARY KEY,"notificationId" TEXT NOT NULL,"providerCode" TEXT NOT NULL,"attemptNumber" INTEGER NOT NULL,
  "providerMessageId" TEXT,"state" "NotificationState" NOT NULL,"errorCode" TEXT,
  "attemptedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,"acknowledgedAt" TIMESTAMPTZ(6),
  CONSTRAINT "NotificationDelivery_attempt_positive_check" CHECK ("attemptNumber">0),
  CONSTRAINT "NotificationDelivery_notification_attempt_key" UNIQUE ("notificationId","attemptNumber"),
  CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "GuestTrackingVerification" ADD COLUMN "destinationHash" TEXT, ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'ORDER_TRACKING';
CREATE TABLE "GuestTrackingChallenge" (
  "id" TEXT NOT NULL PRIMARY KEY,"orderId" TEXT NOT NULL,"channel" TEXT NOT NULL,"destinationHash" TEXT NOT NULL,"challengeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,"consumedAt" TIMESTAMPTZ(6),"attempts" INTEGER NOT NULL DEFAULT 0,"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GuestTrackingChallenge_attempts_check" CHECK ("attempts">=0),
  CONSTRAINT "GuestTrackingChallenge_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "GuestTrackingChallenge_order_expiry_idx" ON "GuestTrackingChallenge"("orderId","expiresAt");
CREATE INDEX "GuestTrackingChallenge_destination_created_idx" ON "GuestTrackingChallenge"("destinationHash","createdAt");
CREATE TABLE "GuestTrackingCapability" (
  "id" TEXT NOT NULL PRIMARY KEY,"orderId" TEXT NOT NULL,"tokenHash" TEXT NOT NULL UNIQUE,"scope" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,"revokedAt" TIMESTAMPTZ(6),"usedAt" TIMESTAMPTZ(6),"createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GuestTrackingCapability_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "GuestTrackingCapability_order_expiry_idx" ON "GuestTrackingCapability"("orderId","expiresAt");
CREATE TABLE "SystemSetting" (
  "key" TEXT NOT NULL PRIMARY KEY,"value" JSONB NOT NULL,"version" INTEGER NOT NULL DEFAULT 1,"changedBy" TEXT,
  "changedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "SystemSetting_version_positive_check" CHECK ("version">0)
);

-- Seed role/permission vocabulary only; no user receives a role automatically.
INSERT INTO "Role" ("id","code","description") VALUES
  (gen_random_uuid()::text,'OWNER','Business owner privileged role'),
  (gen_random_uuid()::text,'ADMIN','Administrative operations'),
  (gen_random_uuid()::text,'CATALOG_MANAGER','Catalog and media operations'),
  (gen_random_uuid()::text,'FULFILLMENT','Order fulfillment operations'),
  (gen_random_uuid()::text,'SUPPORT','Customer support access'),
  (gen_random_uuid()::text,'ANALYST','Read-only analytics')
ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Permission" ("id","code","description") VALUES
  (gen_random_uuid()::text,'catalog.read','Read catalog'),
  (gen_random_uuid()::text,'catalog.write','Manage catalog'),
  (gen_random_uuid()::text,'inventory.read','Read inventory'),
  (gen_random_uuid()::text,'inventory.adjust','Adjust inventory with ledger'),
  (gen_random_uuid()::text,'orders.read','Read orders'),
  (gen_random_uuid()::text,'orders.transition','Apply approved order transitions'),
  (gen_random_uuid()::text,'payments.reconcile','Reconcile payment collections'),
  (gen_random_uuid()::text,'audit.read','Read audit history'),
  (gen_random_uuid()::text,'analytics.read','Read derived analytics'),
  (gen_random_uuid()::text,'settings.manage','Manage approved non-secret settings')
ON CONFLICT ("code") DO NOTHING;

-- Enforce at most two levels and reject cycles. A transaction advisory lock
-- serializes category-tree writes so concurrent moves cannot bypass the test.
CREATE OR REPLACE FUNCTION flc_enforce_category_tree() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_depth INTEGER; subtree_depth INTEGER; creates_cycle BOOLEAN;
BEGIN
  PERFORM pg_advisory_xact_lock(725144301);
  IF NEW."parentId" IS NULL THEN
    parent_depth := 0;
  ELSE
    WITH RECURSIVE ancestors(id,"parentId",depth,path) AS (
      SELECT c."id",c."parentId",1,ARRAY[c."id"] FROM "Category" c WHERE c."id"=NEW."parentId"
      UNION ALL
      SELECT p."id",p."parentId",a.depth+1,a.path || p."id" FROM "Category" p JOIN ancestors a ON p."id"=a."parentId"
      WHERE NOT p."id"=ANY(a.path)
    )
    SELECT COALESCE(MAX(depth),0),COALESCE(bool_or(id=NEW."id"),false) INTO parent_depth,creates_cycle FROM ancestors;
    IF creates_cycle THEN RAISE EXCEPTION 'category cycle rejected' USING ERRCODE='23514'; END IF;
  END IF;
  WITH RECURSIVE descendants(id,depth,path) AS (
    SELECT c."id",1,ARRAY[NEW."id",c."id"] FROM "Category" c WHERE c."parentId"=NEW."id"
    UNION ALL
    SELECT c."id",d.depth+1,d.path || c."id" FROM "Category" c JOIN descendants d ON c."parentId"=d.id
    WHERE NOT c."id"=ANY(d.path)
  )
  SELECT COALESCE(MAX(depth),0) INTO subtree_depth FROM descendants;
  IF parent_depth + 1 + subtree_depth > 2 THEN
    RAISE EXCEPTION 'category depth exceeds two levels' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Category_depth_cycle_guard" BEFORE INSERT OR UPDATE OF "parentId" ON "Category"
FOR EACH ROW EXECUTE FUNCTION flc_enforce_category_tree();

-- Stable query indexes and read-only placed-value view. Placed value is not
-- represented as collected revenue.
CREATE INDEX "Order_customerProfile_placedAt_id_idx" ON "Order"("customerProfileId","placedAt" DESC,"id" DESC);
CREATE INDEX "Order_fulfillment_placedAt_id_idx" ON "Order"("fulfillmentStatus","placedAt" DESC,"id" DESC);
CREATE INDEX "Order_payment_placedAt_id_idx" ON "Order"("paymentStatus","placedAt" DESC,"id" DESC);
CREATE INDEX "OrderStatusEvent_order_created_id_idx" ON "OrderStatusEvent"("orderId","createdAt","id");
CREATE INDEX "AuditEvent_target_created_idx" ON "AuditEvent"("targetType","targetId","createdAt");
CREATE VIEW "AnalyticsDailyPlacedValue" AS
SELECT ("placedAt" AT TIME ZONE 'Asia/Karachi')::date AS "businessDay", "currency",
       COUNT(*)::BIGINT AS "placedOrderCount", COUNT("totalMinor")::BIGINT AS "ordersWithCompleteTotal",
       SUM("totalMinor")::BIGINT AS "placedValueMinor"
FROM "Order" GROUP BY ("placedAt" AT TIME ZONE 'Asia/Karachi')::date,"currency";

COMMIT;
