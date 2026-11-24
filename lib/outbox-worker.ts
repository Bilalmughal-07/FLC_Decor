import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1_000;
const PROCESSING_LEASE_MS = 5 * 60 * 1_000;

export type ClaimedOutboxEvent = { id: string; aggregateType: string; aggregateId: string; eventType: string; payload: unknown; dedupeKey: string; attempts: number };
export type OutboxDelivery = (event: ClaimedOutboxEvent) => Promise<{ providerMessageId?: string } | void>;

function enabled() { return process.env.NODE_ENV !== "production" && process.env.CHECKOUT_RUNTIME === "database" && ["mock", "development-memory"].includes(process.env.NOTIFICATION_RUNTIME ?? ""); }

export async function processOutboxBatch(deliver: OutboxDelivery, limit = 20, options: { workerCode?: string; eventTypes?: string[] } = {}) {
  if (!enabled()) return { kind: "disabled" as const, claimed: 0, completed: 0, retried: 0, dead: 0 };
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const prisma = getPrisma();
  const claimed = await prisma.$transaction(async (tx) => {
    const eventFilter = options.eventTypes?.length ? Prisma.sql`AND "eventType" IN (${Prisma.join(options.eventTypes)})` : Prisma.empty;
    const rows = await tx.$queryRaw<ClaimedOutboxEvent[]>(Prisma.sql`SELECT "id", "aggregateType", "aggregateId", "eventType", "payload", "dedupeKey", "attempts" FROM "OutboxEvent" WHERE (("state" IN ('PENDING','RETRY') AND "availableAt" <= NOW()) OR ("state" = 'PROCESSING' AND "availableAt" <= NOW())) ${eventFilter} ORDER BY "createdAt" ASC, "id" ASC LIMIT ${safeLimit} FOR UPDATE SKIP LOCKED`);
    const result: ClaimedOutboxEvent[] = [];
    for (const row of rows) {
      const attempts = row.attempts + 1;
      await tx.outboxEvent.update({ where: { id: row.id }, data: { state: "PROCESSING", attempts, availableAt: new Date(Date.now() + PROCESSING_LEASE_MS) } });
      await tx.jobAttempt.create({ data: { outboxEventId: row.id, workerCode: options.workerCode ?? "outbox-worker", attemptNumber: attempts, result: "CLAIMED" } });
      result.push({ ...row, attempts });
    }
    return result;
  });
  let completed = 0;
  let retried = 0;
  let dead = 0;
  for (const event of claimed) {
    try {
      const delivery = await deliver(event);
      await prisma.$transaction(async (tx) => {
        await tx.outboxEvent.updateMany({ where: { id: event.id, state: "PROCESSING" }, data: { state: "COMPLETED", processedAt: new Date() } });
        await tx.jobAttempt.update({ where: { outboxEventId_attemptNumber: { outboxEventId: event.id, attemptNumber: event.attempts } }, data: { result: "COMPLETED", finishedAt: new Date(), errorCategory: delivery?.providerMessageId ? `provider:${delivery.providerMessageId}` : null } });
      });
      completed += 1;
    } catch (error) {
      const isDead = event.attempts >= MAX_ATTEMPTS;
      const availableAt = new Date(Date.now() + BASE_BACKOFF_MS * 2 ** Math.min(event.attempts - 1, 6));
      await prisma.$transaction(async (tx) => {
        await tx.outboxEvent.updateMany({ where: { id: event.id, state: "PROCESSING" }, data: { state: isDead ? "DEAD" : "RETRY", availableAt: isDead ? undefined : availableAt } });
        await tx.jobAttempt.update({ where: { outboxEventId_attemptNumber: { outboxEventId: event.id, attemptNumber: event.attempts } }, data: { result: isDead ? "DEAD" : "RETRY", errorCategory: error instanceof Error ? error.name : "DELIVERY_FAILED", finishedAt: new Date() } });
      });
      if (isDead) dead += 1; else retried += 1;
    }
  }
  return { kind: "processed" as const, claimed: claimed.length, completed, retried, dead };
}
