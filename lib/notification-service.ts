import { getPrisma } from "@/lib/prisma";
import { isNotificationEventType, notificationEventTypes, renderNotification } from "@/lib/notification-catalog";
import { createNotificationProvider, NotificationProviderError, type NotificationProvider } from "@/lib/notification-provider";
import { processOutboxBatch, type ClaimedOutboxEvent } from "@/lib/outbox-worker";
import { DomainError, id } from "@/lib/backend-validation";

function payload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new NotificationProviderError("INVALID_EVENT_PAYLOAD");
  return value as Record<string, unknown>;
}

function safeError(error: unknown) {
  if (error instanceof NotificationProviderError) return error.category;
  if (error instanceof Error && ["INVALID_NOTIFICATION_PAYLOAD", "INVALID_NOTIFICATION_LINK_ORIGIN"].includes(error.message)) return error.message;
  return "DELIVERY_FAILED";
}

function notificationDedupeKey(event: ClaimedOutboxEvent) {
  if (event.dedupeKey.endsWith(":event")) return `${event.dedupeKey.slice(0, -":event".length)}:notification`;
  if (event.eventType === "ORDER_PLACED" && event.dedupeKey.endsWith(":placed")) {
    return `${event.dedupeKey.slice(0, -":placed".length)}:confirmation`;
  }
  throw new NotificationProviderError("NOTIFICATION_CORRELATION_MISSING");
}

async function deliverNotification(event: ClaimedOutboxEvent, provider: NotificationProvider) {
  if (!isNotificationEventType(event.eventType)) throw new NotificationProviderError("UNSUPPORTED_EVENT");
  const prisma = getPrisma();
  const dedupeKey = notificationDedupeKey(event);
  const order = event.aggregateType === "ORDER" ? await prisma.order.findUnique({ where: { publicOrderNumber: event.aggregateId }, select: { id: true, guestEmailNormalized: true, notifications: { where: { eventKey: event.eventType, dedupeKey }, take: 1 } } }) : null;
  const notification = order?.notifications[0];
  if (!order || !notification) throw new NotificationProviderError("NOTIFICATION_RECORD_MISSING");
  try {
    const result = await provider.send({ recipient: order.guestEmailNormalized, message: renderNotification(event.eventType, payload(event.payload)), dedupeKey: notification.dedupeKey });
    await prisma.$transaction([
      prisma.notificationDelivery.upsert({ where: { notificationId_attemptNumber: { notificationId: notification.id, attemptNumber: event.attempts } }, create: { notificationId: notification.id, providerCode: provider.code, attemptNumber: event.attempts, providerMessageId: result.providerMessageId, state: "ACCEPTED" }, update: { providerCode: provider.code, providerMessageId: result.providerMessageId, state: "ACCEPTED", errorCode: null } }),
      prisma.notification.update({ where: { id: notification.id }, data: { state: "ACCEPTED" } }),
    ]);
    return result;
  } catch (error) {
    await prisma.$transaction([
      prisma.notificationDelivery.upsert({ where: { notificationId_attemptNumber: { notificationId: notification.id, attemptNumber: event.attempts } }, create: { notificationId: notification.id, providerCode: provider.code, attemptNumber: event.attempts, state: "FAILED", errorCode: safeError(error) }, update: { state: "FAILED", errorCode: safeError(error) } }),
      prisma.notification.update({ where: { id: notification.id }, data: { state: "FAILED" } }),
    ]).catch(() => undefined);
    throw error;
  }
}

export async function processNotificationBatch(limit = 20, provider = createNotificationProvider()) {
  return processOutboxBatch((event) => deliverNotification(event, provider), limit, { workerCode: `notification:${provider.code}`, eventTypes: [...notificationEventTypes] });
}

export async function listNotificationOperations(page = 1) {
  if (!Number.isInteger(page) || page < 1 || page > 100000) throw new DomainError("VALIDATION_ERROR", "Invalid page.");
  const prisma = getPrisma();
  const [notifications, outbox] = await Promise.all([
    prisma.notification.findMany({ select: { id: true, eventKey: true, channel: true, recipientRef: true, state: true, createdAt: true, order: { select: { publicOrderNumber: true } }, deliveries: { select: { id: true, providerCode: true, attemptNumber: true, state: true, errorCode: true, attemptedAt: true }, orderBy: { attemptNumber: "desc" }, take: 5 } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 50, take: 50 }),
    prisma.outboxEvent.findMany({ where: { eventType: { in: [...notificationEventTypes] } }, select: { id: true, aggregateId: true, eventType: true, state: true, attempts: true, availableAt: true, createdAt: true, processedAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 50, take: 50 }),
  ]);
  return { notifications, outbox, page };
}

export async function retryNotificationOutbox(outboxId: string, actorId: string) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const event = await tx.outboxEvent.findUnique({ where: { id: id(outboxId) } });
    if (!event || !isNotificationEventType(event.eventType)) throw new DomainError("NOT_FOUND", "Notification event was not found.", 404);
    if (!new Set(["DEAD", "RETRY"]).has(event.state)) throw new DomainError("INVALID_STATE", "Only failed notification events can be retried.", 409);
    const updated = await tx.outboxEvent.update({ where: { id: event.id }, data: { state: "RETRY", availableAt: new Date(), processedAt: null } });
    await tx.auditEvent.create({ data: { actorType: "ADMIN", actorId, action: "NOTIFICATION_RETRY_REQUESTED", targetType: "OUTBOX_EVENT", targetId: event.id, safeMetadata: { eventType: event.eventType, aggregateId: event.aggregateId, priorAttempts: event.attempts } } });
    return updated;
  });
}
