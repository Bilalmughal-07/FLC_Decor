-- Durable administrator sessions require a server-recorded MFA completion
-- timestamp. Existing sessions remain unverified and gain no new access.
ALTER TABLE "Session" ADD COLUMN "mfaVerifiedAt" TIMESTAMP(3);

CREATE INDEX "Session_tokenHash_active_idx"
  ON "Session" ("tokenHash", "expiresAt")
  WHERE "revokedAt" IS NULL;
