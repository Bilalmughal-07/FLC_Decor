import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { createDatabaseOrder } from "@/lib/database-store";
import { confirmGuestTrackingVerification, getMockGuestChallenge, readGuestOrder, requestGuestTrackingVerification } from "@/lib/guest-tracking";
import { mockWebhookSignature, processMockPaymentWebhook } from "@/lib/payment-integrity";
import { processOutboxBatch } from "@/lib/outbox-worker";
import { processNotificationBatch, retryNotificationOutbox } from "@/lib/notification-service";
import { clearDevelopmentNotificationInbox, createNotificationProvider, developmentNotificationInbox, NotificationProviderError } from "@/lib/notification-provider";
import { getPrisma } from "@/lib/prisma";
import { getAccountOrder } from "@/lib/account-store";
import { transitionDemoOrder } from "@/lib/order-lifecycle";

const enabled = process.env.RUN_POSTGRES_INTEGRATION === "true";
if (enabled) describe("PostgreSQL transactional checkout", () => {
  const prisma = getPrisma();
  const categoryId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();
  const replayVariantId = randomUUID();
  const locationId = "00000000-0000-4000-8000-000000000001";
  const runTag = randomUUID().slice(0, 8);
  beforeAll(async () => {
    await prisma.inventoryLocation.update({ where: { id: locationId }, data: { active: true } });
    await prisma.category.create({ data: { id: categoryId, name: "CI Synthetic", slug: `ci-${categoryId.slice(0, 8)}` } });
    await prisma.product.create({ data: { id: productId, primaryCategoryId: categoryId, name: "CI Synthetic Product", slug: `ci-${productId.slice(0, 8)}`, description: "Test fixture", status: "PUBLISHED", publishedAt: new Date() } });
    await prisma.variant.create({ data: { id: variantId, productId, sku: `CI-${variantId.slice(0, 8)}`, sizeLabel: "Test", colorLabel: "Test", regularPriceMinor: 100, availableQty: 1 } });
    await prisma.variant.create({ data: { id: replayVariantId, productId, sku: `CI-${replayVariantId.slice(0, 8)}`, sizeLabel: "Replay", colorLabel: "Test", regularPriceMinor: 100, availableQty: 1 } });
    await prisma.inventoryBalance.createMany({ data: [variantId, replayVariantId].map((id) => ({ variantId: id, locationId, onHand: 1, reserved: 0 })) });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("accepts exactly one concurrent last-unit checkout", async () => {
    process.env.CHECKOUT_RUNTIME = "database"; process.env.CHECKOUT_TOTALS_MODE = "synthetic-zero"; process.env.CHECKOUT_FIELD_ENCRYPTION_KEY = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
    const emails = [`${runTag}-one@example.test`, `${runTag}-two@example.test`];
    const make = (email: string) => createDatabaseOrder({ idempotencyKey: `ci-key-${email}`, email, phone: "03000000000", address: { name: "CI", line1: "CI address", city: "CI" }, items: [{ variantId, quantity: 1 }] });
    const results = await Promise.all(emails.map(make));
    expect(results.filter((result) => result.kind === "created")).toHaveLength(1);
    expect(results.filter((result) => result.kind === "stock")).toHaveLength(1);
    const orders = await prisma.order.findMany({ where: { guestEmailNormalized: { in: emails } }, select: { id: true, publicOrderNumber: true } });
    expect(orders).toHaveLength(1);
    const orderIds = orders.map((order) => order.id);
    const orderNumbers = orders.map((order) => order.publicOrderNumber);
    const balance = await prisma.inventoryBalance.findUnique({ where: { variantId_locationId: { variantId, locationId } } });
    expect(balance?.reserved).toBe(1);
    expect(balance?.onHand).toBeGreaterThanOrEqual(0);
    expect(balance?.reserved).toBeGreaterThanOrEqual(0);
    expect(balance?.reserved).toBeLessThanOrEqual(balance?.onHand ?? -1);
    expect(await prisma.stockReservation.count({ where: { variantId, state: "ACTIVE" } })).toBe(1);
    expect(await prisma.inventoryMovement.count({ where: { variantId, kind: "RESERVE", referenceId: { in: orderNumbers } } })).toBe(1);
    expect(await prisma.paymentIntent.count({ where: { orderId: { in: orderIds }, method: "COD", state: "PENDING" } })).toBe(1);
    expect(await prisma.notification.count({ where: { orderId: { in: orderIds }, eventKey: "ORDER_PLACED" } })).toBe(1);
    expect(await prisma.outboxEvent.count({ where: { eventType: "ORDER_PLACED", aggregateId: { in: orderNumbers } } })).toBe(1);
    expect(await prisma.auditEvent.count({ where: { action: "ORDER_PLACED", targetId: { in: orderIds } } })).toBe(1);
    expect(await prisma.orderStatusEvent.count({ where: { orderId: { in: orderIds }, toStatus: "RECEIVED" } })).toBe(1);
    expect(await prisma.orderAddressSnapshot.count({ where: { orderId: { in: orderIds } } })).toBe(1);
    const idempotencyRows = emails.map((email) => ({ scopeHash: createHash("sha256").update(JSON.stringify({ email, phone: "03000000000" })).digest("hex"), keyHash: createHash("sha256").update(JSON.stringify(`ci-key-${email}`)).digest("hex") }));
    expect(await prisma.checkoutIdempotency.count({ where: { OR: idempotencyRows } })).toBe(1);
  });

  it("delivers order notifications once and supports an audited manual retry", async () => {
    process.env.NOTIFICATION_RUNTIME = "development-memory";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    clearDevelopmentNotificationInbox();
    const order = await prisma.order.findFirst({ where: { guestEmailNormalized: { startsWith: `${runTag}-` } }, include: { notifications: true } });
    expect(order).not.toBeNull();
    if (!order) return;
    const first = await processNotificationBatch(100, createNotificationProvider());
    expect(first.kind).toBe("processed");
    expect(first.completed).toBeGreaterThanOrEqual(1);
    expect(developmentNotificationInbox().filter((delivery) => delivery.dedupeKey === `order:${order.publicOrderNumber}:confirmation`)).toHaveLength(1);
    expect(await prisma.notification.findFirst({ where: { orderId: order.id, eventKey: "ORDER_PLACED" } }).then((row) => row?.state)).toBe("ACCEPTED");
    expect(await prisma.notificationDelivery.count({ where: { notification: { orderId: order.id }, state: "ACCEPTED" } })).toBe(1);

    const notification = await prisma.notification.create({ data: { orderId: order.id, eventKey: "ORDER_CONFIRMED", channel: "EMAIL", recipientRef: "sha256:synthetic", dedupeKey: `order:${order.publicOrderNumber}:confirmed:notification`, state: "QUEUED" } });
    const event = await prisma.outboxEvent.create({ data: { aggregateType: "ORDER", aggregateId: order.publicOrderNumber, eventType: "ORDER_CONFIRMED", payloadVersion: 1, payload: { orderNumber: order.publicOrderNumber }, dedupeKey: `order:${order.publicOrderNumber}:confirmed:event` } });
    const failingProvider = { code: "synthetic-failure", async send() { throw new NotificationProviderError("SYNTHETIC_FAILURE"); } };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await processNotificationBatch(1, failingProvider);
      await prisma.outboxEvent.update({ where: { id: event.id }, data: { availableAt: new Date() } });
    }
    expect(await prisma.outboxEvent.findUnique({ where: { id: event.id } }).then((row) => row?.state)).toBe("DEAD");
    expect(await prisma.notification.findUnique({ where: { id: notification.id } }).then((row) => row?.state)).toBe("FAILED");
    await retryNotificationOutbox(event.id, "synthetic-admin");
    expect(await processNotificationBatch(1, createNotificationProvider())).toMatchObject({ kind: "processed", completed: 1 });
    expect(await prisma.outboxEvent.findUnique({ where: { id: event.id } }).then((row) => row?.state)).toBe("COMPLETED");
    expect(await prisma.notification.findUnique({ where: { id: notification.id } }).then((row) => row?.state)).toBe("ACCEPTED");
    expect(await prisma.notificationDelivery.count({ where: { notificationId: notification.id } })).toBe(6);
    expect(await prisma.auditEvent.count({ where: { action: "NOTIFICATION_RETRY_REQUESTED", targetId: event.id } })).toBe(1);
  });

  it("links a signed-in synthetic checkout to one profile and account history", async () => {
    process.env.AUTH_RUNTIME = "demo";
    process.env.CHECKOUT_RUNTIME = "database"; process.env.CHECKOUT_TOTALS_MODE = "synthetic-zero"; process.env.CHECKOUT_FIELD_ENCRYPTION_KEY = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
    const accountVariantId = randomUUID();
    await prisma.variant.create({ data: { id: accountVariantId, productId, sku: `CI-${accountVariantId.slice(0, 8)}`, sizeLabel: "Account", colorLabel: "Test", regularPriceMinor: 100, availableQty: 1 } });
    await prisma.inventoryBalance.create({ data: { variantId: accountVariantId, locationId, onHand: 1, reserved: 0 } });
    const authUserId = randomUUID();
    const email = `${runTag}-account@example.test`;
    const input = { idempotencyKey: `ci-account-${runTag}`, customerAuthUserId: authUserId, email, phone: "03000000009", address: { name: "CI Account", line1: "CI address", city: "CI" }, items: [{ variantId: accountVariantId, quantity: 1 }] };
    const result = await createDatabaseOrder(input);
    expect(result.kind).toBe("created");
    if (result.kind !== "created") return;
    const profile = await prisma.customerProfile.findUnique({ where: { authUserId } });
    expect(profile?.normalizedEmail).toBe(email);
    const order = await prisma.order.findUnique({ where: { id: result.order.id } });
    expect(order).toMatchObject({ customerProfileId: profile?.id, source: "CUSTOMER" });
    expect((await createDatabaseOrder(input)).kind).toBe("replay");
    expect(await prisma.order.count({ where: { customerProfileId: profile?.id } })).toBe(1);
    expect(await getAccountOrder({ id: authUserId, email }, result.order.publicOrderNumber)).toMatchObject({ publicOrderNumber: result.order.publicOrderNumber });
    expect(await getAccountOrder({ id: randomUUID(), email: `${runTag}-other@example.test` }, result.order.publicOrderNumber)).toBeNull();
  });

  it("applies idempotent legal order transitions and releases cancelled stock atomically", async () => {
    const transitionVariantId = randomUUID();
    await prisma.variant.create({ data: { id: transitionVariantId, productId, sku: `CI-${transitionVariantId.slice(0, 8)}`, sizeLabel: "Cancel", colorLabel: "Test", regularPriceMinor: 100, availableQty: 1 } });
    await prisma.inventoryBalance.create({ data: { variantId: transitionVariantId, locationId, onHand: 1, reserved: 0 } });
    const created = await createDatabaseOrder({ idempotencyKey: `ci-transition-${runTag}`, email: `${runTag}-transition@example.test`, phone: "03000000008", address: { name: "CI Transition", line1: "CI address", city: "CI" }, items: [{ variantId: transitionVariantId, quantity: 1 }] });
    expect(created.kind).toBe("created");
    if (created.kind !== "created") return;
    const actorId = randomUUID();
    const confirmations = await Promise.all([
      transitionDemoOrder(created.order.id, { toStatus: "CONFIRMED" }, actorId),
      transitionDemoOrder(created.order.id, { toStatus: "CONFIRMED" }, actorId),
    ]);
    expect(confirmations.filter((result) => result.idempotent)).toHaveLength(1);
    expect(await prisma.orderStatusEvent.count({ where: { orderId: created.order.id, toStatus: "CONFIRMED" } })).toBe(1);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: created.order.publicOrderNumber, eventType: "ORDER_CONFIRMED" } })).toBe(1);
    await transitionDemoOrder(created.order.id, { toStatus: "CANCELED", reason: "Synthetic cancellation test" }, actorId);
    expect(await prisma.order.findUnique({ where: { id: created.order.id } })).toMatchObject({ fulfillmentStatus: "CANCELED", status: "CANCELLED" });
    expect(await prisma.inventoryBalance.findUnique({ where: { variantId_locationId: { variantId: transitionVariantId, locationId } } })).toMatchObject({ onHand: 1, reserved: 0 });
    expect(await prisma.stockReservation.findFirst({ where: { orderId: created.order.id } })).toMatchObject({ state: "RELEASED" });
    expect(await prisma.inventoryMovement.count({ where: { variantId: transitionVariantId, kind: "RELEASE", referenceId: created.order.publicOrderNumber } })).toBe(1);
    const before = await prisma.orderStatusEvent.count({ where: { orderId: created.order.id } });
    await expect(transitionDemoOrder(created.order.id, { toStatus: "SHIPPED" }, actorId)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect(await prisma.orderStatusEvent.count({ where: { orderId: created.order.id } })).toBe(before);
  });

  it("commits reserved stock exactly once when a demo order ships", async () => {
    process.env.NOTIFICATION_RUNTIME = "development-memory";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    clearDevelopmentNotificationInbox();
    const shippingVariantId = randomUUID();
    await prisma.variant.create({ data: { id: shippingVariantId, productId, sku: `CI-${shippingVariantId.slice(0, 8)}`, sizeLabel: "Ship", colorLabel: "Test", regularPriceMinor: 100, availableQty: 1 } });
    await prisma.inventoryBalance.create({ data: { variantId: shippingVariantId, locationId, onHand: 1, reserved: 0 } });
    const created = await createDatabaseOrder({ idempotencyKey: `ci-ship-${runTag}`, email: `${runTag}-ship@example.test`, phone: "03000000007", address: { name: "CI Ship", line1: "CI address", city: "CI" }, items: [{ variantId: shippingVariantId, quantity: 1 }] });
    expect(created.kind).toBe("created");
    if (created.kind !== "created") return;
    const actorId = randomUUID();
    await transitionDemoOrder(created.order.id, { toStatus: "CONFIRMED" }, actorId);
    await transitionDemoOrder(created.order.id, { toStatus: "PREPARING" }, actorId);
    await transitionDemoOrder(created.order.id, { toStatus: "SHIPPED" }, actorId);
    expect((await transitionDemoOrder(created.order.id, { toStatus: "SHIPPED" }, actorId)).idempotent).toBe(true);
    expect(await prisma.inventoryBalance.findUnique({ where: { variantId_locationId: { variantId: shippingVariantId, locationId } } })).toMatchObject({ onHand: 0, reserved: 0 });
    expect(await prisma.stockReservation.findFirst({ where: { orderId: created.order.id } })).toMatchObject({ state: "COMMITTED" });
    expect(await prisma.inventoryMovement.count({ where: { variantId: shippingVariantId, kind: "SHIP", referenceId: created.order.publicOrderNumber } })).toBe(1);
    expect(await prisma.notification.count({ where: { orderId: created.order.id, eventKey: "ORDER_DISPATCHED" } })).toBe(1);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: created.order.publicOrderNumber, eventType: "ORDER_DISPATCHED" } })).toBe(1);
    await processNotificationBatch(100, createNotificationProvider());
    const lifecycleNotifications = await prisma.notification.findMany({ where: { orderId: created.order.id, eventKey: { in: ["ORDER_CONFIRMED", "ORDER_STATUS_CHANGED", "ORDER_DISPATCHED"] } }, orderBy: { createdAt: "asc" } });
    expect(lifecycleNotifications).toHaveLength(3);
    expect(lifecycleNotifications.every((notification) => notification.state === "ACCEPTED")).toBe(true);
    expect(new Set(lifecycleNotifications.map((notification) => notification.dedupeKey)).size).toBe(3);
    const lifecycleKeys = new Set(lifecycleNotifications.map((notification) => notification.dedupeKey));
    expect(developmentNotificationInbox().filter((delivery) => lifecycleKeys.has(delivery.dedupeKey))).toHaveLength(3);
  });

  it("handles repeated concurrent last-unit attempts without negative stock or orphaned side effects", async () => {
    const loadVariantId = randomUUID();
    await prisma.variant.create({ data: { id: loadVariantId, productId, sku: `CI-${loadVariantId.slice(0, 8)}`, sizeLabel: "Load", colorLabel: "Test", regularPriceMinor: 100, availableQty: 1 } });
    await prisma.inventoryBalance.create({ data: { variantId: loadVariantId, locationId, onHand: 1, reserved: 0 } });
    const emails = Array.from({ length: 8 }, (_, index) => `${runTag}-load-${index}@example.test`);
    const results = await Promise.all(emails.map((email) => createDatabaseOrder({ idempotencyKey: `ci-load-key-${email}`, email, phone: "03000000003", address: { name: "CI Load", line1: "CI address", city: "CI" }, items: [{ variantId: loadVariantId, quantity: 1 }] })));
    expect(results.filter((result) => result.kind === "created")).toHaveLength(1);
    expect(results.filter((result) => result.kind === "stock")).toHaveLength(7);
    expect(results.every((result) => result.kind === "created" || result.kind === "stock")).toBe(true);
    const orders = await prisma.order.findMany({ where: { guestEmailNormalized: { in: emails } }, select: { id: true, publicOrderNumber: true } });
    expect(orders).toHaveLength(1);
    const orderIds = orders.map((order) => order.id);
    const orderNumbers = orders.map((order) => order.publicOrderNumber);
    const balance = await prisma.inventoryBalance.findUnique({ where: { variantId_locationId: { variantId: loadVariantId, locationId } } });
    expect(balance?.onHand).toBeGreaterThanOrEqual(0);
    expect(balance?.reserved).toBeGreaterThanOrEqual(0);
    expect(balance?.reserved).toBeLessThanOrEqual(balance?.onHand ?? -1);
    expect(balance?.reserved).toBe(1);
    expect(await prisma.stockReservation.count({ where: { variantId: loadVariantId } })).toBe(1);
    expect(await prisma.inventoryMovement.count({ where: { variantId: loadVariantId, referenceId: { in: orderNumbers } } })).toBe(1);
    expect(await prisma.paymentIntent.count({ where: { orderId: { in: orderIds } } })).toBe(1);
    expect(await prisma.notification.count({ where: { orderId: { in: orderIds } } })).toBe(1);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: { in: orderNumbers } } })).toBe(1);
    expect(await prisma.checkoutIdempotency.count({ where: { orderId: { in: orderIds } } })).toBe(1);
  });

  it("requires an expiring email challenge and scoped capability for guest tracking", async () => {
    process.env.CHECKOUT_RUNTIME = "database";
    process.env.CHECKOUT_TOTALS_MODE = "synthetic-zero";
    process.env.CHECKOUT_FIELD_ENCRYPTION_KEY = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
    process.env.GUEST_TRACKING_DELIVERY = "mock";
    const trackingVariantId = randomUUID();
    const email = `${runTag}-tracking@example.test`;
    await prisma.variant.create({ data: { id: trackingVariantId, productId, sku: `CI-${trackingVariantId.slice(0, 8)}`, sizeLabel: "Tracking", colorLabel: "Test", regularPriceMinor: 100, availableQty: 1 } });
    await prisma.inventoryBalance.create({ data: { variantId: trackingVariantId, locationId, onHand: 1, reserved: 0 } });
    const created = await createDatabaseOrder({ idempotencyKey: `ci-tracking-${runTag}`, email, phone: "03000000004", address: { name: "CI Tracking", line1: "CI address", city: "CI" }, items: [{ variantId: trackingVariantId, quantity: 1 }] });
    expect(created.kind).toBe("created");
    if (created.kind !== "created") return;
    const orderNumber = created.order.publicOrderNumber;
    expect(await readGuestOrder(new Request("http://localhost/api/orders/" + orderNumber), orderNumber)).toMatchObject({ kind: "invalid" });
    expect(await requestGuestTrackingVerification(orderNumber, "wrong@example.test")).toMatchObject({ kind: "accepted" });
    const requested = await requestGuestTrackingVerification(orderNumber, email);
    expect(requested.kind).toBe("accepted");
    const challenge = getMockGuestChallenge();
    expect(challenge?.code).toMatch(/^\d{6}$/);
    if (!challenge) return;
    expect(await confirmGuestTrackingVerification(orderNumber, email, "000000")).toMatchObject({ kind: "invalid" });
    const confirmed = await confirmGuestTrackingVerification(orderNumber, email, challenge.code);
    expect(confirmed.kind).toBe("accepted");
    if (confirmed.kind !== "accepted" || !confirmed.token) return;
    const authorized = await readGuestOrder(new Request("http://localhost/api/orders/" + orderNumber, { headers: { authorization: `Bearer ${confirmed.token}` } }), orderNumber);
    expect(authorized.kind).toBe("ok");
    if (authorized.kind === "ok") {
      expect(authorized.order.publicOrderNumber).toBe(orderNumber);
      expect("guestEmailNormalized" in authorized.order).toBe(false);
      expect("addressCiphertext" in authorized.order).toBe(false);
    }
    await requestGuestTrackingVerification(orderNumber, email);
    const expiredChallenge = getMockGuestChallenge();
    expect(expiredChallenge).not.toBeNull();
    const storedExpired = await prisma.guestTrackingChallenge.findFirst({ where: { order: { publicOrderNumber: orderNumber }, consumedAt: null }, orderBy: { createdAt: "desc" } });
    if (storedExpired) await prisma.guestTrackingChallenge.update({ where: { id: storedExpired.id }, data: { expiresAt: new Date(Date.now() - 1) } });
    if (expiredChallenge) expect(await confirmGuestTrackingVerification(orderNumber, email, expiredChallenge.code)).toMatchObject({ kind: "invalid" });
    expect(await readGuestOrder(new Request("http://localhost/api/orders/NOT-YOUR-ORDER", { headers: { authorization: `Bearer ${confirmed.token}` } }), "NOT-YOUR-ORDER")).toMatchObject({ kind: "invalid" });
    await requestGuestTrackingVerification(orderNumber, email);
    const limitedChallenge = getMockGuestChallenge();
    if (limitedChallenge) {
      for (let attempt = 0; attempt < 5; attempt += 1) await confirmGuestTrackingVerification(orderNumber, email, "111111");
      expect(await confirmGuestTrackingVerification(orderNumber, email, limitedChallenge.code)).toMatchObject({ kind: "invalid" });
    }
  });

  it("deduplicates verified payment webhooks and processes outbox events outside the transaction", async () => {
    const order = await prisma.order.findFirst({ where: { guestEmailNormalized: `${runTag}-tracking@example.test` }, include: { paymentIntents: true } });
    expect(order?.paymentIntents).toHaveLength(1);
    if (!order || order.paymentIntents.length !== 1) return;
    const intent = order.paymentIntents[0];
    await prisma.paymentIntent.update({ where: { id: intent.id }, data: { method: "EASYPAISA" } });
    process.env.PAYMENT_PROVIDER_RUNTIME = "mock";
    const secret = "synthetic-webhook-secret";
    const rawBody = JSON.stringify({ externalEventId: `event-${runTag}`, intentId: intent.id, providerTransactionId: `txn-${runTag}`, amountMinor: intent.amountMinor, currency: "PKR", state: "PAID" });
    expect(await processMockPaymentWebhook(rawBody, "bad-signature", secret)).toMatchObject({ kind: "rejected" });
    expect(await processMockPaymentWebhook(rawBody, mockWebhookSignature(rawBody, secret), secret)).toMatchObject({ kind: "processed" });
    expect(await processMockPaymentWebhook(rawBody, mockWebhookSignature(rawBody, secret), secret)).toMatchObject({ kind: "duplicate" });
    expect(await prisma.paymentIntent.findUnique({ where: { id: intent.id } }).then((payment) => payment?.state)).toBe("PAID");
    expect(await prisma.paymentWebhookEvent.count({ where: { providerCode: "MOCK", externalEventId: `event-${runTag}` } })).toBe(1);
    expect(await prisma.paymentTransaction.count({ where: { providerCode: "MOCK", providerTransactionId: `txn-${runTag}` } })).toBe(1);
    expect(await prisma.outboxEvent.count({ where: { dedupeKey: `payment:MOCK:event-${runTag}` } })).toBe(1);

    process.env.NOTIFICATION_RUNTIME = "mock";
    const outboxKey = `ci-outbox-${runTag}`;
    await prisma.outboxEvent.create({ data: { aggregateType: "TEST", aggregateId: runTag, eventType: "TEST_NOTIFICATION", payloadVersion: 1, payload: { synthetic: true }, dedupeKey: outboxKey } });
    let deliveryCount = 0;
    const completedBatch = await processOutboxBatch(async (event) => { if (event.dedupeKey === outboxKey) deliveryCount += 1; }, 100);
    expect(completedBatch.kind).toBe("processed");
    expect(completedBatch.completed).toBeGreaterThanOrEqual(1);
    expect(deliveryCount).toBe(1);
    expect(await processOutboxBatch(async () => { deliveryCount += 1; }, 100)).toMatchObject({ kind: "processed", claimed: 0 });
    expect(deliveryCount).toBe(1);
    expect(await prisma.outboxEvent.findUnique({ where: { dedupeKey: outboxKey } }).then((event) => event?.state)).toBe("COMPLETED");

    const deadKey = `ci-dead-${runTag}`;
    await prisma.outboxEvent.create({ data: { aggregateType: "TEST", aggregateId: runTag, eventType: "TEST_DEAD", payloadVersion: 1, payload: { synthetic: true }, dedupeKey: deadKey } });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await processOutboxBatch(async () => { throw new Error("MOCK_DELIVERY_FAILURE"); }, 1);
      await prisma.outboxEvent.update({ where: { dedupeKey: deadKey }, data: { availableAt: new Date() } });
    }
    expect(await prisma.outboxEvent.findUnique({ where: { dedupeKey: deadKey } }).then((event) => event?.state)).toBe("DEAD");
  });

  it("replays the same key without creating a second order", async () => {
    const input = { idempotencyKey: `ci-replay-key-${runTag}`, email: `${runTag}-replay@example.test`, phone: "03000000001", address: { name: "CI", line1: "CI address", city: "CI" }, items: [{ variantId: replayVariantId, quantity: 1 }] };
    const first = await createDatabaseOrder(input); const second = await createDatabaseOrder(input);
    expect(first.kind).toBe("created"); expect(second.kind).toBe("replay");
    expect(await prisma.order.count({ where: { guestEmailNormalized: `${runTag}-replay@example.test` } })).toBe(1);
    expect(await prisma.inventoryBalance.findUnique({ where: { variantId_locationId: { variantId: replayVariantId, locationId } } }).then((balance) => balance?.reserved)).toBe(1);
    expect(await prisma.stockReservation.count({ where: { variantId: replayVariantId } })).toBe(1);
  });

  it("rejects category depth beyond two and cycles at the database boundary", async () => {
    const childId = randomUUID();
    const tooDeepId = randomUUID();
    await prisma.category.create({ data: { id: childId, name: "CI child", slug: `ci-child-${childId.slice(0, 8)}`, parentId: categoryId } });
    await expect(prisma.category.create({ data: { id: tooDeepId, name: "CI too deep", slug: `ci-deep-${tooDeepId.slice(0, 8)}`, parentId: childId } })).rejects.toThrow();
    await expect(prisma.category.update({ where: { id: categoryId }, data: { parentId: childId } })).rejects.toThrow();
  });

  it("enforces inventory balance invariants in PostgreSQL", async () => {
    const invalidBalanceVariantId = randomUUID();
    await prisma.variant.create({ data: { id: invalidBalanceVariantId, productId, sku: `CI-${invalidBalanceVariantId.slice(0, 8)}`, sizeLabel: "Invalid balance", colorLabel: "Test", regularPriceMinor: 100, availableQty: 0 } });
    await expect(prisma.inventoryBalance.create({ data: { variantId: invalidBalanceVariantId, locationId, onHand: 0, reserved: 1 } })).rejects.toThrow();
  });

  it("rolls back a whole multi-line checkout when one variant is unavailable", async () => {
    const availableFirstId = randomUUID();
    const unavailableSecondId = randomUUID();
    await prisma.variant.create({ data: { id: availableFirstId, productId, sku: `CI-${availableFirstId.slice(0, 8)}`, sizeLabel: "Available", colorLabel: "Rollback", regularPriceMinor: 100, availableQty: 1 } });
    await prisma.variant.create({ data: { id: unavailableSecondId, productId, sku: `CI-${unavailableSecondId.slice(0, 8)}`, sizeLabel: "Out", colorLabel: "Rollback", regularPriceMinor: 100, availableQty: 0 } });
    await prisma.inventoryBalance.createMany({ data: [
      { variantId: availableFirstId, locationId, onHand: 1, reserved: 0 },
      { variantId: unavailableSecondId, locationId, onHand: 0, reserved: 0 },
    ] });
    const idempotencyKey = `ci-rollback-${randomUUID()}`;
    const rollbackEmail = `${runTag}-rollback@example.test`;
    const result = await createDatabaseOrder({ idempotencyKey, email: rollbackEmail, phone: "03000000002", address: { name: "CI Buyer", line1: "CI address", city: "CI" }, items: [{ variantId: availableFirstId, quantity: 1 }, { variantId: unavailableSecondId, quantity: 1 }] });
    expect(result.kind).toBe("stock");
    expect(await prisma.inventoryBalance.findUnique({ where: { variantId_locationId: { variantId: availableFirstId, locationId } } }).then((balance) => balance?.reserved)).toBe(0);
    expect(await prisma.order.count({ where: { guestEmailNormalized: rollbackEmail } })).toBe(0);
    const scopeHash = createHash("sha256").update(JSON.stringify({ email: rollbackEmail, phone: "03000000002" })).digest("hex");
    const keyHash = createHash("sha256").update(JSON.stringify(idempotencyKey)).digest("hex");
    expect(await prisma.checkoutIdempotency.count({ where: { scopeHash, keyHash } })).toBe(0);
  });
});
else describe.skip("PostgreSQL transactional checkout (requires RUN_POSTGRES_INTEGRATION=true)", () => {
  it("is not run without a real PostgreSQL integration environment", () => expect(true).toBe(true));
});
