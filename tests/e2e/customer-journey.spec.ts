import { expect, test } from "@playwright/test";

test("customer can browse, select a variant, use cart, and complete labeled demo COD", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /turn your walls into a statement/i })).toBeVisible();
  await page.getByRole("link", { name: /explore the collection/i }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await page.getByRole("link", { name: "Sunline Arch", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sunline Arch" })).toBeVisible();
  await page.getByRole("button", { name: "Add to bag" }).click();
  await page.getByRole("link", { name: /cart/i }).click();
  await expect(page.getByRole("heading", { name: "Sunline Arch", exact: true })).toBeVisible();
  await page.getByRole("link", { name: /continue to checkout/i }).click();
  await page.getByLabel("Full name", { exact: true }).fill("Synthetic Playwright Buyer");
  await page.getByLabel("Email address", { exact: true }).fill("playwright@example.test");
  await page.getByLabel("Phone number", { exact: true }).fill("03000000000");
  await page.getByLabel("Address", { exact: true }).fill("Synthetic Demo Street");
  await page.getByLabel("City", { exact: true }).fill("Synthetic City");
  await page.getByRole("button", { name: /place demo cod order/i }).click();
  await expect(page).toHaveURL(/\/order\/success\//);
  await expect(page.getByRole("heading", { name: "Your order has been received.", exact: true })).toBeVisible();
});

test("guest tracking does not disclose order data before verification", async ({ page }) => {
  await page.goto("/track-order");
  await page.getByLabel("Order number").fill("FL-2026-UNKNOWN");
  await page.getByLabel("Order email").fill("guest@example.test");
  await page.getByRole("button", { name: /request secure verification/i }).click();
  await expect(page.getByText(/no order existence is disclosed/i)).toBeVisible();
});
