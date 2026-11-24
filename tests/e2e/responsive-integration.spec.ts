import { expect, test } from "@playwright/test";

test("shared layouts fit 390, 768, 1024 and 1440 pixel viewports", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "One browser project covers all requested viewport widths.");
  test.setTimeout(120_000);
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/shop", "/products/sunline-arch", "/cart", "/checkout"]) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} at ${width}px overflows by ${overflow}px`).toBeLessThanOrEqual(1);
    }
  }
});

test("mobile menu, filters, bag drawer and product lightbox are keyboard accessible", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile interaction coverage.");
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open menu" });
  await menu.click();
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Shop" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  await page.goto("/shop");
  await page.getByRole("button", { name: "Filter and sort" }).click();
  await expect(page.getByRole("dialog", { name: "Filter and sort products" })).toBeVisible();
  await expect(page.getByText("Refine the collection")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Filter and sort products" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Filter and sort" })).toBeFocused();
  await page.goto("/products/sunline-arch");
  await page.getByRole("button", { name: /enlarge sunline arch/i }).click();
  await expect(page.getByRole("dialog", { name: /sunline arch image gallery/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /sunline arch image gallery/i })).toHaveCount(0);
  await page.getByRole("button", { name: /open bag/i }).click();
  await expect(page.getByRole("dialog", { name: "Your bag" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Your bag" })).toHaveCount(0);
});
