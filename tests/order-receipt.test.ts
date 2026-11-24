import { describe, expect, it } from "vitest";
import { createOrderReceipt, readOrderReceipt } from "@/lib/order-receipt";

describe("short-lived order receipt", () => {
  it("authorizes only the matching number within the expiry window", () => {
    const receipt = createOrderReceipt("order-test-id", "FL-TEST-001", 1_000);
    expect(receipt).toBeTruthy();
    expect(readOrderReceipt(receipt!, "FL-TEST-001", 2_000)).toBe("order-test-id");
    expect(readOrderReceipt(receipt!, "FL-TEST-002", 2_000)).toBeNull();
    expect(readOrderReceipt(receipt!, "FL-TEST-001", 902_000)).toBeNull();
    expect(readOrderReceipt(receipt! + "x", "FL-TEST-001", 2_000)).toBeNull();
  });
});
