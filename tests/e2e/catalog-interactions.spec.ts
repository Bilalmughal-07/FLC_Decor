import { expect, test } from "@playwright/test";

test("catalog filters follow the URL and survive refresh", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop catalog toolbar coverage; mobile filter sheet is covered separately.");
  await page.goto("/shop");
  await page.getByLabel("Finish").selectOption("Sage");
  await expect(page).toHaveURL(/color=Sage/);
  await expect(page.getByRole("link", { name: "Sunline Arch", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Finish")).toHaveValue("Sage");
  await page.getByLabel("Search pieces").fill("no matching synthetic piece");
  await page.getByRole("button", { name: "Search products" }).click();
  await expect(page.getByRole("heading", { name: "Try a different combination." })).toBeVisible();
});

test("variant price and SKU synchronize with the persistent cart", async ({ page }) => {
  await page.goto("/products/sunline-arch");
  await page.getByRole("button", { name: /Sage.*30 in/ }).click();
  await expect(page.getByText("SKU DEMO-SUN-30-SA")).toBeVisible();
  await expect(page.locator(".price-large")).toContainText("7,599");
  await page.getByRole("button", { name: "Add to bag" }).click();
  await page.reload();
  await page.getByRole("button", { name: /open bag/i }).click();
  const bag = page.getByRole("dialog", { name: "Your bag" });
  await expect(bag).toContainText("Sage");
  await expect(bag).toContainText("7,599");
  await bag.getByRole("button", { name: "Close bag" }).click();
  await page.getByRole("button", { name: /enlarge sunline arch/i }).click();
  await expect(page.getByRole("dialog", { name: /sunline arch image gallery/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /sunline arch image gallery/i })).toHaveCount(0);
});
