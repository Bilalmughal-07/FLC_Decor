import { describe, expect, it } from "vitest";
import { calculateCheckoutTotal, resolveCheckoutPricing } from "@/lib/checkout-pricing";

describe("checkout pricing policy", () => {
  it("fails closed when no approved pricing policy is configured", () => {
    expect(resolveCheckoutPricing({ NODE_ENV: "development" })).toMatchObject({
      configured: false,
      code: "PRICING_NOT_CONFIGURED",
    });
  });

  it("never enables the synthetic policy in production", () => {
    expect(resolveCheckoutPricing({ NODE_ENV: "production", CHECKOUT_TOTALS_MODE: "synthetic-zero" }).configured).toBe(false);
  });

  it("exposes the zero-value policy only as a labeled local fixture", () => {
    const result = resolveCheckoutPricing({ NODE_ENV: "test", CHECKOUT_TOTALS_MODE: "synthetic-zero" });
    expect(result.configured).toBe(true);
    if (!result.configured) return;
    expect(result.pricing).toMatchObject({ mode: "synthetic-zero", demoOnly: true, shippingMinor: 0, taxMinor: 0, discountMinor: 0 });
    expect(calculateCheckoutTotal(12500, result.pricing)).toBe(12500);
  });

  it("rejects unsafe subtotals", () => {
    const result = resolveCheckoutPricing({ NODE_ENV: "test", CHECKOUT_TOTALS_MODE: "synthetic-zero" });
    if (!result.configured) throw new Error("test setup failed");
    expect(() => calculateCheckoutTotal(-1, result.pricing)).toThrow("INVALID_SUBTOTAL");
    expect(() => calculateCheckoutTotal(Number.MAX_SAFE_INTEGER + 1, result.pricing)).toThrow("INVALID_SUBTOTAL");
  });
});
