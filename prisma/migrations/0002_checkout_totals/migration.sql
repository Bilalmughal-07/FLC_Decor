ALTER TABLE "Order" ADD COLUMN "taxMinor" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD CONSTRAINT "Order_taxMinor_nonnegative" CHECK ("taxMinor" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_subtotalMinor_nonnegative" CHECK ("subtotalMinor" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_discountMinor_nonnegative" CHECK ("discountMinor" >= 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_unitPriceMinor_positive" CHECK ("unitPriceMinor" > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_lineTotalMinor_nonnegative" CHECK ("lineTotalMinor" >= 0);
CREATE INDEX "GuestTrackingVerification_orderId_expiresAt_idx" ON "GuestTrackingVerification"("orderId", "expiresAt");
