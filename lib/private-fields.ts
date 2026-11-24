import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { DomainError } from "@/lib/backend-validation";

function key() {
  const configured = process.env.CHECKOUT_FIELD_ENCRYPTION_KEY;
  if (!configured || configured === "NOT_CONFIGURED") throw new DomainError("ENCRYPTION_NOT_CONFIGURED", "Private storage is not configured.", 503);
  const value = /^[0-9a-f]{64}$/i.test(configured) ? Buffer.from(configured, "hex") : Buffer.from(configured, "base64");
  if (value.length !== 32) throw new DomainError("ENCRYPTION_NOT_CONFIGURED", "Private storage is not configured.", 503);
  return value;
}

export function seal(value: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), nonce);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1.${nonce.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function unseal(value: string) {
  const [version, nonceText, tagText, ciphertextText] = value.split(".");
  if (version !== "v1" || !nonceText || !tagText || ciphertextText === undefined) throw new DomainError("PRIVATE_DATA_UNAVAILABLE", "Private data could not be read.", 503);
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(nonceText, "base64url"));
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64url")), decipher.final()]).toString("utf8");
  } catch { throw new DomainError("PRIVATE_DATA_UNAVAILABLE", "Private data could not be read.", 503); }
}
