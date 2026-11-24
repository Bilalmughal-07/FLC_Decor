# Database Design — PostgreSQL Logical Model

**Status:** production-oriented additive Prisma schema and migrations through `0004_production_database_foundation` exist. The latest migration is NOT applied/verified against a running PostgreSQL server; existing migrations and rows must be preserved. IDs follow the existing UUID-as-text convention; new timestamps use UTC `timestamptz`; money is integer PKR paisa.

See [`docs/database/EXISTING_SCHEMA_AUDIT.md`](./docs/database/EXISTING_SCHEMA_AUDIT.md), [`docs/database/DATA_DICTIONARY.md`](./docs/database/DATA_DICTIONARY.md), and [`docs/database/DB_IMPLEMENTATION_TRACKER.md`](./docs/database/DB_IMPLEMENTATION_TRACKER.md) for the actual mapping and current gate status.

## Tables and key fields
- `users(id, email_normalized UNIQUE, password_hash, status, created_at, updated_at)`; guest orders may have `user_id NULL`.
- `sessions(id, user_id FK, token_hash UNIQUE, expires_at, revoked_at, created_at)`; never store raw bearer session token.
- `mfa_factors(id, user_id FK, kind, secret_ciphertext, key_version, enabled_at, last_accepted_step)`; `mfa_recovery_codes(id, user_id FK, code_hash, used_at)`.
- `categories(id, parent_id FK nullable, name, slug UNIQUE, sort_order, status)`; enforce depth <=2 via application and DB-safe validation.
- `products(id, primary_category_id FK, name, slug UNIQUE, description, status, featured, featured_rank nullable, published_at, created_at, updated_at)`; featured rank optional implementation proposal.
- `product_categories(product_id FK, category_id FK, PRIMARY KEY(product_id, category_id))` for additional placements.
- `variants(id, product_id FK, sku UNIQUE, size_label nullable, color_label nullable, regular_price_minor, sale_price_minor nullable, available_qty, active, created_at)`; unique normalized combination per product, check nonnegative stock and sale price validity.
- `media_assets(id, object_key UNIQUE, mime, width, height, bytes, state, created_at, orphaned_at, purge_after)`; media references in `product_media(product_id, media_id, sort_order, alt_text)` and `variant_media(variant_id, media_id, sort_order)`.
- `carts(id, user_id FK nullable, guest_token_hash nullable, updated_at)` and `cart_items(cart_id, variant_id, quantity)`.
- `orders(id, public_order_number UNIQUE, user_id nullable, guest_email_normalized, contact_phone_encrypted, address_ciphertext, address_key_version, status, payment_method, currency, subtotal_minor, shipping_minor nullable, discount_minor, total_minor nullable, created_at)`.
- `order_items(id, order_id FK, variant_id FK nullable, product_name_snapshot, variant_snapshot_json, unit_price_minor, quantity, line_total_minor)`.
- `inventory_ledger(id, variant_id FK, order_id FK nullable, delta_qty, reason, actor_id nullable, created_at)`; idempotent event IDs for stock operations.
- `checkout_idempotency(id, scope_hash, key_hash, request_fingerprint, order_id nullable, state, response_snapshot, created_at, expires_at, UNIQUE(scope_hash,key_hash))`.
- `order_status_events(id, order_id FK, from_status, to_status, actor_id nullable, reason, created_at)`.
- `outbox_events(id, event_type, aggregate_id, payload, state, attempts, created_at, processed_at)`.
- `audit_events(id, actor_type, actor_id, action, target_type, target_id, safe_metadata_json, created_at)`.
- `guest_tracking_verifications(id, order_id FK, verifier_hash, expires_at, consumed_at, attempts)`; verification bound to recipient email.

## Key rules
1. Use check constraints for nonnegative inventory, positive order quantities, valid prices, and unique SKUs/variant combinations.
2. Inventory and order creation in a **single transaction** with idempotency row; write outbox event in same transaction.
3. Never hard-delete order history because product or variant is archived; preserve snapshots.
4. Shared media assets may have multiple references; purge only if zero references **at deletion time** and past 30-day orphan window.
5. Keep encrypted address fields out of plain indexes and logs; use protected lookup tokens only if genuinely needed.
6. `shipping_minor`/`total_minor` nullable in demo until shipping policy defined; **do not accept live checkout without a complete authoritative total**.
7. Avoid using generic order status transitions until a reviewed state machine is approved.

## Index candidates
- products `(status, featured DESC, published_at DESC, id)` and slug; variants `(product_id, active)`, price index as measured.
- categories parent; product_categories `(category_id,product_id)`; orders `(user_id,created_at DESC)`, `(guest_email_normalized,created_at DESC)` with privacy safeguards.
- inventory_ledger `(variant_id,created_at)`; audit `(actor_id,created_at)`; outbox `(state,created_at)`.
- Use `EXPLAIN ANALYZE` and measured workloads before introducing elaborate indexes.
- New inventory uses `on_hand`, `reserved`, and a unique variant/location balance. `availableQty` remains for a migration compatibility period; runtime cutover awaits balance reconciliation and PostgreSQL tests.

## Transaction pseudocode
```
BEGIN;
claim_or_load_idempotency(scope, key, fingerprint);
if completed: return stored result; if fingerprint mismatch: 409;
validate active variants and authoritative prices;
for variant_id in sorted(ids): conditional_decrement_stock_or_fail;
insert order + order_items + inventory_ledger + outbox;
mark idempotency completed with response/order_id;
COMMIT only under configured durability guarantees;
```
Unknown commit outcome: retry the **same key** and resolve committed result, never create new key automatically.
