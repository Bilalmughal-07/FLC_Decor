import { afterEach, describe, expect, it } from "vitest";
import { createDatabaseOrder, isRetryableTransactionConflict, quoteDatabaseItems } from "@/lib/database-store";

const originalRuntime = process.env.CHECKOUT_RUNTIME;
const originalTotals = process.env.CHECKOUT_TOTALS_MODE;

afterEach(() => {
  if (originalRuntime === undefined) delete process.env.CHECKOUT_RUNTIME; else process.env.CHECKOUT_RUNTIME = originalRuntime;
  if (originalTotals === undefined) delete process.env.CHECKOUT_TOTALS_MODE; else process.env.CHECKOUT_TOTALS_MODE = originalTotals;
});

describe("database checkout guard", () => {
  it("recognizes Prisma and adapter PostgreSQL serialization/deadlock errors", () => {
    expect(isRetryableTransactionConflict({ code: "P2034" })).toBe(true);
    expect(isRetryableTransactionConflict({ code: "P2010", meta: { driverAdapterError: { cause: { originalCode: "40001" } } } })).toBe(true);
    expect(isRetryableTransactionConflict({ code: "P2010", meta: { driverAdapterError: { cause: { originalCode: "40P01" } } } })).toBe(true);
    expect(isRetryableTransactionConflict({ code: "P2010", meta: { driverAdapterError: { cause: { originalCode: "23505" } } } })).toBe(false);
  });

  it("does not fall back to the demo adapter when persistent runtime is not selected", async () => {
    delete process.env.CHECKOUT_RUNTIME;
    const result = await createDatabaseOrder({ idempotencyKey: "database-key-123", email: "demo@example.test", phone: "03000000000", address: { name: "Synthetic", line1: "Demo only", city: "Demo" }, items: [{ variantId: "missing", quantity: 1 }] });
    expect(result.kind).toBe("disabled");
  });

  it("does not expose a persistent quote without an explicitly configured totals mode", async () => {
    process.env.CHECKOUT_RUNTIME = "database";
    delete process.env.CHECKOUT_TOTALS_MODE;
    const result = await quoteDatabaseItems([{ variantId: "missing", quantity: 1 }]);
    expect(result.kind).toBe("disabled");
  });
});
