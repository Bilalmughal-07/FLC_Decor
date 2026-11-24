import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

export type PaymentIntentState = "PENDING" | "REQUIRES_ACTION" | "AUTHORIZED" | "PAID" | "FAILED" | "CANCELED" | "REFUND_PENDING" | "PARTIALLY_REFUNDED" | "REFUNDED";

const transitions: Record<PaymentIntentState, readonly PaymentIntentState[]> = {
  PENDING: ["REQUIRES_ACTION", "AUTHORIZED", "PAID", "FAILED", "CANCELED"],
  REQUIRES_ACTION: ["AUTHORIZED", "PAID", "FAILED", "CANCELED"],
  AUTHORIZED: ["PAID", "FAILED", "CANCELED", "REFUND_PENDING"],
  PAID: ["REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED"],
  FAILED: [],
  CANCELED: [],
  REFUND_PENDING: ["PARTIALLY_REFUNDED", "REFUNDED"],
  PARTIALLY_REFUNDED: ["REFUNDED"],
  REFUNDED: [],
};

export function isAllowedPaymentTransition(from: PaymentIntentState, to: PaymentIntentState) { return from === to || transitions[from].includes(to); }
export function mockWebhookSignature(rawBody: string, secret: string) { return `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`; }
export function verifyMockWebhookSignature(rawBody: string, signature: string, secret: string) {
  if (!secret || !signature.startsWith("sha256=")) return false;
  const expected = Buffer.from(mockWebhookSignature(rawBody, secret).slice(7), "hex");
  const actual = Buffer.from(signature.slice(7), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

type MockWebhook = { externalEventId: string; intentId: string; providerTransactionId: string; amountMinor: number; currency: string; state: PaymentIntentState };
type WebhookResult = { kind: "processed" | "duplicate" | "rejected" | "disabled"; reason?: string };

function isMockWebhook(value: unknown): value is MockWebhook {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.externalEventId === "string" && candidate.externalEventId.length <= 200 && typeof candidate.intentId === "string" && typeof candidate.providerTransactionId === "string" && Number.isInteger(candidate.amountMinor) && typeof candidate.currency === "string" && typeof candidate.state === "string" && candidate.state in transitions;
}

function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
function orderPaymentStatus(state: PaymentIntentState) {
  if (state === "PAID") return "PAID" as const;
  if (state === "FAILED") return "FAILED" as const;
  if (state === "REFUND_PENDING") return "REFUND_PENDING" as const;
  if (state === "PARTIALLY_REFUNDED") return "PARTIALLY_REFUNDED" as const;
  if (state === "REFUNDED") return "REFUNDED" as const;
  return null;
}

/** Test-only provider boundary. Real provider adapters must be added after approval. */
export async function processMockPaymentWebhook(rawBody: string, signature: string, secret: string): Promise<WebhookResult> {
  if (process.env.NODE_ENV === "production" || process.env.PAYMENT_PROVIDER_RUNTIME !== "mock") return { kind: "disabled", reason: "Payment provider is not configured." };
  if (!verifyMockWebhookSignature(rawBody, signature, secret)) return { kind: "rejected", reason: "SIGNATURE_INVALID" };
  let payload: MockWebhook;
  try { payload = JSON.parse(rawBody) as MockWebhook; } catch { return { kind: "rejected", reason: "PAYLOAD_INVALID" }; }
  if (!isMockWebhook(payload)) return { kind: "rejected", reason: "PAYLOAD_INVALID" };
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const existing = await tx.paymentWebhookEvent.findFirst({ where: { providerCode: "MOCK", externalEventId: payload.externalEventId } });
    if (existing) return { kind: "duplicate" as const };
    const intent = await tx.paymentIntent.findUnique({ where: { id: payload.intentId }, include: { order: true } });
    const event = await tx.paymentWebhookEvent.create({ data: { providerCode: "MOCK", externalEventId: payload.externalEventId, signatureVerified: true, payloadDigest: digest(rawBody) } });
    if (!intent || intent.amountMinor !== payload.amountMinor || intent.currency !== payload.currency || !isAllowedPaymentTransition(intent.state, payload.state)) {
      await tx.paymentWebhookEvent.update({ where: { id: event.id }, data: { processingResult: "REJECTED_VALIDATION", processedAt: new Date() } });
      return { kind: "rejected" as const, reason: "PAYMENT_VALIDATION_FAILED" };
    }
    const attempt = await tx.paymentAttempt.create({ data: { intentId: intent.id, providerRequestId: payload.externalEventId, state: payload.state, responseCode: "MOCK_VERIFIED", safeMetadata: { provider: "MOCK" }, completedAt: new Date() } });
    await tx.paymentTransaction.create({ data: { attemptId: attempt.id, providerCode: "MOCK", providerTransactionId: payload.providerTransactionId, kind: payload.state === "PAID" ? "CAPTURED" : payload.state === "FAILED" ? "FAILED" : "AUTHORIZED", amountMinor: payload.amountMinor, currency: payload.currency, occurredAt: new Date() } });
    await tx.paymentIntent.update({ where: { id: intent.id }, data: { state: payload.state, providerCode: "MOCK", providerReference: payload.providerTransactionId } });
    const orderStatus = orderPaymentStatus(payload.state);
    if (orderStatus) await tx.order.update({ where: { id: intent.orderId }, data: { paymentStatus: orderStatus } });
    await tx.paymentWebhookEvent.update({ where: { id: event.id }, data: { processingResult: "PROCESSED", processedAt: new Date() } });
    await tx.auditEvent.create({ data: { actorType: "SYSTEM", action: "PAYMENT_WEBHOOK_PROCESSED", targetType: "PAYMENT_INTENT", targetId: intent.id, requestId: null, safeMetadata: { provider: "MOCK", externalEventId: payload.externalEventId, state: payload.state } } });
    await tx.outboxEvent.create({ data: { aggregateType: "ORDER", aggregateId: intent.order.publicOrderNumber, eventType: "PAYMENT_STATE_CHANGED", payloadVersion: 1, payload: { provider: "MOCK", paymentIntentId: intent.id, state: payload.state }, dedupeKey: `payment:MOCK:${payload.externalEventId}` } });
    return { kind: "processed" as const };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5_000, timeout: 5_000 });
}
