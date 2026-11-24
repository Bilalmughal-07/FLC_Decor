import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const receiptCookieName = "flc_order_receipt";
const runtime = globalThis as typeof globalThis & { __flcDemoReceiptKey?: Buffer };
function secret() {
  const configured = process.env.CHECKOUT_FIELD_ENCRYPTION_KEY;
  if (configured && configured !== "NOT_CONFIGURED") {
    const bytes = /^[0-9a-f]{64}$/i.test(configured) ? Buffer.from(configured, "hex") : Buffer.from(configured, "base64");
    if (bytes.length === 32) return bytes;
  }
  if (process.env.NODE_ENV === "production") return null;
  return runtime.__flcDemoReceiptKey ?? (runtime.__flcDemoReceiptKey = randomBytes(32));
}
export function createOrderReceipt(orderId: string, orderNumber: string, now = Date.now()) {
  const key = secret(); if (!key) return null;
  const payload = Buffer.from(JSON.stringify({ id: orderId, number: orderNumber, expires: now + 15 * 60_000 })).toString("base64url");
  const signature = createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
export function readOrderReceipt(token: string | undefined, orderNumber: string, now = Date.now()) {
  const key = secret(); if (!key || !token || token.length > 1000) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", key).update(payload).digest();
  let actual: Buffer; try { actual = Buffer.from(signature, "base64url"); } catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try { const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { id?: string; number?: string; expires?: number }; return data.number === orderNumber && typeof data.id === "string" && typeof data.expires === "number" && data.expires > now ? data.id : null; }
  catch { return null; }
}
