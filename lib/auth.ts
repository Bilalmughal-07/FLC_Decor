import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type AuthRole = "CUSTOMER" | "ADMIN";
export type AdminPermission = "catalog.read" | "catalog.write" | "inventory.read" | "inventory.adjust" | "orders.read" | "orders.transition" | "customers.read" | "payments.reconcile" | "audit.read" | "analytics.read" | "settings.manage" | "notifications.read" | "notifications.retry";
export type AuthUser = { id: string; email: string; passwordHash: string; role: AuthRole; mfaSecret?: string; mfaEnabled: boolean; lastTotpStep?: number; recoveryCodeHashes: string[]; createdAt: string };
type Session = { userId: string; expiresAt: number; mfaVerified: boolean };
type AuthState = { users: Map<string, AuthUser>; sessions: Map<string, Session>; resetTokens: Map<string, { userId: string; expiresAt: number }>; attempts: Map<string, { count: number; resetAt: number }> };
const runtime = globalThis as typeof globalThis & { __flcAuthState?: AuthState };
const state = runtime.__flcAuthState ?? (runtime.__flcAuthState = { users: new Map(), sessions: new Map(), resetTokens: new Map(), attempts: new Map() });
export const sessionCookieName = "flc_session";

function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
function randomId() { return randomBytes(16).toString("hex"); }
function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
function failClosed() { return process.env.NODE_ENV === "production" || process.env.AUTH_RUNTIME !== "demo"; }
export function hashPassword(password: string) { const salt = randomBytes(16); const derived = scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }); return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`; }
function verifyPassword(password: string, encoded: string) { const [, saltText, hashText] = encoded.split("$"); if (!saltText || !hashText) return false; const expected = Buffer.from(hashText, "base64url"); const actual = scryptSync(password, Buffer.from(saltText, "base64url"), expected.length, { N: 32768, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }); return actual.length === expected.length && timingSafeEqual(actual, expected); }
export function verifyPasswordHash(password: string, encoded: string) { return verifyPassword(password, encoded); }
function parseCookie(request: Request) { return request.headers.get("cookie")?.split(";").map((item) => item.trim().split("=")).find(([key]) => key === sessionCookieName)?.[1] ?? null; }
function sessionTokenHash(token: string) { return hash(token); }
export function isAuthDemoEnabled() { return !failClosed(); }
export function validatePassword(password: string) { return password.length >= 12 && password.length <= 256; }
export function normalizeAuthEmail(email: string) { return normalizeEmail(email); }
export function checkSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    const target = new URL(request.url);
    if (origin === target.origin) return true;
    if (process.env.NODE_ENV !== "production") {
      try {
        const source = new URL(origin);
        const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
        return loopback.has(source.hostname) && loopback.has(target.hostname) && source.protocol === target.protocol && source.port === target.port;
      } catch { return false; }
    }
    return false;
  }
  return process.env.NODE_ENV !== "production";
}
export function allowRequest(request: Request, bucket: string, limit = 8) { const trustedProxyConfigured = Boolean(process.env.TRUSTED_PROXY_CIDRS && process.env.TRUSTED_PROXY_CIDRS !== "NOT_CONFIGURED"); const forwarded = trustedProxyConfigured ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() : "direct-client"; const key = `${bucket}:${forwarded || "unknown"}`; const now = Date.now(); const existing = state.attempts.get(key); if (!existing || existing.resetAt <= now) { state.attempts.set(key, { count: 1, resetAt: now + 60_000 }); return true; } if (existing.count >= limit) return false; existing.count += 1; return true; }

export function registerCustomer(email: string, password: string) {
  if (failClosed()) return { kind: "disabled" as const };
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@") || !validatePassword(password)) return { kind: "invalid" as const };
  if (state.users.has(normalized)) return { kind: "exists" as const };
  const user: AuthUser = { id: randomId(), email: normalized, passwordHash: hashPassword(password), role: "CUSTOMER", mfaEnabled: false, recoveryCodeHashes: [], createdAt: new Date().toISOString() };
  state.users.set(normalized, user);
  return { kind: "created" as const, user };
}

export function loginCustomer(email: string, password: string) {
  if (failClosed()) return { kind: "disabled" as const };
  const user = state.users.get(normalizeEmail(email));
  if (!user || !verifyPassword(password, user.passwordHash)) return { kind: "invalid" as const };
  return { kind: "authenticated" as const, user, token: createSession(user, false) };
}
function createSession(user: AuthUser, mfaVerified: boolean) { const token = randomBytes(32).toString("base64url"); state.sessions.set(sessionTokenHash(token), { userId: user.id, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, mfaVerified }); return token; }
export function sessionCookie(token: string) { return { name: sessionCookieName, value: token, options: { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 } }; }
export function clearSessionCookie() { return { name: sessionCookieName, value: "", options: { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 } }; }
export function logout(request: Request) { const token = parseCookie(request); if (token) state.sessions.delete(sessionTokenHash(token)); }
export function currentSession(request: Request) { const token = parseCookie(request); if (!token) return null; const sessionKey = sessionTokenHash(token); const session = state.sessions.get(sessionKey); if (!session || session.expiresAt <= Date.now()) { state.sessions.delete(sessionKey); return null; } const user = [...state.users.values()].find((candidate) => candidate.id === session.userId); return user ? { user, mfaVerified: session.mfaVerified } : null; }
export function requireCustomer(request: Request) { const current = currentSession(request); return current?.user.role === "CUSTOMER" ? current : null; }
export function canAccessCustomerResource(request: Request, ownerId: string) { const current = requireCustomer(request); return current?.user.id === ownerId; }

function base32Decode(value: string) { const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; const clean = value.toUpperCase().replace(/=+$/, ""); let bits = ""; for (const char of clean) { const index = alphabet.indexOf(char); if (index < 0) throw new Error("INVALID_TOTP_SECRET"); bits += index.toString(2).padStart(5, "0"); } const bytes = []; for (let offset = 0; offset + 8 <= bits.length; offset += 8) bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2)); return Buffer.from(bytes); }
function totp(secret: string, step: number) { const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step)); const digest = createHmac("sha1", base32Decode(secret)).update(counter).digest(); const offset = digest[digest.length - 1] & 0x0f; const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000; return String(code).padStart(6, "0"); }
export function createTotpEnrollment(user: AuthUser) { const secret = randomBytes(20).toString("base64").replace(/[^A-Z2-7]/gi, "").slice(0, 32).toUpperCase(); user.mfaSecret = secret; user.mfaEnabled = false; return secret; }
export function verifyTotp(user: AuthUser, code: string) { if (!user.mfaSecret || !/^\d{6}$/.test(code)) return false; const current = Math.floor(Date.now() / 30_000); for (const step of [current - 1, current, current + 1]) { if (step <= (user.lastTotpStep ?? -1)) continue; if (totp(user.mfaSecret, step) === code) { user.lastTotpStep = step; user.mfaEnabled = true; return true; } } return false; }
export function createRecoveryCodes(user: AuthUser) { const codes = Array.from({ length: 8 }, () => randomBytes(5).toString("hex")); user.recoveryCodeHashes = codes.map(hash); return codes; }
export function useRecoveryCode(user: AuthUser, code: string) { const digest = hash(code); const index = user.recoveryCodeHashes.findIndex((candidate) => candidate === digest); if (index < 0) return false; user.recoveryCodeHashes.splice(index, 1); return true; }
export function enrollCustomerMfa(request: Request) { const current = currentSession(request); if (!current || current.user.role !== "CUSTOMER") return null; const secret = createTotpEnrollment(current.user); return { secret, recoveryCodes: createRecoveryCodes(current.user) }; }
export function verifyCustomerMfa(request: Request, code: string) { const current = currentSession(request); if (!current || current.user.role !== "CUSTOMER" || !verifyTotp(current.user, code)) return false; const token = parseCookie(request); if (!token) return false; const session = state.sessions.get(sessionTokenHash(token)); if (session) session.mfaVerified = true; return true; }
