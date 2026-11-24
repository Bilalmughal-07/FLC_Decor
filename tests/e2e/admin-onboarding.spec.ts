import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { bootstrapInitialAdmin, generateTotpCode } from "@/lib/admin-auth";
import { getPrisma } from "@/lib/prisma";

test("initial admin can enroll MFA, use protected modules, and revoke the session", async ({ page }, testInfo) => {
  test.skip(process.env.RUN_ADMIN_E2E !== "true" || testInfo.project.name !== "desktop", "Requires the isolated admin E2E flag and desktop browser.");
  test.setTimeout(90_000);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Isolated test DATABASE_URL is required.");
  const target = new URL(databaseUrl);
  if (target.hostname !== "127.0.0.1" || target.port !== "5433" || target.pathname !== "/flcdecor_test") throw new Error("Refusing admin E2E outside flcdecor_test.");

  const prisma = getPrisma();
  const markerKey = "auth.initial_admin_bootstrap";
  const email = `admin-browser-${randomUUID()}@example.test`;
  const password = `Synthetic-browser-${randomUUID()}!`;
  let adminId: string | null = null;

  async function cleanup() {
    if (!adminId) return;
    const marker = await prisma.systemSetting.findUnique({ where: { key: markerKey } });
    const markerValue = marker?.value as { adminUserId?: string } | null;
    if (markerValue?.adminUserId === adminId) await prisma.systemSetting.delete({ where: { key: markerKey } });
    await prisma.userRole.deleteMany({ where: { authUserId: adminId } });
    await prisma.auditEvent.deleteMany({ where: { actorId: adminId } });
    await prisma.user.deleteMany({ where: { id: adminId, email } });
  }

  try {
    const created = await bootstrapInitialAdmin({ ...process.env, NODE_ENV: "test", ADMIN_AUTH_RUNTIME: "database", ADMIN_BOOTSTRAP_ENABLED: "true", ADMIN_BOOTSTRAP_ENV: "local-development", ADMIN_BOOTSTRAP_CONFIRM: "INITIAL_ADMIN_SETUP", INITIAL_ADMIN_EMAIL: email, INITIAL_ADMIN_PASSWORD: password });
    adminId = created.id;

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Continue to MFA" }).click();
    await expect(page).toHaveURL(/\/admin\/mfa\/enroll$/);
    await expect(page.getByTestId("mfa-secret")).toBeVisible({ timeout: 15_000 });
    const secret = await page.getByTestId("mfa-secret").innerText();
    await page.getByLabel("6-digit authenticator code").fill(generateTotpCode(secret));
    await page.getByRole("button", { name: "Enable MFA" }).click();
    await expect(page.getByRole("heading", { name: "Save your recovery codes." })).toBeVisible();
    await expect(page.locator("[aria-label='MFA recovery codes'] code")).toHaveCount(8);
    await page.getByRole("button", { name: "I have saved these codes" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Control the details." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Product media" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Control the details." })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
    expect(await prisma.session.count({ where: { userId: adminId, revokedAt: { not: null } } })).toBe(1);
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
});
