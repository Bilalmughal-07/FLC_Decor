import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { bootstrapInitialAdmin, generateTotpCode, requirePersistentAdminPermission } from "@/lib/admin-auth";
import { getPrisma } from "@/lib/prisma";
import { POST as login } from "@/app/api/admin/auth/login/route";
import { POST as enrollMfa } from "@/app/api/admin/auth/mfa/enroll/route";
import { POST as verifyMfa } from "@/app/api/admin/auth/mfa/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as dashboard } from "@/app/api/admin/dashboard/route";
import { GET as mediaManager } from "@/app/api/admin/media/route";

const enabled = process.env.RUN_POSTGRES_INTEGRATION === "true";
const describeDatabase = enabled ? describe : describe.skip;

describeDatabase("PostgreSQL initial administrator onboarding", () => {
  const prisma = getPrisma();
  const email = `admin-flow-${randomUUID()}@example.test`;
  const password = `Synthetic-only-${randomUUID()}!`;
  const markerKey = "auth.initial_admin_bootstrap";
  const previous = {
    runtime: process.env.ADMIN_AUTH_RUNTIME,
    encryptionKey: process.env.AUTH_FIELD_ENCRYPTION_KEY,
  };
  let adminId: string | null = null;
  let cookie = "";

  async function cleanSyntheticBootstrap() {
    const marker = await prisma.systemSetting.findUnique({ where: { key: markerKey } });
    const value = marker?.value as { adminUserId?: string } | null;
    if (value?.adminUserId) {
      const markedUser = await prisma.user.findUnique({ where: { id: value.adminUserId } });
      if (markedUser?.email.startsWith("admin-flow-") && markedUser.email.endsWith("@example.test")) {
        await prisma.systemSetting.delete({ where: { key: markerKey } });
        await prisma.userRole.deleteMany({ where: { authUserId: markedUser.id } });
        await prisma.auditEvent.deleteMany({ where: { actorId: markedUser.id } });
        await prisma.user.delete({ where: { id: markedUser.id } });
      }
    }
  }

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    const expectedPort = process.env.LOCAL_POSTGRES_TEST_PORT ?? "5433";
    if (url.hostname !== "127.0.0.1" || url.port !== expectedPort || url.pathname !== "/flcdecor_test") throw new Error("Admin auth integration tests require the isolated flcdecor_test database.");
    process.env.ADMIN_AUTH_RUNTIME = "database";
    process.env.AUTH_FIELD_ENCRYPTION_KEY = "7f8e9d0c1b2a394857665544332211007f8e9d0c1b2a39485766554433221100";
    await cleanSyntheticBootstrap();
  });

  afterAll(async () => {
    await cleanSyntheticBootstrap();
    process.env.ADMIN_AUTH_RUNTIME = previous.runtime;
    process.env.AUTH_FIELD_ENCRYPTION_KEY = previous.encryptionKey;
    await prisma.$disconnect();
  });

  it("bootstraps exactly one least-privilege administrator and permanently refuses a rerun", async () => {
    const environment = {
      ...process.env,
      NODE_ENV: "test",
      ADMIN_AUTH_RUNTIME: "database",
      ADMIN_BOOTSTRAP_ENABLED: "true",
      ADMIN_BOOTSTRAP_ENV: "local-development",
      ADMIN_BOOTSTRAP_CONFIRM: "INITIAL_ADMIN_SETUP",
      INITIAL_ADMIN_EMAIL: email,
      INITIAL_ADMIN_PASSWORD: password,
    };
    const created = await bootstrapInitialAdmin(environment);
    adminId = created.id;
    expect(created.email).toBe(email);
    expect(created.permissions).toEqual(expect.arrayContaining(["catalog.write", "inventory.adjust", "orders.read"]));
    expect(created.permissions).not.toContain("payments.reconcile");
    await expect(bootstrapInitialAdmin(environment)).rejects.toMatchObject({ code: "BOOTSTRAP_ALREADY_COMPLETED" });
    expect(await prisma.user.count({ where: { email } })).toBe(1);
    expect(await prisma.auditEvent.count({ where: { actorId: created.id, action: "INITIAL_ADMIN_BOOTSTRAPPED" } })).toBe(1);
  });

  it("logs in, enrolls MFA, verifies permissions, and reaches dashboard and media manager", async () => {
    const denied = await login(new Request("http://localhost/api/admin/auth/login", { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify({ email, password: `${password}-wrong` }) }));
    expect(denied.status).toBe(401);

    const loginResponse = await login(new Request("http://localhost/api/admin/auth/login", { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify({ email, password }) }));
    expect(loginResponse.status).toBe(200);
    expect(await loginResponse.json()).toMatchObject({ mfaRequired: true, mfaEnrollmentRequired: true });
    cookie = loginResponse.headers.get("set-cookie")?.split(";")[0] ?? "";
    expect(cookie).toContain("flc_session=");

    const beforeMfa = await dashboard(new Request("http://localhost/api/admin/dashboard", { headers: { cookie } }));
    expect(beforeMfa.status).toBe(401);

    const enrollmentResponse = await enrollMfa(new Request("http://localhost/api/admin/auth/mfa/enroll", { method: "POST", headers: { cookie, origin: "http://localhost" } }));
    expect(enrollmentResponse.status).toBe(200);
    const enrollment = await enrollmentResponse.json() as { secret: string; otpauthUri: string };
    expect(enrollment.otpauthUri).toContain("otpauth://totp/");

    const verificationResponse = await verifyMfa(new Request("http://localhost/api/admin/auth/mfa", { method: "POST", headers: { cookie, origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify({ code: generateTotpCode(enrollment.secret) }) }));
    expect(verificationResponse.status).toBe(200);
    const verification = await verificationResponse.json() as { recoveryCodes: string[] };
    expect(verification.recoveryCodes).toHaveLength(8);
    expect(await prisma.mfaRecoveryCode.count({ where: { userId: adminId ?? "" } })).toBe(8);

    const request = new Request("http://localhost/api/admin/dashboard", { headers: { cookie } });
    expect(await requirePersistentAdminPermission(request, "orders.read")).not.toBeNull();
    expect(await requirePersistentAdminPermission(request, "payments.reconcile")).toBeNull();
    expect((await dashboard(request)).status).toBe(200);
    expect((await mediaManager(new Request("http://localhost/api/admin/media", { headers: { cookie } }))).status).toBe(200);
  });

  it("revokes the database session on logout", async () => {
    const response = await logout(new Request("http://localhost/api/auth/logout", { method: "POST", headers: { cookie, origin: "http://localhost" } }));
    expect(response.status).toBe(200);
    expect((await dashboard(new Request("http://localhost/api/admin/dashboard", { headers: { cookie } }))).status).toBe(401);
    expect(await prisma.session.count({ where: { userId: adminId ?? "", revokedAt: { not: null } } })).toBe(1);
  });
});
