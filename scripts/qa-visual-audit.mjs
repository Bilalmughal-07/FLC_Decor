import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const baseURL = process.env.QA_BASE_URL ?? "http://localhost:3000";
const outputDir = ".next-e2e/qa-audit";
const viewports = [
  [1440, 900],
  [1280, 800],
  [768, 1024],
  [390, 844],
  [360, 800],
];
const routes = [
  ["home", "/"],
  ["shop", "/shop"],
  ["collection", "/categories/wall-accents"],
  ["product", "/products/sunline-arch"],
  ["cart", "/cart"],
  ["checkout", "/checkout"],
  ["register", "/account/register"],
  ["login", "/account/login"],
  ["account", "/account"],
  ["tracking", "/track-order"],
  ["admin-login", "/admin/login"],
  ["admin", "/admin"],
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const [routeName, route] of routes) {
  for (const [width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height } });
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    let status = null;
    let finalURL = null;
    try {
      const response = await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle", timeout: 30_000 });
      status = response?.status() ?? null;
      finalURL = page.url();
      const metrics = await page.evaluate(() => {
        const overflow = [...document.querySelectorAll("body *")]
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.right > window.innerWidth + 1 || rect.left < -1;
          })
          .slice(0, 10)
          .map((element) => ({ tag: element.tagName, className: element.className, right: Math.round(element.getBoundingClientRect().right), left: Math.round(element.getBoundingClientRect().left) }));
        return {
          bodyScrollWidth: document.body.scrollWidth,
          viewportWidth: window.innerWidth,
          overflow,
          h1: document.querySelector("h1")?.textContent?.trim() ?? null,
          focused: document.activeElement?.tagName ?? null,
        };
      });
      await page.screenshot({ path: `${outputDir}/${routeName}-${width}.png`, fullPage: true });
      results.push({ route, routeName, width, height, status, finalURL, ...metrics, consoleErrors });
    } catch (error) {
      results.push({ route, routeName, width, height, status, finalURL, error: String(error), consoleErrors });
    } finally {
      await page.close();
    }
  }
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
