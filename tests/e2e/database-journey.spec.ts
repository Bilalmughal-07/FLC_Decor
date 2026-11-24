import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { getPrisma } from "@/lib/prisma";

test("PostgreSQL catalog to demo COD reservation through the browser", async ({ page }, testInfo) => {
  test.skip(process.env.RUN_POSTGRES_E2E !== "true" || testInfo.project.name !== "desktop", "Requires the isolated PostgreSQL E2E flag and desktop browser.");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Isolated test DATABASE_URL is required.");
  const target = new URL(databaseUrl);
  if (target.hostname !== "127.0.0.1" || target.port !== "5433" || target.pathname !== "/flcdecor_test") throw new Error("Refusing PostgreSQL E2E outside flcdecor_test.");
  test.setTimeout(90_000);
  const prisma = getPrisma();
  const suffix = randomUUID().slice(0, 8);
  const locationId = "00000000-0000-4000-8000-000000000001";
  const category = await prisma.category.create({ data: { name: `Browser Test ${suffix}`, slug: `browser-cat-${suffix}` } });
  const product = await prisma.product.create({ data: { name: `Browser Piece ${suffix}`, slug: `browser-piece-${suffix}`, description: "Synthetic browser test product", primaryCategoryId: category.id, status: "PUBLISHED", publishedAt: new Date() } });
  const variant = await prisma.variant.create({ data: { productId: product.id, sku: `BROWSER-${suffix}`, sizeLabel: "Medium", colorLabel: "Brass", regularPriceMinor: 123400, availableQty: 1 } });
  await prisma.inventoryBalance.create({ data: { variantId: variant.id, locationId, onHand: 1, reserved: 0 } });
  try {
    await page.goto(`/shop?q=${encodeURIComponent(suffix)}`);
    await expect(page.getByRole("link", { name: product.name, exact: true })).toBeVisible();
    await page.getByRole("link", { name: product.name, exact: true }).click();
    await expect(page.getByRole("heading", { name: product.name })).toBeVisible();
    await expect(page.getByText(variant.sku)).toBeVisible();
    await page.getByRole("button", { name: "Add to bag" }).click();
    await page.getByRole("button", { name: /open bag/i }).click();
    await page.getByRole("dialog", { name: "Your bag" }).getByRole("link", { name: "View bag" }).click();
    await page.getByRole("link", { name: /continue to checkout/i }).click();
    await expect(page.getByText("Synthetic demo total")).toBeVisible();
    await page.getByLabel("Full name", { exact: true }).fill("Synthetic Browser Customer");
    await page.getByLabel("Email address", { exact: true }).fill(`browser-${suffix}@example.test`);
    await page.getByLabel("Phone number", { exact: true }).fill("03000000002");
    await page.getByLabel("Address", { exact: true }).fill("Synthetic Test Address");
    await page.getByLabel("City", { exact: true }).fill("Synthetic City");
    await page.getByRole("button", { name: /place demo cod order/i }).click();
    await expect(page).toHaveURL(/\/order\/success\//, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Your order has been received." })).toBeVisible();
    const number = decodeURIComponent(new URL(page.url()).pathname.split("/").at(-1)!);
    const order = await prisma.order.findUnique({ where: { publicOrderNumber: number }, include: { items: true, reservations: true } });
    expect(order?.items).toHaveLength(1);
    expect(order?.reservations).toMatchObject([{ variantId: variant.id, quantity: 1, state: "ACTIVE" }]);
    expect(await prisma.inventoryBalance.findUnique({ where: { variantId_locationId: { variantId: variant.id, locationId } } })).toMatchObject({ onHand: 1, reserved: 1 });
  } finally { await prisma.$disconnect(); }
});

test("local customer can save an encrypted PostgreSQL profile and address", async ({ page }, testInfo) => {
  test.skip(process.env.RUN_POSTGRES_E2E !== "true" || testInfo.project.name !== "desktop", "Requires the isolated PostgreSQL E2E flag and desktop browser.");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Isolated test DATABASE_URL is required.");
  const target = new URL(databaseUrl);
  if (target.hostname !== "127.0.0.1" || target.port !== "5433" || target.pathname !== "/flcdecor_test") throw new Error("Refusing PostgreSQL E2E outside flcdecor_test.");
  const prisma = getPrisma();
  const suffix = randomUUID().slice(0, 8);
  const email = `browser-account-${suffix}@example.test`;
  try {
    await page.goto("/account/register");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("synthetic-test-password-123");
    await page.getByLabel("Confirm password", { exact: true }).fill("synthetic-test-password-123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
    await page.getByLabel("Display name").fill("Synthetic Account Owner");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByRole("status").getByText("Profile updated.")).toBeVisible();
    await page.getByLabel("First name").fill("Synthetic");
    await page.getByLabel("Last name").fill("Account");
    await page.getByLabel("Address", { exact: true }).fill("Synthetic Encrypted Lane");
    await page.getByLabel("City").fill("Test City");
    await page.getByLabel("Phone").fill("03000000003");
    await page.getByRole("button", { name: "Save address" }).click();
    await expect(page.getByText("Synthetic Encrypted Lane, Test City")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Display name")).toHaveValue("Synthetic Account Owner");
    const profile = await prisma.customerProfile.findFirst({ where: { normalizedEmail: email }, include: { addresses: true } });
    expect(profile).toBeTruthy();
    expect(profile?.displayName).not.toContain("Synthetic Account Owner");
    expect(profile?.addresses).toHaveLength(1);
    expect(profile?.addresses[0].address1).toBe("ENCRYPTED");
    expect(profile?.addresses[0].privateDataCiphertext).not.toContain("Synthetic Encrypted Lane");
  } finally { await prisma.$disconnect(); }
});
