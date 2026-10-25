import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/catalog";

export type DatabaseOrderInput = {
  idempotencyKey: string;
  email: string;
  phone: string;
  address: { name: string; line1: string; city: string; notes?: string };
  items: Array<{ variantId: string; quantity: number }>;
};

export type DatabaseOrderResult =
  | { kind: "created" | "replay"; order: DatabaseOrder }
  | { kind: "conflict" }
  | { kind: "invalid"; message: string }
  | { kind: "stock"; message: string }
  | { kind: "disabled"; message: string };

export type DatabaseOrder = {
  id: string;
  publicOrderNumber: string;
  email: string;
  phone: string;
  address: DatabaseOrderInput["address"];
  items: Array<{ variantId: string; productName: string; variantLabel: string; quantity: number; unitPrice: number; lineTotal: number }>;
  subtotal: number;
  total: number;
  status: "RECEIVED";
  createdAt: string;
  demoOnly: true;
};

export type DatabaseQuote = { demoOnly: true; checkoutAvailable: boolean; shippingConfigured: true; taxConfigured: true; subtotal: number; subtotalDisplay: string; total: number; items: Array<{ variantId: string; name: string; label: string; quantity: number; unitPrice: number; lineTotal: number }>; message: string };

function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
function normalizePhone(phone: string) { return phone.trim().replace(/\s+/g, " "); }
function hash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function encryptionKey() {
  const configured = process.env.CHECKOUT_FIELD_ENCRYPTION_KEY;
  if (!configured) throw new Error("CHECKOUT_FIELD_ENCRYPTION_KEY_NOT_CONFIGURED");
  const key = /^[0-9a-f]{64}$/i.test(configured) ? Buffer.from(configured, "hex") : Buffer.from(configured, "base64");
  if (key.length !== 32) throw new Error("CHECKOUT_FIELD_ENCRYPTION_KEY_INVALID");
  return key;
}
function encryptField(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}
function totalsConfiguration() {
  if (process.env.NODE_ENV === "production") return null;
  if (process.env.CHECKOUT_TOTALS_MODE !== "synthetic-zero") return null;
  return { shippingMinor: 0, taxMinor: 0 };
}
function enabled() {
  return process.env.NODE_ENV !== "production" && process.env.CHECKOUT_RUNTIME === "database" && Boolean(process.env.DATABASE_URL) && Boolean(totalsConfiguration());
}
function aggregate(items: DatabaseOrderInput["items"]) {
  const result = new Map<string, number>();
  for (const item of items) {
    if (!item.variantId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new Error("INVALID_CART");
    result.set(item.variantId, (result.get(item.variantId) ?? 0) + item.quantity);
  }
  return [...result.entries()].map(([variantId, quantity]) => ({ variantId, quantity })).sort((a, b) => a.variantId.localeCompare(b.variantId));
}
function responseSnapshot(order: DatabaseOrder) { return JSON.parse(JSON.stringify(order)) as Prisma.InputJsonValue; }

function mapOrder(order: { id: string; publicOrderNumber: string; guestEmailNormalized: string; createdAt: Date; status: string; subtotalMinor: number; totalMinor: number | null; items: Array<{ variantId: string | null; productNameSnapshot: string; variantSnapshotJson: unknown; quantity: number; unitPriceMinor: number; lineTotalMinor: number }> }, address: DatabaseOrderInput["address"], phone: string): DatabaseOrder {
  return {
    id: order.id, publicOrderNumber: order.publicOrderNumber, email: order.guestEmailNormalized, phone, address,
    items: order.items.map((item) => {
      const snapshot = item.variantSnapshotJson as { label?: string };
      return { variantId: item.variantId ?? "archived", productName: item.productNameSnapshot, variantLabel: snapshot.label ?? "Selected variant", quantity: item.quantity, unitPrice: item.unitPriceMinor, lineTotal: item.lineTotalMinor };
    }),
    subtotal: order.subtotalMinor, total: order.totalMinor ?? order.subtotalMinor, status: "RECEIVED", createdAt: order.createdAt.toISOString(), demoOnly: true,
  };
}

export function isDatabaseCheckoutEnabled() { return enabled(); }

export async function createDatabaseOrder(input: DatabaseOrderInput): Promise<DatabaseOrderResult> {
  if (!enabled()) return { kind: "disabled", message: "Persistent checkout is not configured for this environment." };
  if (!input.items.length) return { kind: "invalid", message: "Your cart is empty." };
  if (!input.email.includes("@") || input.email.length > 254 || input.phone.length > 40 || input.address.line1.length > 240 || input.address.city.length > 120) return { kind: "invalid", message: "Please check the contact and delivery details." };
  let items: ReturnType<typeof aggregate>;
  try { items = aggregate(input.items); } catch { return { kind: "invalid", message: "One of the selected quantities is invalid." }; }
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const scopeHash = hash({ email, phone });
  const keyHash = hash(input.idempotencyKey);
  const fingerprint = hash({ email, phone, address: input.address, items });
  const totals = totalsConfiguration();
  if (!totals) return { kind: "disabled", message: "Shipping and tax must be configured before persistent checkout can be enabled." };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const prisma = getPrisma();
      return await prisma.$transaction(async (tx) => {
        const prior = await tx.checkoutIdempotency.findUnique({ where: { scopeHash_keyHash: { scopeHash, keyHash } }, include: { order: { include: { items: true } } } });
        if (prior) {
          if (prior.requestFingerprint !== fingerprint) return { kind: "conflict" as const };
          if (!prior.order) throw new Error("IDEMPOTENCY_INCOMPLETE");
          const order = mapOrder(prior.order, input.address, phone);
          return { kind: "replay" as const, order };
        }
        await tx.checkoutIdempotency.create({ data: { scopeHash, keyHash, requestFingerprint: fingerprint, state: "PROCESSING", expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } });
        const variants = await tx.variant.findMany({ where: { id: { in: items.map((item) => item.variantId) } }, include: { product: true } });
        if (variants.length !== items.length || variants.some((variant) => !variant.active || variant.product.status !== "PUBLISHED")) return { kind: "invalid" as const, message: "A selected variant is no longer available." };
        const byId = new Map(variants.map((variant) => [variant.id, variant]));
        const lines = [];
        for (const item of items) {
          const variant = byId.get(item.variantId);
          if (!variant) return { kind: "invalid" as const, message: "A selected variant is no longer available." };
          const changed = await tx.$executeRaw(Prisma.sql`UPDATE "Variant" SET "availableQty" = "availableQty" - ${item.quantity} WHERE "id" = ${item.variantId} AND "active" = true AND "availableQty" >= ${item.quantity}`);
          if (changed !== 1) return { kind: "stock" as const, message: `${variant.product.name} is no longer available in that quantity.` };
          const unitPrice = variant.salePriceMinor ?? variant.regularPriceMinor;
          lines.push({ variantId: variant.id, productNameSnapshot: variant.product.name, variantSnapshotJson: { size: variant.sizeLabel, color: variant.colorLabel, label: `${variant.sizeLabel ?? "Standard"} · ${variant.colorLabel ?? "Original"}` }, quantity: item.quantity, unitPriceMinor: unitPrice, lineTotalMinor: unitPrice * item.quantity });
        }
        const subtotalMinor = lines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
        const publicOrderNumber = `FL-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
        const order = await tx.order.create({ data: { publicOrderNumber, guestEmailNormalized: email, contactPhoneEncrypted: encryptField(phone), addressCiphertext: encryptField(JSON.stringify(input.address)), addressKeyVersion: "v1", status: "RECEIVED", paymentMethod: "COD_DEMO", currency: "PKR", subtotalMinor, shippingMinor: totals.shippingMinor, taxMinor: totals.taxMinor, discountMinor: 0, totalMinor: subtotalMinor + totals.shippingMinor + totals.taxMinor, items: { create: lines }, inventoryLedger: { create: lines.map((line) => ({ variantId: line.variantId, deltaQty: -line.quantity, reason: "COD_ORDER", eventId: `order:${publicOrderNumber}:${line.variantId}` })) }, statusEvents: { create: { toStatus: "RECEIVED", reason: "Synthetic persistent checkout" } } } });
        const mapped = mapOrder({ ...order, items: lines }, input.address, phone);
        await tx.checkoutIdempotency.update({ where: { scopeHash_keyHash: { scopeHash, keyHash } }, data: { orderId: order.id, state: "COMPLETED", responseSnapshot: responseSnapshot(mapped) } });
        return { kind: "created" as const, order: mapped };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5_000, timeout: 10_000 });
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
      if ((code === "P2002" || code === "P2034") && attempt < 2) continue;
      if (code === "P2002" || code === "P2034") return { kind: "stock", message: "The checkout could not be safely committed; please retry with the same key." };
      if (error instanceof Error && error.message.startsWith("CHECKOUT_FIELD_ENCRYPTION_KEY")) return { kind: "disabled", message: "Checkout encryption is not configured for this environment." };
      throw error;
    }
  }
  return { kind: "disabled", message: "Persistent checkout is temporarily unavailable." };
}

export async function quoteDatabaseItems(rawItems: Array<{ variantId: string; quantity: number }>): Promise<{ kind: "ok"; quote: DatabaseQuote } | { kind: "invalid"; message: string } | { kind: "disabled"; message: string }> {
  if (!enabled()) return { kind: "disabled", message: "Persistent quote is not configured for this environment." };
  let items: ReturnType<typeof aggregate>;
  try { items = aggregate(rawItems); } catch { return { kind: "invalid", message: "One of the selected quantities is invalid." }; }
  if (!items.length) return { kind: "invalid", message: "Your cart is empty." };
  const variants = await getPrisma().variant.findMany({ where: { id: { in: items.map((item) => item.variantId) } }, include: { product: true } });
  if (variants.length !== items.length || variants.some((variant) => !variant.active || variant.product.status !== "PUBLISHED")) return { kind: "invalid", message: "A selected variant is no longer available." };
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  const lines = items.map((item) => {
    const variant = byId.get(item.variantId)!;
    if (item.quantity > variant.availableQty) throw new Error("STOCK");
    const unitPrice = variant.salePriceMinor ?? variant.regularPriceMinor;
    return { variantId: item.variantId, name: variant.product.name, label: `${variant.sizeLabel ?? "Standard"} · ${variant.colorLabel ?? "Original"}`, quantity: item.quantity, unitPrice, lineTotal: unitPrice * item.quantity };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  return { kind: "ok", quote: { demoOnly: true, checkoutAvailable: true, shippingConfigured: true, taxConfigured: true, subtotal, subtotalDisplay: formatPrice(subtotal), total: subtotal, items: lines, message: "Synthetic database quote; shipping and tax values are configured only for local integration testing." } };
}

export function databaseQuoteUnavailable() { return !enabled() ? "Persistent quote is not configured for this environment." : null; }
export const databasePriceDisplay = formatPrice;
