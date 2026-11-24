import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const CAPABILITY_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MOCK_DELIVERY_KEY = "__flcGuestTrackingMock";

type MockChallenge = { orderNumber: string; email: string; code: string; expiresAt: Date };
type GuestTrackingRuntime = typeof globalThis & { [MOCK_DELIVERY_KEY]?: MockChallenge };

function runtime() { return globalThis as GuestTrackingRuntime; }
function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
function normalizeOrderNumber(value: string) { return value.trim().toUpperCase(); }
function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
function enabled() { return process.env.NODE_ENV !== "production" && process.env.CHECKOUT_RUNTIME === "database" && Boolean(process.env.DATABASE_URL) && process.env.GUEST_TRACKING_DELIVERY === "mock"; }
function mockCode() { return String(Number.parseInt(randomBytes(4).toString("hex"), 16) % 1_000_000).padStart(6, "0"); }

export type GuestTrackingResult =
  | { kind: "accepted" }
  | { kind: "invalid" }
  | { kind: "disabled"; message: string };

/** The mock provider captures delivery only in memory; it never claims to send email. */
export function getMockGuestChallenge() { return runtime()[MOCK_DELIVERY_KEY] ?? null; }

export async function requestGuestTrackingVerification(orderNumber: string, email: string): Promise<GuestTrackingResult> {
  if (!enabled()) return { kind: "disabled", message: "Guest tracking delivery is not configured for this environment." };
  const normalizedOrderNumber = normalizeOrderNumber(orderNumber);
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedOrderNumber || !normalizedEmail.includes("@") || normalizedEmail.length > 254) return { kind: "accepted" };
  const order = await getPrisma().order.findUnique({ where: { publicOrderNumber: normalizedOrderNumber }, select: { id: true, guestEmailNormalized: true } });
  if (!order || order.guestEmailNormalized !== normalizedEmail) return { kind: "accepted" };
  const id = randomUUID();
  const code = mockCode();
  await getPrisma().guestTrackingChallenge.create({ data: { id, orderId: order.id, channel: "EMAIL_MOCK", destinationHash: digest(normalizedEmail), challengeHash: digest(`${id}:${code}`), expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) } });
  runtime()[MOCK_DELIVERY_KEY] = { orderNumber: normalizedOrderNumber, email: normalizedEmail, code, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) };
  return { kind: "accepted" };
}

export async function confirmGuestTrackingVerification(orderNumber: string, email: string, code: string): Promise<GuestTrackingResult & { token?: string }> {
  if (!enabled()) return { kind: "disabled", message: "Guest tracking delivery is not configured for this environment." };
  const normalizedOrderNumber = normalizeOrderNumber(orderNumber);
  const normalizedEmail = normalizeEmail(email);
  if (!/^\d{6}$/.test(code)) return { kind: "invalid" };
  try {
    return await getPrisma().$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { publicOrderNumber: normalizedOrderNumber }, select: { id: true, guestEmailNormalized: true } });
      if (!order || order.guestEmailNormalized !== normalizedEmail) return { kind: "invalid" as const };
      const challenge = await tx.guestTrackingChallenge.findFirst({ where: { orderId: order.id, destinationHash: digest(normalizedEmail), consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: MAX_ATTEMPTS } }, orderBy: { createdAt: "desc" } });
      if (!challenge) return { kind: "invalid" as const };
      const expected = digest(`${challenge.id}:${code}`);
      if (!safeEqual(expected, challenge.challengeHash)) {
        await tx.guestTrackingChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 }, ...(challenge.attempts + 1 >= MAX_ATTEMPTS ? { consumedAt: new Date() } : {}) } });
        return { kind: "invalid" as const };
      }
      await tx.guestTrackingChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      const token = randomBytes(32).toString("base64url");
      await tx.guestTrackingCapability.create({ data: { orderId: order.id, tokenHash: digest(token), scope: "ORDER_READ", expiresAt: new Date(Date.now() + CAPABILITY_TTL_MS) } });
      return { kind: "accepted" as const, token };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5_000, timeout: 5_000 });
  } catch {
    return { kind: "invalid" };
  }
}

function bearerOrCookie(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim();
  return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith("flc_guest_tracking="))?.slice("flc_guest_tracking=".length) ?? null;
}

export async function readGuestOrder(request: Request, orderNumber: string) {
  if (!enabled()) return { kind: "disabled" as const, message: "Guest tracking is not configured for this environment." };
  const token = bearerOrCookie(request);
  if (!token) return { kind: "invalid" as const };
  const order = await getPrisma().order.findFirst({
    where: { publicOrderNumber: normalizeOrderNumber(orderNumber), guestCapabilities: { some: { tokenHash: digest(token), scope: "ORDER_READ", revokedAt: null, expiresAt: { gt: new Date() } } } },
    select: { publicOrderNumber: true, status: true, fulfillmentStatus: true, createdAt: true, items: { select: { productNameSnapshot: true, variantSnapshotJson: true, quantity: true, lineTotalMinor: true, currency: true } } },
  });
  if (!order) return { kind: "invalid" as const };
  return { kind: "ok" as const, order };
}

export function trackingCookie(token: string) { return { name: "flc_guest_tracking", value: token, options: { httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 15 * 60 } }; }
export function clearTrackingCookie() { return { name: "flc_guest_tracking", value: "", options: { httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 } }; }
