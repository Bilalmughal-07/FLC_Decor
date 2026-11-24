import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/catalog";
import { calculateCheckoutTotal, resolveCheckoutPricing } from "@/lib/checkout-pricing";

export type DatabaseOrderInput = {
  idempotencyKey: string;
  customerAuthUserId?: string;
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

class TransactionAbort extends Error {
  constructor(readonly result: { kind: "invalid" | "stock"; message: string }) { super(result.kind); }
}

const MAX_TRANSACTION_ATTEMPTS = 4;
const RETRY_BACKOFF_BASE_MS = 10;
const RETRY_BACKOFF_JITTER_MS = 20;

function errorCodes(error: unknown) {
  const codes = new Set<string>();
  const seen = new Set<object>();
  const visit = (value: unknown, depth: number) => {
    if (!value || (typeof value !== "object" && typeof value !== "function") || depth > 5) return;
    const object = value as Record<string, unknown>;
    if (seen.has(object)) return;
    seen.add(object);
    for (const key of ["code", "originalCode", "sqlState", "sqlstate"]) {
      const code = object[key];
      if (typeof code === "string") codes.add(code.toUpperCase());
    }
    for (const key of ["cause", "meta", "driverAdapterError", "originalError"]) visit(object[key], depth + 1);
  };
  visit(error, 0);
  return codes;
}

/**
 * Serializable transaction conflicts have two Prisma representations in this
 * runtime: P2034 from Prisma's transaction layer, or P2010 for an adapter-pg
 * raw-query failure whose nested PostgreSQL SQLSTATE is 40001/40P01.
 */
export function isRetryableTransactionConflict(error: unknown) {
  const codes = errorCodes(error);
  if (["P2034", "40001", "40P01"].some((code) => codes.has(code))) return true;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("could not serialize access") || message.includes("deadlock detected");
}

function isUniqueConstraintConflict(error: unknown) { return errorCodes(error).has("P2002"); }

function retryDelayMs(attempt: number) {
  return Math.min(100, RETRY_BACKOFF_BASE_MS * 2 ** attempt) + Math.floor(Math.random() * RETRY_BACKOFF_JITTER_MS);
}

function wait(milliseconds: number) { return new Promise<void>((resolve) => setTimeout(resolve, milliseconds)); }

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
function enabled() {
  return process.env.NODE_ENV !== "production" && process.env.CHECKOUT_RUNTIME === "database" && Boolean(process.env.DATABASE_URL) && resolveCheckoutPricing().configured;
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
  const fingerprint = hash({ email, phone, address: input.address, items, customerAuthUserId: input.customerAuthUserId ?? null });
  const pricingResolution = resolveCheckoutPricing();
  if (!pricingResolution.configured) return { kind: "disabled", message: pricingResolution.message };
  const pricing = pricingResolution.pricing;

  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      const prisma = getPrisma();
      return await prisma.$transaction(async (tx) => {
        const prior = await tx.checkoutIdempotency.findUnique({ where: { scopeHash_keyHash: { scopeHash, keyHash } }, include: { order: { include: { items: true } } } });
        if (prior) {
          if (prior.requestFingerprint !== fingerprint) return { kind: "conflict" as const };
          if (prior.responseSnapshot) return { kind: "replay" as const, order: prior.responseSnapshot as unknown as DatabaseOrder };
          if (!prior.order) throw new Error("IDEMPOTENCY_INCOMPLETE");
          const order = mapOrder(prior.order, input.address, phone);
          return { kind: "replay" as const, order };
        }
        await tx.checkoutIdempotency.create({ data: { scopeHash, keyHash, requestFingerprint: fingerprint, state: "PROCESSING", expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } });
        const locations = await tx.inventoryLocation.findMany({ where: { active: true }, orderBy: { id: "asc" } });
        if (locations.length !== 1) throw new TransactionAbort({ kind: "invalid", message: "Inventory location is not configured for checkout." });
        const location = locations[0];
        const variants = await tx.variant.findMany({ where: { id: { in: items.map((item) => item.variantId) } }, include: { product: true, balances: { where: { locationId: location.id } } } });
        if (variants.length !== items.length || variants.some((variant) => !variant.active || variant.product.status !== "PUBLISHED" || variant.balances.length !== 1)) throw new TransactionAbort({ kind: "invalid", message: "A selected variant is no longer available." });
        const byId = new Map(variants.map((variant) => [variant.id, variant]));
        const lines = [];
        for (const item of items) {
          const variant = byId.get(item.variantId);
          if (!variant) throw new TransactionAbort({ kind: "invalid", message: "A selected variant is no longer available." });
          const changed = await tx.$executeRaw(Prisma.sql`UPDATE "InventoryBalance" SET "reserved" = "reserved" + ${item.quantity}, "version" = "version" + 1, "updatedAt" = NOW() WHERE "variantId" = ${item.variantId} AND "locationId" = ${location.id} AND "onHand" - "reserved" >= ${item.quantity}`);
          if (changed !== 1) throw new TransactionAbort({ kind: "stock", message: `${variant.product.name} is no longer available in that quantity.` });
          const unitPrice = variant.salePriceMinor ?? variant.regularPriceMinor;
          lines.push({ variantId: variant.id, productNameSnapshot: variant.product.name, variantSnapshotJson: { size: variant.sizeLabel, color: variant.colorLabel, sku: variant.sku, label: `${variant.sizeLabel ?? "Standard"} · ${variant.colorLabel ?? "Original"}` }, quantity: item.quantity, unitPriceMinor: unitPrice, lineTotalMinor: unitPrice * item.quantity });
        }
        const subtotalMinor = lines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
        const publicOrderNumber = `FL-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
        const totalMinor = calculateCheckoutTotal(subtotalMinor, pricing);
        const [recipientFirst, ...recipientLastParts] = input.address.name.trim().split(/\s+/);
        const profile = input.customerAuthUserId ? await tx.customerProfile.upsert({ where: { authUserId: input.customerAuthUserId }, update: {}, create: { authUserId: input.customerAuthUserId, normalizedEmail: email } }) : null;
        if (profile && profile.normalizedEmail !== email) throw new TransactionAbort({ kind: "invalid", message: "The signed-in account email does not match checkout." });
        const order = await tx.order.create({ data: {
          publicOrderNumber, guestEmailNormalized: email, contactPhoneEncrypted: encryptField(phone), addressCiphertext: encryptField(JSON.stringify(input.address)), addressKeyVersion: "v1",
          status: "RECEIVED", fulfillmentStatus: "PLACED", paymentStatus: "PENDING", source: profile ? "CUSTOMER" : "GUEST", customerProfileId: profile?.id, countryCode: "PK", paymentMethod: "COD_DEMO", currency: "PKR",
          subtotalMinor, shippingMinor: pricing.shippingMinor, taxMinor: pricing.taxMinor, discountMinor: pricing.discountMinor, totalMinor,
          items: { create: lines },
          addressSnapshot: { create: { recipientFirstCiphertext: encryptField(recipientFirst ?? ""), recipientLastCiphertext: encryptField(recipientLastParts.join(" ")), phoneCiphertext: encryptField(phone), address1Ciphertext: encryptField(input.address.line1), cityCiphertext: encryptField(input.address.city), keyVersion: "v1" } },
          statusEvents: { create: { toStatus: "RECEIVED", reason: "Synthetic ready-stock order created", actorType: "SYSTEM" } },
          paymentIntents: { create: { method: "COD", amountMinor: totalMinor, currency: "PKR", state: "PENDING", idempotencyRef: `order:${publicOrderNumber}:payment:0` } },
          reservations: { create: lines.map((line) => ({ variantId: line.variantId, locationId: location.id, quantity: line.quantity, state: "ACTIVE" })) },
          notifications: { create: { eventKey: "ORDER_PLACED", channel: "EMAIL", recipientRef: `sha256:${hash(email)}`, dedupeKey: `order:${publicOrderNumber}:confirmation`, state: "QUEUED" } },
        } });
        await tx.outboxEvent.create({ data: { aggregateType: "ORDER", aggregateId: publicOrderNumber, eventType: "ORDER_PLACED", payloadVersion: 1, payload: { orderNumber: publicOrderNumber, paymentMethod: "COD", paymentStatus: "PENDING" }, dedupeKey: `order:${publicOrderNumber}:placed` } });
        await tx.inventoryMovement.createMany({ data: lines.map((line) => ({ variantId: line.variantId, locationId: location.id, deltaOnHand: 0, deltaReserved: line.quantity, kind: "RESERVE", referenceType: "ORDER", referenceId: publicOrderNumber, eventId: `order:${publicOrderNumber}:${line.variantId}:reserve`, reason: "Synthetic COD order reservation" })) });
        await tx.auditEvent.create({ data: { actorType: "SYSTEM", action: "ORDER_PLACED", targetType: "ORDER", targetId: order.id, requestId: null, safeMetadata: { publicOrderNumber, source: profile ? "CUSTOMER" : "GUEST", paymentMethod: "COD", paymentStatus: "PENDING", lineCount: lines.length } } });
        const mapped = mapOrder({ ...order, items: lines }, input.address, phone);
        await tx.checkoutIdempotency.update({ where: { scopeHash_keyHash: { scopeHash, keyHash } }, data: { orderId: order.id, state: "COMPLETED", responseSnapshot: responseSnapshot(mapped) } });
        return { kind: "created" as const, order: mapped };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5_000, timeout: 10_000 });
    } catch (error) {
      if (error instanceof TransactionAbort) return error.result;
      const retryableConflict = isRetryableTransactionConflict(error);
      const idempotencyRace = isUniqueConstraintConflict(error);
      if (retryableConflict || idempotencyRace) {
        if (attempt < MAX_TRANSACTION_ATTEMPTS - 1) {
          await wait(retryDelayMs(attempt));
          continue;
        }
        if (retryableConflict) return { kind: "stock", message: "The selected item is no longer available in that quantity." };
        return { kind: "disabled", message: "Checkout is temporarily unavailable; please retry with the same key." };
      }
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
  const locations = await getPrisma().inventoryLocation.findMany({ where: { active: true }, orderBy: { id: "asc" } });
  if (locations.length !== 1) return { kind: "disabled", message: "Inventory location is not configured for checkout." };
  const variants = await getPrisma().variant.findMany({ where: { id: { in: items.map((item) => item.variantId) } }, include: { product: true, balances: { where: { locationId: locations[0].id } } } });
  if (variants.length !== items.length || variants.some((variant) => !variant.active || variant.product.status !== "PUBLISHED" || variant.balances.length !== 1)) return { kind: "invalid", message: "A selected variant is no longer available." };
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  const lines = items.map((item) => {
    const variant = byId.get(item.variantId)!;
    if (item.quantity > variant.balances[0].onHand - variant.balances[0].reserved) throw new Error("STOCK");
    const unitPrice = variant.salePriceMinor ?? variant.regularPriceMinor;
    return { variantId: item.variantId, name: variant.product.name, label: `${variant.sizeLabel ?? "Standard"} · ${variant.colorLabel ?? "Original"}`, quantity: item.quantity, unitPrice, lineTotal: unitPrice * item.quantity };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  return { kind: "ok", quote: { demoOnly: true, checkoutAvailable: true, shippingConfigured: true, taxConfigured: true, subtotal, subtotalDisplay: formatPrice(subtotal), total: subtotal, items: lines, message: "Synthetic database quote; shipping and tax values are configured only for local integration testing." } };
}

export function databaseQuoteUnavailable() { return !enabled() ? "Persistent quote is not configured for this environment." : null; }
export const databasePriceDisplay = formatPrice;
