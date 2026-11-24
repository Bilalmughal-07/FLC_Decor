import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { adjustInventory, getAdminOrder, listAdminCustomers, listAdminInventory, listAuditEvents, salesAnalytics } from "@/lib/admin-store";
import { attachProductMedia, attachVariantMedia, createCategory, createProduct, createVariant, detachMedia, listCatalog, updateCategory, updateProduct, updateVariant } from "@/lib/catalog-store";
import { GET as adminProductsGet } from "@/app/api/admin/products/route";

if (process.env.RUN_POSTGRES_INTEGRATION === "true") describe("PostgreSQL backend catalog and inventory", () => {
  const prisma = getPrisma();
  const token = randomUUID().slice(0, 8);
  const locationId = "00000000-0000-4000-8000-000000000001";
  afterAll(async () => { await prisma.$disconnect(); });

  it("denies unauthenticated admin catalog access before querying the database", async () => {
    const response = await adminProductsGet(new Request("http://localhost/api/admin/products"));
    expect(response.status).toBe(401);
  });

  it("creates a two-level catalog, validates publishing, adjusts stock and rejects reserved-stock erosion", async () => {
    const parent = await createCategory({ name: "CI Parent", slug: `ci-parent-${token}` }, "ci-admin");
    const child = await createCategory({ name: "CI Child", slug: `ci-child-${token}`, parentId: parent.id }, "ci-admin");
    await expect(createCategory({ name: "Too deep", slug: `ci-too-deep-${token}`, parentId: child.id }, "ci-admin")).rejects.toMatchObject({ code: "INVALID_PARENT" });
    await expect(updateCategory(parent.id, { parentId: child.id }, "ci-admin")).rejects.toMatchObject({ code: "INVALID_PARENT" });
    const product = await createProduct({ name: `CI Catalog ${token}`, slug: `ci-catalog-${token}`, description: "Synthetic test product", primaryCategoryId: child.id, categoryIds: [parent.id] }, "ci-admin");
    await expect(updateProduct(product.id, { status: "PUBLISHED" }, "ci-admin")).rejects.toMatchObject({ code: "CANNOT_PUBLISH" });
    const variant = await createVariant(product.id, { sku: `CI-BACKEND-${token}`, sizeLabel: "Small", colorLabel: "Blue", regularPriceMinor: 120000 }, "ci-admin");
    const media = await prisma.mediaAsset.create({ data: { objectKey: `ci/${token}/${randomUUID()}.webp`, mime: "image/webp", width: 100, height: 100, bytes: 1000, state: "APPROVED" } });
    await attachProductMedia(product.id, { mediaId: media.id, altText: "Synthetic test art" }, "ci-admin");
    await attachVariantMedia(variant.id, { mediaId: media.id }, "ci-admin");
    await detachMedia("product", product.id, media.id, "ci-admin");
    expect(await prisma.variantMedia.count({ where: { variantId: variant.id, mediaId: media.id } })).toBe(1);
    expect(await prisma.mediaAsset.findUnique({ where: { id: media.id } })).toMatchObject({ state: "APPROVED" });
    await createVariant(product.id, { sku: `CI-BACKEND-ALT-${token}`, sizeLabel: "Large", colorLabel: "Red", regularPriceMinor: 120000 }, "ci-admin");
    await updateVariant(variant.id, { salePriceMinor: 100000 }, "ci-admin");
    expect(await prisma.productPriceHistory.count({ where: { variantId: variant.id } })).toBe(1);
    await updateProduct(product.id, { status: "PUBLISHED", featured: true }, "ci-admin");
    const adjusted = await adjustInventory({ variantId: variant.id, locationId, deltaOnHand: 3, reason: "Synthetic test receipt" }, "ci-admin");
    expect(adjusted.balance).toMatchObject({ onHand: 3, reserved: 0 });
    const query = new URLSearchParams({ category: parent.slug, color: "Blue", size: "Small", stock: "in", price: "under500", q: token });
    const listing = await listCatalog(query);
    expect(listing.products.map((item) => item.id)).toContain(product.id);
    expect(listing.total).toBe(1);
    expect(listing.products.find((item) => item.id === product.id)?.variants.find((item) => item.id === variant.id)?.stock).toBe(3);
    expect((await listCatalog(new URLSearchParams({ ...Object.fromEntries(query), color: "Red" }))).products).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: product.id })]));
    expect((await listCatalog(new URLSearchParams({ ...Object.fromEntries(query), size: "Large" }))).products).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: product.id })]));
    await prisma.inventoryBalance.update({ where: { variantId_locationId: { variantId: variant.id, locationId } }, data: { reserved: 2 } });
    await expect(adjustInventory({ variantId: variant.id, locationId, deltaOnHand: -2, reason: "Synthetic test shrink" }, "ci-admin")).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
    expect(await prisma.inventoryBalance.findUnique({ where: { variantId_locationId: { variantId: variant.id, locationId } } })).toMatchObject({ onHand: 3, reserved: 2 });
    expect(await prisma.inventoryMovement.count({ where: { variantId: variant.id, kind: "ADJUSTMENT" } })).toBe(1);
    expect(await prisma.auditEvent.count({ where: { action: "INVENTORY_ADJUSTED", targetId: variant.id } })).toBe(1);
    expect((await listAdminInventory()).locations).toEqual(expect.arrayContaining([expect.objectContaining({ id: locationId })]));
    expect((await listAuditEvents()).events).toEqual(expect.arrayContaining([expect.objectContaining({ action: "INVENTORY_ADJUSTED", targetId: variant.id })]));
    expect(await getAdminOrder(randomUUID())).toBeNull();
    const customerEmail = `catalog-${token}@example.test`;
    await prisma.customerProfile.create({ data: { authUserId: randomUUID(), normalizedEmail: customerEmail } });
    const customers = await listAdminCustomers(1, customerEmail);
    expect(customers.total).toBe(1);
    expect(customers.customers[0]).toMatchObject({ normalizedEmail: customerEmail, status: "ACTIVE" });
    const analytics = await salesAnalytics(null, null);
    expect(analytics.orders).toBeGreaterThanOrEqual(0);
    expect(analytics.definitions.collectedRevenue).toContain("PAID");
    expect(analytics.inventory.totalBalances).toBeGreaterThanOrEqual(1);
  });
});
else describe.skip("PostgreSQL backend catalog and inventory", () => { it("requires RUN_POSTGRES_INTEGRATION=true", () => {}); });
