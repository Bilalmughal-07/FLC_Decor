import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { hashPassword, normalizeAuthEmail, sessionCookieName, verifyPasswordHash, type AdminPermission } from "@/lib/auth";
import { openAuthSecret, sealAuthSecret } from "@/lib/auth-crypto";
import { DomainError } from "@/lib/backend-validation";

export const initialAdminPermissions: AdminPermission[] = ["catalog.read", "catalog.write", "inventory.read", "inventory.adjust", "orders.read", "orders.transition", "customers.read", "audit.read", "analytics.read", "notifications.read", "notifications.retry"];
const bootstrapMarker = "auth.initial_admin_bootstrap";
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;

function sha256(value: string) { return createHash("sha256").update(value).digest("hex"); }
function parseSessionToken(request: Request) { return request.headers.get("cookie")?.split(";").map((item) => item.trim().split("=")).find(([name]) => name === sessionCookieName)?.[1] ?? null; }
function persistentAuthEnabled() { return process.env.ADMIN_AUTH_RUNTIME === "database" && Boolean(process.env.DATABASE_URL); }
function validAdminPassword(password: string) { return password.length >= 16 && password.length <= 256; }
function localDatabase(urlText: string) { try { const url = new URL(urlText); return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname); } catch { return false; } }

export async function bootstrapInitialAdmin(environment: Readonly<Record<string, string | undefined>> = process.env) {
  if (environment.NODE_ENV === "production" || environment.ADMIN_BOOTSTRAP_ENABLED !== "true" || environment.ADMIN_BOOTSTRAP_ENV !== "local-development" || environment.ADMIN_BOOTSTRAP_CONFIRM !== "INITIAL_ADMIN_SETUP") throw new DomainError("BOOTSTRAP_NOT_AUTHORIZED", "Initial administrator bootstrap is not explicitly authorized for local development.", 403);
  if (!environment.DATABASE_URL || !localDatabase(environment.DATABASE_URL)) throw new DomainError("BOOTSTRAP_DATABASE_REJECTED", "Initial administrator bootstrap requires a loopback PostgreSQL database.", 403);
  if (environment.ADMIN_AUTH_RUNTIME !== "database") throw new DomainError("ADMIN_AUTH_NOT_CONFIGURED", "Set ADMIN_AUTH_RUNTIME=database before bootstrap.", 503);
  const email = normalizeAuthEmail(environment.INITIAL_ADMIN_EMAIL ?? "");
  const password = environment.INITIAL_ADMIN_PASSWORD ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !validAdminPassword(password)) throw new DomainError("BOOTSTRAP_CREDENTIALS_INVALID", "Provide a valid email and a password of at least 16 characters.", 400);
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    // Prisma's PostgreSQL adapter cannot deserialize PostgreSQL's void type,
    // so cast the advisory-lock result while retaining transaction scope.
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(728441902)::text AS lock_result`);
    const [marker, legacyAdminCount, assignedAdminCount] = await Promise.all([
      tx.systemSetting.findUnique({ where: { key: bootstrapMarker } }),
      tx.user.count({ where: { role: "ADMIN" } }),
      tx.userRole.count({ where: { revokedAt: null, role: { code: { in: ["ADMIN", "OWNER"] } } } }),
    ]);
    if (marker || legacyAdminCount > 0 || assignedAdminCount > 0) throw new DomainError("BOOTSTRAP_ALREADY_COMPLETED", "An administrator already exists; bootstrap is permanently disabled.", 409);
    const role = await tx.role.upsert({ where: { code: "ADMIN" }, create: { code: "ADMIN", description: "Administrative catalog, inventory, order-read, audit and dashboard access" }, update: { description: "Administrative catalog, inventory, order-read, audit and dashboard access" } });
    const permissions = [];
    for (const code of initialAdminPermissions) permissions.push(await tx.permission.upsert({ where: { code }, create: { code, description: code }, update: {} }));
    await tx.rolePermission.deleteMany({ where: { roleId: role.id, permissionId: { notIn: permissions.map((permission) => permission.id) } } });
    await tx.rolePermission.createMany({ data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })), skipDuplicates: true });
    const user = await tx.user.create({ data: { email, passwordHash: hashPassword(password), role: "ADMIN", status: "ACTIVE" } });
    await tx.userRole.create({ data: { authUserId: user.id, roleId: role.id, grantedBy: user.id } });
    await tx.systemSetting.create({ data: { key: bootstrapMarker, value: { completedAt: new Date().toISOString(), adminUserId: user.id }, changedBy: user.id } });
    await tx.auditEvent.create({ data: { actorType: "SYSTEM", actorId: user.id, action: "INITIAL_ADMIN_BOOTSTRAPPED", targetType: "USER", targetId: user.id, safeMetadata: { role: "ADMIN", permissionCount: initialAdminPermissions.length, localOnly: true } } });
    return { id: user.id, email: user.email, permissions: initialAdminPermissions };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
}

export async function loginPersistentAdmin(email: string, password: string) {
  if (!persistentAuthEnabled()) return { kind: "disabled" as const };
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email: normalizeAuthEmail(email) } });
  const valid = user?.status === "ACTIVE" && user.role === "ADMIN" && verifyPasswordHash(password, user.passwordHash);
  if (!valid || !user) return { kind: "invalid" as const };
  const assignment = await prisma.userRole.findFirst({ where: { authUserId: user.id, revokedAt: null, role: { code: { in: ["ADMIN", "OWNER"] } } } });
  if (!assignment) return { kind: "invalid" as const };
  const token = randomBytes(32).toString("base64url");
  const factor = await prisma.mfaFactor.findUnique({ where: { userId_kind: { userId: user.id, kind: "TOTP" } } });
  await prisma.$transaction([
    prisma.session.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + sessionLifetimeMs) } }),
    prisma.auditEvent.create({ data: { actorType: "ADMIN", actorId: user.id, action: "ADMIN_PASSWORD_AUTHENTICATED", targetType: "SESSION" } }),
  ]);
  return { kind: "authenticated" as const, user, token, mfaEnrollmentRequired: !factor?.enabledAt };
}

async function loginSession(request: Request) {
  if (!persistentAuthEnabled()) return null;
  const token = parseSessionToken(request);
  if (!token) return null;
  const prisma = getPrisma();
  const session = await prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== "ACTIVE" || session.user.role !== "ADMIN") {
    if (session && !session.revokedAt) await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } }).catch(() => undefined);
    return null;
  }
  return session;
}

function base32Encode(buffer: Buffer) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = ""; for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let result = ""; for (let offset = 0; offset < bits.length; offset += 5) result += alphabet[Number.parseInt(bits.slice(offset, offset + 5).padEnd(5, "0"), 2)];
  return result;
}
function base32Decode(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let bits = "";
  for (const char of value.toUpperCase().replace(/=+$/, "")) { const index = alphabet.indexOf(char); if (index < 0) throw new Error("INVALID_TOTP_SECRET"); bits += index.toString(2).padStart(5, "0"); }
  const bytes = []; for (let offset = 0; offset + 8 <= bits.length; offset += 8) bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2)); return Buffer.from(bytes);
}
export function generateTotpCode(secret: string, timestamp = Date.now()) {
  const step = Math.floor(timestamp / 30_000); const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac("sha1", base32Decode(secret)).update(counter).digest(); const offset = digest[digest.length - 1] & 0x0f;
  return String(((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000)).padStart(6, "0");
}
function acceptedTotpStep(secret: string, code: string) {
  if (!/^\d{6}$/.test(code)) return null;
  const current = Math.floor(Date.now() / 30_000);
  for (const step of [current - 1, current, current + 1]) {
    const expected = generateTotpCode(secret, step * 30_000);
    if (timingSafeEqual(Buffer.from(code), Buffer.from(expected))) return BigInt(step);
  }
  return null;
}

export async function enrollPersistentAdminMfa(request: Request) {
  const session = await loginSession(request);
  if (!session) throw new DomainError("UNAUTHORIZED", "Sign in with an administrator password first.", 401);
  const prisma = getPrisma();
  const current = await prisma.mfaFactor.findUnique({ where: { userId_kind: { userId: session.userId, kind: "TOTP" } } });
  if (current?.enabledAt) return { alreadyEnrolled: true as const };
  const candidateSecret = base32Encode(randomBytes(20));
  const factor = current ?? await prisma.mfaFactor.upsert({
    where: { userId_kind: { userId: session.userId, kind: "TOTP" } },
    create: { userId: session.userId, kind: "TOTP", secretCiphertext: sealAuthSecret(candidateSecret), keyVersion: "v1" },
    update: {},
  });
  const secret = openAuthSecret(factor.secretCiphertext);
  const issuer = "FLC Decor";
  const uri = `otpauth://totp/${encodeURIComponent(`${issuer}:${session.user.email}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  return { alreadyEnrolled: false as const, secret, otpauthUri: uri };
}

function recoveryCodes() { return Array.from({ length: 8 }, () => randomBytes(8).toString("hex")); }
export async function verifyPersistentAdminMfa(request: Request, code: string) {
  const session = await loginSession(request);
  if (!session) return { kind: "invalid" as const };
  const prisma = getPrisma();
  const factor = await prisma.mfaFactor.findUnique({ where: { userId_kind: { userId: session.userId, kind: "TOTP" } } });
  if (!factor) return { kind: "enrollment_required" as const };
  const normalized = code.trim().toLowerCase();
  if (/^[a-f0-9]{16}$/.test(normalized) && factor.enabledAt) {
    const recovery = await prisma.mfaRecoveryCode.findFirst({ where: { userId: session.userId, codeHash: sha256(normalized), usedAt: null } });
    if (!recovery) return { kind: "invalid" as const };
    const used = await prisma.mfaRecoveryCode.updateMany({ where: { id: recovery.id, usedAt: null }, data: { usedAt: new Date() } });
    if (used.count !== 1) return { kind: "invalid" as const };
    await prisma.$transaction([
      prisma.session.update({ where: { id: session.id }, data: { mfaVerifiedAt: new Date() } }),
      prisma.auditEvent.create({ data: { actorType: "ADMIN", actorId: session.userId, action: "ADMIN_MFA_RECOVERY_USED", targetType: "SESSION", targetId: session.id } }),
    ]);
    return { kind: "verified" as const, recoveryCodes: null };
  }
  const step = acceptedTotpStep(openAuthSecret(factor.secretCiphertext), normalized);
  if (step == null || (factor.lastAcceptedStep != null && step <= factor.lastAcceptedStep)) return { kind: "invalid" as const };
  const codes = factor.enabledAt ? null : recoveryCodes();
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const changed = await tx.mfaFactor.updateMany({ where: { id: factor.id, OR: [{ lastAcceptedStep: null }, { lastAcceptedStep: { lt: step } }] }, data: { lastAcceptedStep: step, enabledAt: factor.enabledAt ?? now } });
    if (changed.count !== 1) return false;
    if (codes) {
      await tx.mfaRecoveryCode.deleteMany({ where: { userId: session.userId, usedAt: null } });
      await tx.mfaRecoveryCode.createMany({ data: codes.map((recoveryCode) => ({ userId: session.userId, codeHash: sha256(recoveryCode) })) });
    }
    await tx.session.update({ where: { id: session.id }, data: { mfaVerifiedAt: now } });
    await tx.auditEvent.create({ data: { actorType: "ADMIN", actorId: session.userId, action: factor.enabledAt ? "ADMIN_MFA_VERIFIED" : "ADMIN_MFA_ENROLLED", targetType: "SESSION", targetId: session.id } });
    return true;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return result ? { kind: "verified" as const, recoveryCodes: codes } : { kind: "invalid" as const };
}

export async function requirePersistentAdminPermission(request: Request, permission: AdminPermission) {
  const session = await loginSession(request);
  if (!session?.mfaVerifiedAt) return null;
  const assignments = await getPrisma().userRole.findMany({ where: { authUserId: session.userId, revokedAt: null }, include: { role: { include: { permissions: { include: { permission: true } } } } } });
  const permissions = new Set(assignments.flatMap((assignment) => assignment.role.permissions.map((entry) => entry.permission.code)));
  return permissions.has(permission) ? { user: session.user, sessionId: session.id, mfaVerified: true as const, permissions } : null;
}

export async function currentPersistentAdminSession(request: Request) {
  const session = await loginSession(request);
  return session ? { user: session.user, mfaVerified: Boolean(session.mfaVerifiedAt), sessionId: session.id } : null;
}

export async function logoutPersistentAdmin(request: Request) {
  const token = parseSessionToken(request);
  if (!token || !persistentAuthEnabled()) return;
  const prisma = getPrisma();
  const session = await prisma.session.findUnique({ where: { tokenHash: sha256(token) } });
  if (!session || session.revokedAt) return;
  await prisma.$transaction([
    prisma.session.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.auditEvent.create({ data: { actorType: "ADMIN", actorId: session.userId, action: "ADMIN_SESSION_REVOKED", targetType: "SESSION", targetId: session.id } }),
  ]);
}
