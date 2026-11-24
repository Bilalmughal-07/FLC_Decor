-- Additive private payload for saved addresses. Existing length constraints stay intact.
-- New writes use non-sensitive placeholders in required legacy fields and AES-GCM
-- ciphertext in this column. Existing rows require a separate reviewed backfill.
ALTER TABLE "CustomerAddress" ADD COLUMN "privateDataCiphertext" TEXT;
