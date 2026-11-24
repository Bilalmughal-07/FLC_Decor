import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const baseURL = process.env.QA_BASE_URL ?? "http://localhost:3000";
const outputDir = ".next-e2e/theme-audit";
const viewports = [[1440, 900], [768, 1024], [390, 844], [360, 800]];
const routes = [["home", "/"], ["shop", "/shop"], ["product", "/products/sunline-arch"], ["cart", "/cart"], ["checkout", "/checkout"]];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
for (const [routeName, route] of routes) {
  for (const [width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.addInitScript(() => window.localStorage.setItem("flc-theme", "light"));
      await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle", timeout: 30_000 });
      await page.screenshot({ path: `${outputDir}/${routeName}-${width}-light.png`, fullPage: true });
      await page.getByRole("button", { name: /switch to dark theme/i }).click();
      await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
      await page.waitForTimeout(650);
      await page.screenshot({ path: `${outputDir}/${routeName}-${width}-dark.png`, fullPage: true });
      results.push({ route, width, light: true, dark: true, renderer: await page.locator("html").getAttribute("data-ink"), errors });
    } catch (error) {
      results.push({ route, width, error: String(error), errors });
    } finally {
      await page.close();
    }
  }
}
await browser.close();
console.log(JSON.stringify({ outputDir, results }, null, 2));
if (results.some((result) => result.error || result.errors.length)) process.exitCode = 1;
