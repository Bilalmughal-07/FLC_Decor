import { createHash } from "node:crypto";
import { Prisma, type FulfillmentStatus, type OrderStatus } from "@prisma/client";
import { DomainError, id, keys, object, optionalString, string } from "@/lib/backend-validation";
import { isRetryableTransactionConflict } from "@/lib/database-store";
import { getPrisma } from "@/lib/prisma";

const transitions: Record<FulfillmentStatus, readonly FulfillmentStatus[]> = {
  PLACED: ["CONFIRMED", "CANCELED"],
  CONFIRMED: ["PREPARING", "CANCELED"],
  PREPARING: ["SHIPPED", "CANCELED"],
  SHIPPED: ["DELIVERED", "EXCEPTION"],
  DELIVERED: ["RETURN_REQUESTED"],
  CANCELED: [],
  RETURN_REQUESTED: ["RETURNED", "EXCEPTION"],
  RETURNED: [],
  EXCEPTION: [],
};

const legacyStatus: Partial<Record<FulfillmentStatus, OrderStatus>> = {
  PLACED: "RECEIVED", CONFIRMED: "CONFIRMED", PREPARING: "REVIEWING", SHIPPED: "DISPATCHED", DELIVERED: "COMPLETED", CANCELED: "CANCELLED",
};

function eventFor(status: FulfillmentStatus) {
  if (status === "CONFIRMED") return "ORDER_CONFIRMED";
  if (status === "SHIPPED") return "ORDER_DISPATCHED";
  if (status === "CANCELED") return "ORDER_CANCELLED";
  return "ORDER_STATUS_CHANGED";
}

function isFulfillmentStatus(value: string): value is FulfillmentStatus { return value in transitions; }
function recipientHash(email: string) { return createHash("sha256").update(email).digest("hex"); }
function wait(attempt: number) { return new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt + Math.floor(Math.random() * 25))); }

export async function transitionDemoOrder(orderId: string, input: unknown, actorId: string) {
  if (process.env.NODE_ENV === "production") throw new DomainError("ORDER_TRANSITIONS_NOT_CONFIGURED", "Order transitions are not configured for production.", 503);
  const data = object(input); keys(data, ["toStatus", "reason"]);
  const toStatusText = string(data.toStatus, "Status", 40).toUpperCase();
  if (!isFulfillmentStatus(toStatusText)) throw new DomainError("VALIDATION_ERROR", "Invalid fulfillment status.");
  const reason = optionalString(data.reason, "Reason", 500);
  if (["CANCELED", "EXCEPTION", "RETURNED"].includes(toStatusText) && !reason) throw new DomainError("REASON_REQUIRED", "A reason is required for this transition.");
  const targetId = id(orderId);
  const prisma = getPrisma();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Order" WHERE "id" = ${targetId} FOR UPDATE`);
        const order = await tx.order.findUnique({ where: { id: targetId }, include: { reservations: true } });
        if (!order) throw new DomainError("NOT_FOUND", "Order was not found.", 404);
        if (order.paymentMethod !== "COD_DEMO") throw new DomainError("ORDER_TRANSITIONS_NOT_CONFIGURED", "Only synthetic demo orders can be transitioned.", 503);
        const current = order.fulfillmentStatus ?? "PLACED";
        if (current === toStatusText) return { order, idempotent: true as const };
        if (!transitions[current].includes(toStatusText)) throw new DomainError("INVALID_TRANSITION", `An order cannot move from ${current} to ${toStatusText}.`, 409);

        if (toStatusText === "CANCELED" || toStatusText === "SHIPPED") {
          for (const reservation of order.reservations.filter((row) => row.state === "ACTIVE")) {
            const changed = toStatusText === "CANCELED"
              ? await tx.$executeRaw(Prisma.sql`UPDATE "InventoryBalance" SET "reserved" = "reserved" - ${reservation.quantity}, "version" = "version" + 1, "updatedAt" = NOW() WHERE "variantId" = ${reservation.variantId} AND "locationId" = ${reservation.locationId} AND "reserved" >= ${reservation.quantity}`)
              : await tx.$executeRaw(Prisma.sql`UPDATE "InventoryBalance" SET "onHand" = "onHand" - ${reservation.quantity}, "reserved" = "reserved" - ${reservation.quantity}, "version" = "version" + 1, "updatedAt" = NOW() WHERE "variantId" = ${reservation.variantId} AND "locationId" = ${reservation.locationId} AND "onHand" >= ${reservation.quantity} AND "reserved" >= ${reservation.quantity}`);
            if (changed !== 1) throw new DomainError("INVENTORY_INVARIANT", "Reserved inventory could not be reconciled.", 409);
            await tx.stockReservation.update({ where: { id: reservation.id }, data: toStatusText === "CANCELED" ? { state: "RELEASED", releasedAt: new Date() } : { state: "COMMITTED", committedAt: new Date() } });
            await tx.inventoryMovement.create({ data: { variantId: reservation.variantId, locationId: reservation.locationId, deltaOnHand: toStatusText === "SHIPPED" ? -reservation.quantity : 0, deltaReserved: -reservation.quantity, kind: toStatusText === "SHIPPED" ? "SHIP" : "RELEASE", referenceType: "ORDER", referenceId: order.publicOrderNumber, eventId: `order:${order.publicOrderNumber}:${reservation.variantId}:${toStatusText.toLowerCase()}`, actorAuthUserId: actorId, reason: reason ?? `Order moved to ${toStatusText}` } });
            const balance = await tx.inventoryBalance.findUniqueOrThrow({ where: { variantId_locationId: { variantId: reservation.variantId, locationId: reservation.locationId } } });
            await tx.variant.update({ where: { id: reservation.variantId }, data: { availableQty: balance.onHand - balance.reserved } });
          }
        }

        const updated = await tx.order.update({ where: { id: order.id }, data: { fulfillmentStatus: toStatusText, ...(legacyStatus[toStatusText] ? { status: legacyStatus[toStatusText] } : {}) } });
        await tx.orderStatusEvent.create({ data: { orderId: order.id, fromStatus: current, toStatus: toStatusText, actorId, actorType: "ADMIN", reason } });
        const eventType = eventFor(toStatusText);
        const dedupeBase = `order:${order.publicOrderNumber}:fulfillment:${toStatusText.toLowerCase()}`;
        await tx.notification.create({ data: { orderId: order.id, eventKey: eventType, channel: "EMAIL", recipientRef: `sha256:${recipientHash(order.guestEmailNormalized)}`, dedupeKey: `${dedupeBase}:notification`, state: "QUEUED" } });
        await tx.outboxEvent.create({ data: { aggregateType: "ORDER", aggregateId: order.publicOrderNumber, eventType, payloadVersion: 1, payload: { orderNumber: order.publicOrderNumber, status: toStatusText }, dedupeKey: `${dedupeBase}:event` } });
        await tx.auditEvent.create({ data: { actorType: "ADMIN", actorId, action: "ORDER_FULFILLMENT_TRANSITIONED", targetType: "ORDER", targetId: order.id, safeMetadata: { fromStatus: current, toStatus: toStatusText, reason } } });
        return { order: updated, idempotent: false as const };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
    } catch (error) {
      if (isRetryableTransactionConflict(error) && attempt < 3) { await wait(attempt); continue; }
      if (isRetryableTransactionConflict(error)) throw new DomainError("ORDER_BUSY", "The order is being updated; retry the request.", 409);
      throw error;
    }
  }
  throw new DomainError("ORDER_BUSY", "The order is being updated; retry the request.", 409);
}
