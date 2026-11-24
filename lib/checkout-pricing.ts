export type CheckoutPricing = {
  mode: "synthetic-zero";
  demoOnly: true;
  shippingMinor: 0;
  taxMinor: 0;
  discountMinor: 0;
};

export type CheckoutPricingResolution =
  | { configured: true; pricing: CheckoutPricing }
  | { configured: false; code: "PRICING_NOT_CONFIGURED"; message: string };

type Environment = Readonly<Record<string, string | undefined>>;

/**
 * Central pricing-policy boundary. The only implemented policy is an explicit,
 * non-production zero-value fixture used by local integration tests. Delivery,
 * courier, tax and discount policy must be approved before another mode is
 * introduced; an absent policy always fails closed.
 */
export function resolveCheckoutPricing(environment: Environment = process.env): CheckoutPricingResolution {
  if (environment.NODE_ENV === "production" || environment.CHECKOUT_TOTALS_MODE !== "synthetic-zero") {
    return {
      configured: false,
      code: "PRICING_NOT_CONFIGURED",
      message: "Shipping, tax, discount and delivery pricing are not configured for live checkout.",
    };
  }

  return {
    configured: true,
    pricing: {
      mode: "synthetic-zero",
      demoOnly: true,
      shippingMinor: 0,
      taxMinor: 0,
      discountMinor: 0,
    },
  };
}

export function calculateCheckoutTotal(subtotalMinor: number, pricing: CheckoutPricing) {
  if (!Number.isSafeInteger(subtotalMinor) || subtotalMinor < 0) throw new Error("INVALID_SUBTOTAL");
  return subtotalMinor + pricing.shippingMinor + pricing.taxMinor - pricing.discountMinor;
}
