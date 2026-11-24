# Database transaction design

This file documents target SQL behavior. The current checkout route still uses the local demo adapter by default; the database adapter is development-only and uses synthetic zero shipping/tax. No statement here certifies production transaction behavior until PostgreSQL integration tests pass.

## Ready-stock reservation (target)

1. Validate request/contact/country and compute product prices on the server. Fail closed while shipping/tax policy is unavailable.
2. Normalize idempotency scope and request, persist only SHA-256 hashes. Insert/claim `(scope_hash,key_hash)` under a unique constraint. On conflict, lock/read the existing row; same fingerprint returns stored result, different fingerprint returns 409.
3. Begin SERIALIZABLE transaction; sort variant UUIDs and lock corresponding `InventoryBalance` rows in stable order (`SELECT ... FOR UPDATE`). Require `on_hand - reserved >= requested quantity` for every line.
4. Increase reserved quantities conditionally, insert ACTIVE reservations and corresponding immutable movements. Do not decrement physical on-hand at placement.
5. Insert order/contact/address/item snapshots, initial status event, unpaid payment intent, audit event, and notification outbox event in the same transaction.
6. Complete idempotency result and commit. Acknowledge only after successful commit. Retry only serialization/deadlock errors with the same key and a bounded retry count. For unknown commit, query durable idempotency before any reattempt.
7. Deliver notifications asynchronously after commit. A provider outage cannot undo an order.

Shipping/tax and order/COD acceptance policy currently block runtime enabling. No external request may occur inside the transaction.

## Inventory lifecycle

- Shipment commits a reservation once: decrement on-hand and reserved together; record movement and shipment/status/audit/outbox rows atomically.
- Cancellation may release only an ACTIVE reservation after an approved transition. No generic COD unpaid expiry is permitted.
- Return stock is added only after physical receipt and inspection; refund does not itself add inventory.
- Admin adjustment locks the balance, checks resulting on-hand/reserved invariant, records movement and audit event in one transaction.
- Every operation has a unique event/dedupe key; ledger/balance reconciliation is required.

These lifecycle operations are not currently connected to admin/runtime routes.

## Payment and callback transactions

Create payment intent/attempt durably before provider initiation. Provider calls happen outside a long transaction and use adapter-owned idempotency. Webhook processing verifies signature, provider, event ID, order, exact amount/currency, and allowed state transition; insert dedupe row, append transaction, update derived state, audit and outbox atomically. Client redirects never prove payment. COD intent begins PENDING and becomes collected only through authorized reconciliation. Provider and policy gaps keep all live payment activation disabled.

## PostgreSQL operations

Use a bounded pooled application connection and a direct migration connection where the managed provider requires transaction/session pooling separation. `DATABASE_URL` is runtime/pooler URL; `DIRECT_DATABASE_URL` is migration connection placeholder. Configure pool sizes against provider limits and app instance count. Never place credentials in CI logs. `prisma migrate deploy` is the migration method; `db push` is not used for production.
