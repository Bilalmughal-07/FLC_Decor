# Database data dictionary

All IDs are UUID strings in Prisma (`TEXT` SQL storage in current history). All timestamps are PostgreSQL UTC timestamps; new foundation timestamps use `TIMESTAMPTZ`. Monetary values are integer PKR paisa (`currency='PKR'`). All new tables receive explicit FK actions, checks and indexes in migration `0004_production_database_foundation`.

## Current tables

Current tables and fields are inventoried in [`EXISTING_SCHEMA_AUDIT.md`](./EXISTING_SCHEMA_AUDIT.md). Existing Prisma table names are case-sensitive quoted model names. Key tables: `User`, `Session`, `MfaFactor`, `MfaRecoveryCode`, `PasswordResetToken`, `Category`, `Product`, `ProductCategory`, `Variant`, `MediaAsset`, `ProductMedia`, `VariantMedia`, `Cart`, `CartItem`, `Order`, `OrderItem`, `InventoryLedger`, `CheckoutIdempotency`, `GuestTrackingVerification`, `OrderStatusEvent`, `AuditEvent`.

## Added tables (migration 0004)

| Table | Primary fields | Null/default and constraints | Delete policy / indexes |
|---|---|---|---|
| `CustomerProfile` | id, external auth UUID, displayName, normalizedEmail/Phone, status | auth UUID unique nullable; email normalized by application; status ACTIVE default | No auth FK; order/address relations use `SET NULL` only where snapshots remain |
| `CustomerAddress` | customerId, recipient names, address lines, city, region/postal, country, phone | country defaults PK; required first/last/address1/city/phone | customer-owned; cascade with profile only subject to retention review |
| `CustomerConsent` | profile, purpose, channel, version, granted/revoked, evidenceRef | append-only consent history | profile restrictive; profile ref index |
| `Role`, `Permission`, `RolePermission`, `UserRole` | codes and assignment metadata | role/permission codes unique; composite assignment unique | revoked assignment retained; grantor external UUID nullable |
| `InventoryLocation` | code, name, active | code unique; seed `MAIN` is development baseline only | Restrict while balances/movements reference |
| `InventoryBalance` | variant, location, onHand, reserved, version | unique variant/location; onHand>=0; reserved>=0 and <=onHand | restrict both parents; available is computed as onHand-reserved |
| `InventoryMovement` | variant/location, onHand/reserved deltas, type, reference, actor, reason, eventId | eventId unique; at least one delta nonzero; immutable by application contract | restrict variant/location; indexes by variant/time and reference |
| `StockReservation` | order, variant/location, quantity, state, timestamps | quantity>0; state ACTIVE/COMMITTED/RELEASED; unique order/variant/location | restrictive order/variant/location; state/order indexes |
| `Order` extensions | fulfillmentStatus, paymentStatus, source, countryCode, customerProfileId, placedAt | New writes set separate status enums; legacy fulfillment/payment status may remain NULL where old data cannot be mapped safely; country is PK | Customer profile nullable; indexes support keyset order lists |
| `OrderAddressSnapshot` | order, names/address/country/phone | one per order; immutable snapshot; country PK default | unique order, RESTRICT |
| `Shipment`, `ShipmentItem`, `ShipmentTrackingEvent` | courier references, state/times, item quantities and external event IDs | external provider IDs unique where scoped; positive quantity | order/item relations restrictive; shipment event unique provider/event |
| `PaymentIntent` | order, method/provider, amount/currency/state, idempotency ref | amount>=0, currency PKR, unique intent key; COD begins pending/unpaid | order RESTRICT; order/state index |
| `PaymentAttempt` | intent, request id, state/code, timestamps | request ID nullable unique per provider when present | intent RESTRICT; indexed by intent/time |
| `PaymentTransaction` | attempt, provider transaction ID, type, amount/currency/time | provider/reference unique when present; amount>=0 | append-only; restrictive attempt FK |
| `PaymentWebhookEvent` | provider/event ID, signature state, payload digest, result/times | provider + external event unique; bounded sanitized digest metadata only | append-only; provider/event unique |
| `Refund` | order/transaction, amount, reason/state/provider ref | amount>0; over-refund checked transactionally | restrictive financial FKs |
| `PaymentReconciliation` | provider/period/totals/status/actor | integer totals, explicit period | period/provider index |
| `OutboxEvent` | aggregate, type, payload version, dedupe key, state, attempts, available/processed | unique dedupe key; attempts>=0 | independent durable row; state/available index |
| `JobAttempt` | outbox, worker, attempt, result/error category/times | positive attempt; safe error category only | outbox RESTRICT; indexed outbox/attempt |
| `Notification`, `NotificationDelivery` | event/channel/recipient ref/dedupe/state and provider attempts | unique dedupe; no secret or full message payload | delivery restricts notification; state/time indexes |
| `GuestTrackingChallenge` | order, channel/destination hash, challenge hash, expiry/use/attempts | no plaintext verifier; attempts>=0 | order RESTRICT; expiry index |
| `GuestTrackingCapability` | order, token hash, scope, expiry/revocation/use | token hash unique; no raw token stored | order RESTRICT; token hash/expiry index |
| `AnalyticsDailySales` view | day/currency and order/payment/refund categories | derived view, no duplicated source of truth | calculated from canonical order/payment records |

`*` State is modeled as scalar enum-backed fields on `Order` where Prisma relation normalization is unnecessary. Order-line snapshots include SKU/variant attributes in snapshot JSON plus unit price, quantity, line total, discount, tax and currency. Exact fields are in `prisma/schema.prisma`; no runtime claims are implied by schema presence.

## Existing table extensions

`Variant.availableQty` remains for backward compatibility during migration. New balances are authoritative only after backfill reconciliation and tested application cutover. `MediaAsset` gains checksum/owner/processing metadata. `Order` gains fulfillment/payment/source/country/order timestamp fields while legacy `status` and `paymentMethod` remain during transition. `GuestTrackingVerification` gains destination hash and purpose. Existing snapshots are not rewritten.
