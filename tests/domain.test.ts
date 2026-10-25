import { describe, expect, it } from "vitest";
import { effectivePrice, getProduct } from "@/lib/catalog";
import { quoteItems, validVariantCombination } from "@/lib/domain";
import { createDemoOrder } from "@/lib/demo-store";

describe("catalog domain", () => {
  it("uses a sale price as the authoritative effective price", () => {
    const product = getProduct("sunline-arch");
    const variant = product?.variants.find((item) => item.salePrice);
    expect(variant).toBeDefined();
    expect(effectivePrice(variant!)).toBe(759900);
  });

  it("accepts only a complete variant combination", () => {
    expect(validVariantCombination(getProduct("sunline-arch")?.variants[0])).toBe(true);
    expect(validVariantCombination(undefined)).toBe(false);
  });

  it("quotes valid quantities and rejects forged or invalid quantities", () => {
    expect(quoteItems([{ variantId: "v-sunline-brass", quantity: 2 }])).toEqual([{ variantId: "v-sunline-brass", quantity: 2, unitPrice: 649900 }]);
    expect(() => quoteItems([{ variantId: "missing", quantity: 1 }])).toThrow("INVALID_VARIANT");
    expect(() => quoteItems([{ variantId: "v-sunline-brass", quantity: 0 }])).toThrow("INVALID_VARIANT");
  });

  it("replays the same checkout key and rejects a changed payload", async () => {
    const input = { idempotencyKey: "test-idempotency-0001", email: "demo@example.test", phone: "03000000000", address: { name: "Demo Buyer", line1: "Synthetic Street", city: "Demo City" }, items: [{ variantId: "v-orbit-sage", quantity: 1 }] };
    const first = await createDemoOrder(input);
    const replay = await createDemoOrder(input);
    const conflict = await createDemoOrder({ ...input, items: [{ variantId: "v-orbit-sage", quantity: 2 }] });
    expect(first.kind).toBe("created");
    expect(replay.kind).toBe("replay");
    expect(conflict.kind).toBe("conflict");
  });

  it("scopes the same idempotency key to the checkout identity", async () => {
    const base = { idempotencyKey: "test-scoped-key-0001", phone: "03000000000", address: { name: "Demo Buyer", line1: "Synthetic Street", city: "Demo City" }, items: [{ variantId: "v-nest-ink", quantity: 1 }] };
    const first = await createDemoOrder({ ...base, email: "first@example.test" });
    const otherIdentity = await createDemoOrder({ ...base, email: "second@example.test" });
    expect(first.kind).toBe("created");
    expect(otherIdentity.kind).toBe("created");
  });

  it("allows only one concurrent buyer to reserve the final unit", async () => {
    const request = (key: string) => createDemoOrder({ idempotencyKey: key, email: `${key}@example.test`, phone: "03000000000", address: { name: "Demo Buyer", line1: "Synthetic Street", city: "Demo City" }, items: [{ variantId: "v-lattice-36-br", quantity: 1 }] });
    const results = await Promise.all([request("test-last-unit-a"), request("test-last-unit-b")]);
    expect(results.filter((result) => result.kind === "created")).toHaveLength(1);
    expect(results.filter((result) => result.kind === "stock")).toHaveLength(1);
  });
});
