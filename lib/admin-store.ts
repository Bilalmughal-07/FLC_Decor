import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { isRetryableTransactionConflict } from "@/lib/database-store";
import { DomainError, id, integer, keys, object, string } from "@/lib/backend-validation";

export async function adjustInventory(input: unknown, actorId: string) {
  const data = object(input); keys(data, ["variantId", "locationId", "deltaOnHand", "reason"]);
  const variantId = id(data.variantId), locationId = id(data.locationId);
  const delta = integer(data.deltaOnHand, "Adjustment", -1000000, 1000000);
  if (delta === 0) throw new DomainError("VALIDATION_ERROR", "Adjustment cannot be zero.");
  const reason = string(data.reason, "Reason", 500);
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await getPrisma().$transaction(async (tx) => {
        const [variant, location] = await Promise.all([tx.variant.findUnique({ where: { id: variantId } }), tx.inventoryLocation.findUnique({ where: { id: locationId } })]);
        if (!variant || !location?.active) throw new DomainError("NOT_FOUND", "Active location or variant was not found.", 404);
        await tx.inventoryBalance.upsert({ where: { variantId_locationId: { variantId, locationId } }, create: { variantId, locationId, onHand: 0, reserved: 0 }, update: {} });
        const changed = await tx.$executeRaw(Prisma.sql`UPDATE "InventoryBalance" SET "onHand" = "onHand" + ${delta}, "version" = "version" + 1, "updatedAt" = NOW() WHERE "variantId" = ${variantId} AND "locationId" = ${locationId} AND "onHand" + ${delta} >= "reserved" AND "onHand" + ${delta} >= 0`);
        if (changed !== 1) throw new DomainError("INSUFFICIENT_STOCK", "Adjustment would consume reserved stock or make inventory negative.", 409);
        const balance = await tx.inventoryBalance.findUniqueOrThrow({ where: { variantId_locationId: { variantId, locationId } } });
        const eventId = randomUUID();
        await tx.inventoryMovement.create({ data: { variantId, locationId, deltaOnHand: delta, deltaReserved: 0, kind: "ADJUSTMENT", eventId, actorAuthUserId: actorId, reason } });
        await tx.auditEvent.create({ data: { actorType: "ADMIN", actorId, action: "INVENTORY_ADJUSTED", targetType: "VARIANT", targetId: variantId, safeMetadata: { locationId, deltaOnHand: delta, eventId, reason } } });
        // Legacy display mirror is only meaningful for the single active checkout location.
        const activeLocations = await tx.inventoryLocation.count({ where: { active: true } });
        if (activeLocations === 1) await tx.variant.update({ where: { id: variantId }, data: { availableQty: balance.onHand - balance.reserved } });
        return { balance, eventId };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
    } catch (error) {
      if (isRetryableTransactionConflict(error) && attempt < 3) { await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt + Math.floor(Math.random() * 20))); continue; }
      if (isRetryableTransactionConflict(error)) throw new DomainError("INVENTORY_BUSY", "Inventory is busy; retry the adjustment.", 409);
      throw error;
    }
  }
  throw new DomainError("INVENTORY_BUSY", "Inventory is busy; retry the adjustment.", 409);
}

export async function listAdminOrders(page = 1) {
  if (!Number.isInteger(page) || page < 1 || page > 100000) throw new DomainError("VALIDATION_ERROR", "Invalid page.");
  const rows = await getPrisma().order.findMany({ select: { id: true, publicOrderNumber: true, status: true, fulfillmentStatus: true, paymentStatus: true, subtotalMinor: true, totalMinor: true, createdAt: true, guestEmailNormalized: true, items: { select: { id: true, productNameSnapshot: true, quantity: true, unitPriceMinor: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 30, take: 30 });
  return { orders: rows, page };
}

export async function getAdminOrder(orderId: string) {
  return getPrisma().order.findUnique({ where: { id: id(orderId) }, select: { id: true, publicOrderNumber: true, status: true, fulfillmentStatus: true, paymentStatus: true, paymentMethod: true, subtotalMinor: true, shippingMinor: true, taxMinor: true, totalMinor: true, createdAt: true, guestEmailNormalized: true, items: { select: { id: true, productNameSnapshot: true, variantSnapshotJson: true, quantity: true, unitPriceMinor: true, lineTotalMinor: true } }, reservations: { select: { variantId: true, locationId: true, quantity: true, state: true } }, statusEvents: { select: { fromStatus: true, toStatus: true, actorType: true, reason: true, createdAt: true }, orderBy: { createdAt: "asc" } } } });
}

export async function adminDashboard() {
  const prisma = getPrisma();
  const [products, drafts, orders, pendingOrders, lowStock, outboxPending] = await Promise.all([
    prisma.product.count(), prisma.product.count({ where: { status: "DRAFT" } }), prisma.order.count(), prisma.order.count({ where: { fulfillmentStatus: "PLACED" } }), prisma.inventoryBalance.count({ where: { onHand: { lte: 5 } } }), prisma.outboxEvent.count({ where: { state: { in: ["PENDING", "RETRY"] } } }),
  ]);
  return { products, drafts, orders, pendingOrders, lowStockBalances: lowStock, outboxPending, demoOnly: true };
}

export async function listAdminInventory(page = 1) {
  if (!Number.isInteger(page) || page < 1 || page > 100000) throw new DomainError("VALIDATION_ERROR", "Invalid page.");
  const prisma = getPrisma();
  const [locations, balances] = await Promise.all([
    prisma.inventoryLocation.findMany({ select: { id: true, code: true, name: true, active: true }, orderBy: { code: "asc" } }),
    prisma.inventoryBalance.findMany({ select: { id: true, variantId: true, locationId: true, onHand: true, reserved: true, version: true, variant: { select: { sku: true, active: true, product: { select: { name: true, status: true } } } } }, orderBy: [{ locationId: "asc" }, { variantId: "asc" }], skip: (page - 1) * 100, take: 100 }),
  ]);
  return { locations, balances, page };
}

export async function listAuditEvents(page = 1) {
  if (!Number.isInteger(page) || page < 1 || page > 100000) throw new DomainError("VALIDATION_ERROR", "Invalid page.");
  const events = await getPrisma().auditEvent.findMany({ select: { id: true, actorType: true, actorId: true, action: true, targetType: true, targetId: true, createdAt: true, requestId: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 100, take: 100 });
  return { events, page };
}

export async function listAdminCustomers(page = 1, query = "") {
  if (!Number.isInteger(page) || page < 1 || page > 100000) throw new DomainError("VALIDATION_ERROR", "Invalid page.");
  const q = query.trim().toLowerCase();
  if (q.length > 120) throw new DomainError("VALIDATION_ERROR", "Search is too long.");
  const where = q ? { normalizedEmail: { contains: q, mode: "insensitive" as const } } : {};
  const [customers, total] = await Promise.all([
    getPrisma().customerProfile.findMany({ where, select: { id: true, normalizedEmail: true, status: true, createdAt: true, _count: { select: { addresses: true, orders: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 50, take: 50 }),
    getPrisma().customerProfile.count({ where }),
  ]);
  return { customers, total, page, pageSize: 50 };
}

function analyticsDate(value: string | null, fallback: Date, end = false) {
  if (!value) return fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new DomainError("VALIDATION_ERROR", "Invalid analytics date.");
  const parsed = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
  if (Number.isNaN(parsed.getTime())) throw new DomainError("VALIDATION_ERROR", "Invalid analytics date.");
  return parsed;
}

export async function salesAnalytics(fromText: string | null, toText: string | null) {
  const now = new Date();
  const to = analyticsDate(toText, now, true);
  const from = analyticsDate(fromText, new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000));
  if (from > to || to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000) throw new DomainError("VALIDATION_ERROR", "Analytics range must be at most 366 days.");
  const where = { placedAt: { gte: from, lte: to } };
  const prisma = getPrisma();
  const [orders, collected, placed, statuses, inventory] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.aggregate({ where: { ...where, paymentStatus: "PAID", totalMinor: { not: null } }, _sum: { totalMinor: true }, _count: true }),
    prisma.order.aggregate({ where: { ...where, fulfillmentStatus: { not: "CANCELED" }, totalMinor: { not: null } }, _sum: { totalMinor: true } }),
    prisma.order.groupBy({ by: ["fulfillmentStatus"], where, _count: true }),
    prisma.$queryRaw<Array<{ total: bigint; sold_out: bigint; low_stock: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS "total", COUNT(*) FILTER (WHERE "onHand" - "reserved" = 0)::bigint AS "sold_out", COUNT(*) FILTER (WHERE "onHand" - "reserved" BETWEEN 1 AND 5)::bigint AS "low_stock" FROM "InventoryBalance"`),
  ]);
  return { from, to, orders, collectedOrders: collected._count, collectedRevenueMinor: collected._sum.totalMinor ?? 0, placedValueMinor: placed._sum.totalMinor ?? 0, statuses: Object.fromEntries(statuses.map((row) => [row.fulfillmentStatus ?? "UNKNOWN", row._count])), inventory: { totalBalances: Number(inventory[0]?.total ?? 0), soldOut: Number(inventory[0]?.sold_out ?? 0), lowStock: Number(inventory[0]?.low_stock ?? 0) }, definitions: { collectedRevenue: "Orders whose paymentStatus is PAID", placedValue: "Non-cancelled orders with a stored total; not recognized revenue" } };
}
