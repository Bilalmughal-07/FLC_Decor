import { createHash, randomBytes } from "node:crypto";
import { effectivePrice, getVariant, products } from "./catalog";

export type OrderItemInput = { variantId: string; quantity: number };
export type DemoOrder = {
  id: string;
  publicOrderNumber: string;
  email: string;
  phone: string;
  address: { name: string; line1: string; city: string; notes?: string };
  items: Array<{ variantId: string; productName: string; variantLabel: string; quantity: number; unitPrice: number; lineTotal: number }>;
  subtotal: number;
  total: number | null;
  status: "RECEIVED";
  createdAt: string;
  demoOnly: true;
};

type IdempotencyRecord = { fingerprint: string; order: DemoOrder };
type DemoState = { orders: Map<string, DemoOrder>; idempotency: Map<string, IdempotencyRecord>; mutationQueue: Promise<void> };
const runtime = globalThis as typeof globalThis & { __flcDemoState?: DemoState };
const state: DemoState = runtime.__flcDemoState ?? (runtime.__flcDemoState = { orders: new Map(), idempotency: new Map(), mutationQueue: Promise.resolve() });

function hash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function withLock<T>(task: () => T | Promise<T>) {
  const next = state.mutationQueue.then(task, task);
  state.mutationQueue = next.then(() => undefined, () => undefined);
  return next;
}

export function isDemoCheckoutEnabled() {
  // The synthetic adapter is intentionally unavailable in production, even if a demo flag is accidentally copied there.
  return process.env.NODE_ENV !== "production" && process.env.DEMO_CHECKOUT_ENABLED !== "false";
}
export function listDemoOrders() { return [...state.orders.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }

export async function createDemoOrder(input: { idempotencyKey: string; email: string; phone: string; address: DemoOrder["address"]; items: OrderItemInput[] }) {
  return withLock(() => {
    const scopeHash = hash({ email: input.email.trim().toLowerCase(), phone: input.phone.trim() });
    const idempotencyScopeKey = `${scopeHash}:${input.idempotencyKey}`;
    const fingerprint = hash({ email: input.email.trim().toLowerCase(), phone: input.phone.trim(), address: input.address, items: input.items });
    const prior = state.idempotency.get(idempotencyScopeKey);
    if (prior) {
      if (prior.fingerprint !== fingerprint) return { kind: "conflict" as const };
      return { kind: "replay" as const, order: prior.order };
    }
    if (!isDemoCheckoutEnabled()) return { kind: "disabled" as const };
    if (!input.items.length) return { kind: "invalid" as const, message: "Your cart is empty." };
    const requested = new Map<string, number>();
    for (const item of input.items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) return { kind: "invalid" as const, message: "One of the selected quantities is invalid." };
      requested.set(item.variantId, (requested.get(item.variantId) ?? 0) + item.quantity);
    }
    const lineItems: DemoOrder["items"] = [];
    let subtotal = 0;
    for (const [variantId, quantity] of requested) {
      const item = { variantId, quantity };
      const variant = getVariant(item.variantId);
      const product = products.find((candidate) => candidate.variants.some((candidateVariant) => candidateVariant.id === item.variantId));
      if (!variant || !product) return { kind: "invalid" as const, message: "One of the selected variants is invalid." };
      if (item.quantity > variant.stock) return { kind: "stock" as const, message: `${product.name} is no longer available in that quantity.` };
      const unitPrice = effectivePrice(variant);
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      lineItems.push({ variantId: variant.id, productName: product.name, variantLabel: `${variant.size} · ${variant.color}`, quantity: item.quantity, unitPrice, lineTotal });
    }
    for (const item of lineItems) getVariant(item.variantId)!.stock -= item.quantity;
    const order: DemoOrder = {
      id: randomBytes(12).toString("hex"),
      publicOrderNumber: `FL-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`,
      email: input.email.trim().toLowerCase(), phone: input.phone.trim(), address: input.address, items: lineItems,
      subtotal, total: null, status: "RECEIVED", createdAt: new Date().toISOString(), demoOnly: true,
    };
    state.orders.set(order.publicOrderNumber, order);
    state.idempotency.set(idempotencyScopeKey, { fingerprint, order });
    return { kind: "created" as const, order };
  });
}

export function findDemoOrder(publicOrderNumber: string) { return state.orders.get(publicOrderNumber.toUpperCase()); }
