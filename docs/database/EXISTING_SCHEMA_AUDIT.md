# Existing schema audit and migration plan

Audit date: 2026-10-26. The repository was inspected before adding migrations. The executable starting point is Prisma 7.10.1 with PostgreSQL; `prisma/migrations/0001_init` through `0003_identity_controls` are the existing migration history. No reset, drop, truncate, or `db push` is part of this work.

## Existing model inventory

| Prisma model / SQL table | Existing contents | Important constraints and concerns |
|---|---|---|
| `User` | Email, demo password hash, role/status and timestamps | `email` unique; custom credentials conflict with the documented preferred Supabase Auth boundary. Keep only for legacy/local demo; new production profile model references external auth UUID. |
| `Session` | Hashed token, user, expiry, revocation | Unique token hash; cascade to `User`; local auth is process memory and does not use this runtime table. |
| `MfaFactor`, `MfaRecoveryCode`, `PasswordResetToken` | Local auth persistence-shaped tables | Secret encryption/provider lifecycle incomplete; do not treat as production identity. |
| `Category` | Parent, name, globally unique slug, order/status | Self-FK, parent index; no database depth/cycle enforcement. |
| `Product` | Primary category, slug/name/description/status/featured | Unique slug, category FK, status/feature index. |
| `ProductCategory` | Additional placements | Composite primary key. Primary placement consistency is not enforced. |
| `Variant` | SKU, size/color, regular/sale price, `availableQty`, active | SKU unique; nullable-combination unique has PostgreSQL NULL caveat; available count is denormalized and has no movement/reservation accounting. |
| `MediaAsset` | Object key, image metadata and lifecycle timestamps/state | Object key unique; no checksum, owner or processing error; reference lifecycle code is absent. |
| `ProductMedia`, `VariantMedia` | Shared media relations and sort order | Composite keys and restrictive media deletion. No unique ordering/primary image invariant. |
| `Cart`, `CartItem` | Optional user or hashed guest token, variant quantities | Guest token unique; cart line unique; quantity positive check. Cart update/expiry semantics minimal. |
| `Order` | Public number, nullable user, email/phone/address snapshots, one legacy status/payment method, totals | Public number unique; PII fields encrypted except normalized email; order state conflates fulfillment/payment; incomplete total allowed. |
| `OrderItem` | Product/variant/price/quantity snapshots | Order FK currently cascades; historical order deletion should be prevented. |
| `InventoryLedger` | Quantity delta, reason, order, unique event ID | Delta has no balance model or reservation linkage. |
| `CheckoutIdempotency` | Hashed scope/key/fingerprint and response snapshot | Unique scope/key; order FK set-null makes history vulnerable to order deletion. |
| `GuestTrackingVerification` | Hashed verifier, expiry, consumption, attempts | No destination hash, challenge purpose, request limiting state, or separate scoped capability. |
| `OrderStatusEvent` | From/to status, actor, reason/time | Not append-only enforced; statuses are strings and no status/payment separation. |
| `AuditEvent` | Actor/action/target/safe JSON/time | Mutable by DB owner; no request ID or append-only guard. |

The initial SQL creates 18 application tables; later migrations add identity tables and order tax. Existing migrations are retained unchanged. `DATABASE_URL` is supplied via local environment and is not copied into this document.

## Proposed-to-existing mapping

| Spec entity | Existing mapping / action |
|---|---|
| Auth user / customer profile | Preserve `User` for legacy demo. Add `CustomerProfile.authUserId` UUID reference (no cross-schema FK) for the selected external auth authority; no duplicate production password/session/MFA tables are introduced. |
| Roles and permissions | Add normalized `Role`, `Permission`, `RolePermission`, and `UserRole` tables; role assignment is app-authorized and audited. Existing `User.role` remains legacy only. |
| Addresses and consent | Add customer-scoped saved addresses and versioned consent events. Order address remains immutable snapshot. |
| Product/category/variant | Extend existing models; retain UUID IDs and slugs/SKUs. Add category depth trigger and primary/additional placement consistency guard. |
| Media | Extend `MediaAsset` metadata/checksum/owner; retain shared reference join models. Storage remains external and disabled until configured. |
| Inventory | Add location, balance, immutable movement and reservation tables. Backfill the initial location balance from current `Variant.availableQty` without deleting/changing the legacy field; runtime cutover requires reconciliation and integration tests. |
| Cart | Extend `Cart` with currency/status/expiry; preserve existing lines and unique constraint. |
| Orders | Retain public order number and immutable current snapshots. Add separate fulfillment/payment state, country/address detail snapshots, placed time, reservations, shipments and event tables. Keep legacy status/payment fields during compatibility window. |
| Payments | Add intents, attempts, append-only transactions, webhook dedupe, refunds and reconciliation tables. No gateway integration, credentials, success simulation or live payment path is enabled. |
| Notifications/jobs | Add transactional outbox, job attempts, notification and delivery rows. No provider worker is enabled in this phase. |
| Idempotency/tracking | Preserve `CheckoutIdempotency`; add purpose/destination fields to the existing verification model and a separate hashed scoped capability table. Runtime issuance remains disabled pending provider/security tests. |
| Analytics | Start with read-only SQL views over canonical order/payment/inventory facts, no duplicated source-of-truth aggregates. |

## Safe migration and preservation plan

1. Apply additive migration `0004_production_database_foundation`; retain all existing tables, rows and legacy columns.
2. Create one inactive-until-configured inventory location. Backfill one balance per existing variant using `availableQty` as `onHand`, `reserved=0`. Insert a `BASELINE_IMPORT` movement with deterministic unique event ID per variant.
3. Add new order state/address fields with conservative defaults that represent existing rows; do not rewrite `Order.status`, payment state or financial values.
4. Add DB checks and a category trigger. Validate current rows before adding constraints; migration aborts with explicit diagnostics on invalid data rather than repairing or deleting it silently.
5. Review foreign keys that currently cascade from order to order item/status/tracking. A later migration can replace with restrictive semantics only after production data audit; this additive foundation does not remove these current constraints.
6. Deploy compatible readers/writers, reconcile `Variant.availableQty` against balances and movement sums, then plan a separately reviewed cutover/removal. Never enable database checkout based on schema creation alone.
7. Take and verify a provider backup before applying to any non-disposable database. The local dev schema may be migrated forward; production resources and credentials are not available here.

## Conflicts and owner decisions

- `02_SRS.md` says COD is the only initial payment option; the newer production database addendum names COD, Easypaisa, JazzCash, and cards as launch scope, while explicitly requiring approved merchant integrations. Schema supports the methods, but only COD is represented in the existing demo and all payment activation remains blocked pending owner/merchant decisions.
- The approved inventory direction is READY-STOCK-ONLY. This is modeled as physical on-hand and reserved quantities; no preorder, negative balance or manufacturing behavior is added.
- Shipping/courier/tax, reservation expiry, COD confirmation/collection, returns/refunds/cancellation/status transitions, retention/privacy, SMS/email providers, analytics definitions, first warehouse, and RPO/RTO remain `NOT_CONFIGURED`.
- Supabase Auth is preferred by architecture, but is not provisioned. Production database profiles reference an external UUID; current local demo auth remains isolated and is not a production identity authority.
- Database phase is not launch approval. Live checkout remains disabled.
