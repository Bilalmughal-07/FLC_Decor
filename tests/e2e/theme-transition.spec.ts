import { expect, test } from "@playwright/test";

async function recordThemeChanges(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const root = document.documentElement;
    const history = [root.dataset.theme ?? ""];
    (window as Window & { __flcThemeHistory?: string[] }).__flcThemeHistory = history;
    new MutationObserver(() => history.push(root.dataset.theme ?? "")).observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  });
}

async function themeHistory(page: import("@playwright/test").Page) {
  return page.evaluate(() => (window as Window & { __flcThemeHistory?: string[] }).__flcThemeHistory ?? []);
}

test.describe("ink bleed theme changer", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { if (!window.localStorage.getItem("flc-theme")) window.localStorage.setItem("flc-theme", "light"); });
  });

  test("reveals light over the dark base, uses the pointer origin, and persists", async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      if (!window.sessionStorage.getItem("flc-dark-transition-start")) {
        window.localStorage.setItem("flc-theme", "dark");
        window.sessionStorage.setItem("flc-dark-transition-start", "1");
      }
    });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await recordThemeChanges(page);
    await page.screenshot({ path: testInfo.outputPath("dark-to-light-start.png"), fullPage: false });

    const toggle = page.getByRole("button", { name: /switch to light theme/i });
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-ink-phase", "revealing", { timeout: 5_000 });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("html")).toHaveAttribute("data-ink-origin", /\d+,\d+/);
    await page.screenshot({ path: testInfo.outputPath("dark-to-light-middle.png"), fullPage: false });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 5_000 });
    await page.screenshot({ path: testInfo.outputPath("dark-to-light-end.png"), fullPage: false });
    await expect.poll(() => themeHistory(page)).toEqual(["dark", "light"]);
    expect(await page.evaluate(() => window.localStorage.getItem("flc-theme"))).toBe("light");
    await page.goto("/shop");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("reveals dark over the light base without a reversal", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await recordThemeChanges(page);
    await page.screenshot({ path: testInfo.outputPath("light-to-dark-start.png"), fullPage: false });
    await page.getByRole("button", { name: /switch to dark theme/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-ink-phase", "revealing", { timeout: 5_000 });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.screenshot({ path: testInfo.outputPath("light-to-dark-middle.png"), fullPage: false });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark", { timeout: 5_000 });
    await page.screenshot({ path: testInfo.outputPath("light-to-dark-end.png"), fullPage: false });
    await expect.poll(() => themeHistory(page)).toEqual(["light", "dark"]);
    expect(await page.evaluate(() => window.localStorage.getItem("flc-theme"))).toBe("dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("covers every viewport corner and center from the requested origin", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-ink", /webgl|css/);
    const viewport = page.viewportSize();
    if (!viewport) throw new Error("VIEWPORT_REQUIRED");
    const points = [
      { x: 1, y: 1 },
      { x: viewport.width - 1, y: 1 },
      { x: Math.floor(viewport.width / 2), y: Math.floor(viewport.height / 2) },
      { x: 1, y: viewport.height - 1 },
      { x: viewport.width - 1, y: viewport.height - 1 },
    ];
    for (const point of points) {
      const from = await page.locator("html").getAttribute("data-theme");
      const to = from === "dark" ? "light" : "dark";
      await page.evaluate((detail) => {
        window.dispatchEvent(new CustomEvent("flc-theme-toggle", { cancelable: true, detail: { point: detail } }));
      }, point);
      await expect(page.locator("html")).toHaveAttribute("data-ink-origin", `${point.x},${point.y}`);
      await expect(page.locator("html")).toHaveAttribute("data-theme", to, { timeout: 5_000 });
    }
  });

  test("ignores rapid repeated toggles while a reveal is active", async ({ page }) => {
    await page.goto("/");
    await recordThemeChanges(page);
    const toggle = page.locator("[data-theme-toggle]");
    await toggle.click();
    await toggle.dispatchEvent("click");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark", { timeout: 5_000 });
    await expect.poll(() => themeHistory(page)).toEqual(["light", "dark"]);
  });

  test("uses the captured-image CSS fallback when WebGL2 is unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        if (kind === "webgl2") return null;
        return original.call(this, kind, ...(args as []));
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-ink", "css");
    await page.getByRole("button", { name: /switch to dark theme/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-ink-phase", "revealing", { timeout: 5_000 });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator(".ink-theme-fallback")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark", { timeout: 5_000 });
    await expect(page.locator(".ink-theme-fallback")).toHaveCount(0, { timeout: 2_000 });
  });

  test("switches immediately for reduced-motion users", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: /switch to dark theme/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator(".ink-theme-fallback")).toHaveCount(0);
  });

  test("uses the system preference only when no manual preference exists", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => { if (!window.sessionStorage.getItem("flc-system-theme-test")) { window.localStorage.removeItem("flc-theme"); window.sessionStorage.setItem("flc-system-theme-test", "1"); } });
    await page.goto("/shop");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: /switch to light theme/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 5_000 });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});
