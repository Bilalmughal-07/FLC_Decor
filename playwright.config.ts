import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true } },
  ],
  webServer: { command: "npm run dev -- -p 3100", url: "http://127.0.0.1:3100", reuseExistingServer: false, timeout: 120_000, env: { DEMO_CHECKOUT_ENABLED: "true", AUTH_RUNTIME: "demo", ADMIN_AUTH_RUNTIME: "demo", CHECKOUT_RUNTIME: "demo" } },
});
