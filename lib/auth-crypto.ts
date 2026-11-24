import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { DomainError } from "@/lib/backend-validation";

function encryptionKey() {
  const configured = process.env.AUTH_FIELD_ENCRYPTION_KEY;
  if (!configured || configured === "NOT_CONFIGURED") throw new DomainError("AUTH_ENCRYPTION_NOT_CONFIGURED", "Administrator MFA encryption is not configured.", 503);
  const value = /^[0-9a-f]{64}$/i.test(configured) ? Buffer.from(configured, "hex") : Buffer.from(configured, "base64");
  if (value.length !== 32) throw new DomainError("AUTH_ENCRYPTION_NOT_CONFIGURED", "Administrator MFA encryption is not configured.", 503);
  return value;
}

export function sealAuthSecret(value: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1.${nonce.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function openAuthSecret(value: string) {
  const [version, nonceText, tagText, encryptedText] = value.split(".");
  if (version !== "v1" || !nonceText || !tagText || encryptedText === undefined) throw new DomainError("AUTH_SECRET_UNAVAILABLE", "Administrator MFA could not be read.", 503);
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(nonceText, "base64url"));
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]).toString("utf8");
  } catch { throw new DomainError("AUTH_SECRET_UNAVAILABLE", "Administrator MFA could not be read.", 503); }
}
