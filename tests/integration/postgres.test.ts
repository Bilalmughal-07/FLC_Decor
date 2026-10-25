import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createDatabaseOrder } from "@/lib/database-store";
import { getPrisma } from "@/lib/prisma";

const enabled = process.env.RUN_POSTGRES_INTEGRATION === "true";
if (enabled) describe("PostgreSQL transactional checkout", () => {
  const prisma = getPrisma();
  const categoryId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();
  const replayVariantId = randomUUID();
  beforeAll(async () => {
    await prisma.category.create({ data: { id: categoryId, name: "CI Synthetic", slug: `ci-${categoryId.slice(0, 8)}` } });
    await prisma.product.create({ data: { id: productId, primaryCategoryId: categoryId, name: "CI Synthetic Product", slug: `ci-${productId.slice(0, 8)}`, description: "Test fixture", status: "PUBLISHED", publishedAt: new Date() } });
    await prisma.variant.create({ data: { id: variantId, productId, sku: `CI-${variantId.slice(0, 8)}`, sizeLabel: "Test", colorLabel: "Test", regularPriceMinor: 100, availableQty: 1 } });
    await prisma.variant.create({ data: { id: replayVariantId, productId, sku: `CI-${replayVariantId.slice(0, 8)}`, sizeLabel: "Replay", colorLabel: "Test", regularPriceMinor: 100, availableQty: 1 } });
  });
  afterAll(async () => { await prisma.product.delete({ where: { id: productId } }).catch(() => undefined); await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined); await prisma.$disconnect(); });

  it("accepts exactly one concurrent last-unit checkout", async () => {
    process.env.CHECKOUT_RUNTIME = "database"; process.env.CHECKOUT_TOTALS_MODE = "synthetic-zero"; process.env.CHECKOUT_FIELD_ENCRYPTION_KEY = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
    const make = (email: string) => createDatabaseOrder({ idempotencyKey: `ci-key-${email}`, email, phone: "03000000000", address: { name: "CI", line1: "CI address", city: "CI" }, items: [{ variantId, quantity: 1 }] });
    const results = await Promise.all([make("one@example.test"), make("two@example.test")]);
    expect(results.filter((result) => result.kind === "created")).toHaveLength(1);
    expect(results.filter((result) => result.kind === "stock")).toHaveLength(1);
    expect(await prisma.variant.findUnique({ where: { id: variantId } }).then((variant) => variant?.availableQty)).toBe(0);
    expect(await prisma.inventoryLedger.count({ where: { variantId } })).toBe(1);
  });

  it("replays the same key without creating a second order", async () => {
    const input = { idempotencyKey: "ci-replay-key-1234", email: "replay@example.test", phone: "03000000001", address: { name: "CI", line1: "CI address", city: "CI" }, items: [{ variantId: replayVariantId, quantity: 1 }] };
    const first = await createDatabaseOrder(input); const second = await createDatabaseOrder(input);
    expect(first.kind).toBe("created"); expect(second.kind).toBe("replay");
    expect(await prisma.order.count({ where: { guestEmailNormalized: "replay@example.test" } })).toBe(1);
  });
});
else describe.skip("PostgreSQL transactional checkout (requires RUN_POSTGRES_INTEGRATION=true)", () => {
  it("is not run without a real PostgreSQL integration environment", () => expect(true).toBe(true));
});
