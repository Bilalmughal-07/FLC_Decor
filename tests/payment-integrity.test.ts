import { describe, expect, it } from "vitest";
import { isAllowedPaymentTransition, mockWebhookSignature, verifyMockWebhookSignature } from "@/lib/payment-integrity";

describe("payment integrity boundary", () => {
  it("allows only forward payment transitions", () => {
    expect(isAllowedPaymentTransition("PENDING", "AUTHORIZED")).toBe(true);
    expect(isAllowedPaymentTransition("AUTHORIZED", "PAID")).toBe(true);
    expect(isAllowedPaymentTransition("PAID", "PENDING")).toBe(false);
    expect(isAllowedPaymentTransition("REFUNDED", "PAID")).toBe(false);
  });

  it("verifies the test-only provider signature without accepting tampering", () => {
    const body = JSON.stringify({ event: "synthetic" });
    const signature = mockWebhookSignature(body, "test-secret");
    expect(verifyMockWebhookSignature(body, signature, "test-secret")).toBe(true);
    expect(verifyMockWebhookSignature(body + "tampered", signature, "test-secret")).toBe(false);
    expect(verifyMockWebhookSignature(body, signature, "wrong-secret")).toBe(false);
  });
});
