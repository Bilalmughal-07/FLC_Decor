import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("homepage has no automated axe violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
