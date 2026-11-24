import { defineConfig, devices } from "@playwright/test";

const databaseE2E = process.env.RUN_POSTGRES_E2E === "true";
const adminE2E = process.env.RUN_ADMIN_E2E === "true";
if (databaseE2E || adminE2E) {
  const url = process.env.DATABASE_URL && new URL(process.env.DATABASE_URL);
  if (!url || url.hostname !== "127.0.0.1" || url.port !== "5433" || url.pathname !== "/flcdecor_test") throw new Error("PostgreSQL browser tests require the isolated flcdecor_test database.");
}
if (adminE2E && !/^[0-9a-f]{64}$/i.test(process.env.AUTH_FIELD_ENCRYPTION_KEY ?? "")) throw new Error("Admin browser tests require a 32-byte AUTH_FIELD_ENCRYPTION_KEY.");

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true } },
  ],
  webServer: { command: "npm run dev -- -p 3100", url: "http://127.0.0.1:3100", reuseExistingServer: false, timeout: 120_000, env: { NEXT_BUILD_DIR: ".next-e2e", DEMO_CHECKOUT_ENABLED: "true", AUTH_RUNTIME: "demo", ADMIN_AUTH_RUNTIME: adminE2E ? "database" : "demo", CHECKOUT_RUNTIME: databaseE2E ? "database" : "demo", CATALOG_RUNTIME: databaseE2E || adminE2E ? "database" : "sample", ...(databaseE2E ? { CHECKOUT_TOTALS_MODE: "synthetic-zero", CHECKOUT_FIELD_ENCRYPTION_KEY: process.env.CHECKOUT_FIELD_ENCRYPTION_KEY ?? "" } : {}), ...(adminE2E ? { AUTH_FIELD_ENCRYPTION_KEY: process.env.AUTH_FIELD_ENCRYPTION_KEY ?? "" } : {}) } },
});
