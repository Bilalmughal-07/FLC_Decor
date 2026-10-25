# API Specification — Proposed v1 REST Contract

Base prefix `/api/v1`. JSON, UTC ISO timestamps, currency `PKR`, integer minor units. OpenAPI YAML to be generated alongside implementation. All endpoints are proposals; ensure business-policy TODOs stay explicit.

## Public catalog
- `GET /categories` — parent/subcategory tree.
- `GET /products?q=&category=&minPrice=&maxPrice=&size=&color=&inStock=&sort=&cursor=` — pagination and valid combined-variant filters.
- `GET /products/:slug` — product, variants, gallery, inventory availability.
- `GET /featured` — curated products (or reuse catalog filters).

## Cart
- `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:id`, `DELETE /cart/items/:id` — guest cookie/session or customer cart; quantities validated.
- Cart prices are estimates; no stock reservation.

## Checkout and orders
- `POST /checkout/quote` — server-authoritative item prices and configured shipping/tax/discount; if shipping TBD, return `checkoutUnavailable` for live mode.
- `POST /checkout/orders` — required `Idempotency-Key` header, validated contact/delivery details, COD only, atomic transaction.
- `GET /orders/:id` — authenticated owner only.
- `POST /guest-orders/verify/request` — rate-limited, send email challenge without revealing existence.
- `POST /guest-orders/verify/confirm` — verify expiring code/token, issue limited order-view capability.
- `GET /guest-orders/:publicOrderNumber` — only with valid scoped verified capability.

## Identity
- `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/password-reset/request`, `/auth/password-reset/confirm`.
- `GET /account/me`, `GET /account/orders`, `POST /account/mfa/enroll`, `/account/mfa/verify`, `/account/mfa/disable`, `/account/mfa/recovery`.
- `POST /admin/auth/login`, `/admin/auth/mfa/verify`, `/admin/auth/recovery` (controlled, audited).

## Admin (session + authorization + mandatory MFA)
- `GET/POST /admin/products`, `GET/PATCH /admin/products/:id`, `POST /admin/products/:id/archive`.
- `GET/POST/PATCH /admin/categories`, `GET/PATCH /admin/variants/:id`.
- `POST /admin/inventory/adjustments` — audited, concurrency safe.
- `POST /admin/media/upload-intents`, `POST /admin/media/:id/finalize`, `GET /admin/media`, `DELETE /admin/media/:id` — reference-safe cleanup.
- `GET /admin/orders`, `GET /admin/orders/:id`, `POST /admin/orders/:id/transitions` — reject until status policy approved.
- `GET /admin/dashboard`, `GET /admin/audit`.

## Error contract
```
{ "error": { "code": "INSUFFICIENT_STOCK", "message": "Selected variant is unavailable", "requestId": "...", "details": {} } }
```
Use `400` validation, `401` auth, `403` authorization, `404` not found, `409` conflict/idempotency/stock, `422` invalid state, `429` throttling, `503` temporarily unavailable/durability unsafe. Avoid leaking order existence, MFA factors or internal stack traces.

## Idempotency contract
Scope key by verified customer or secure guest checkout identity; bind request fingerprint; return same order/result on same key + payload; conflict on changed payload. Store outcome transactionally. Preserve deduplication across failover and for a documented retry window; never expire a key while the same operation can legitimately be retried.

## Security
Session cookie HttpOnly, Secure, SameSite; CSRF on state changes; CORS restrictive; validation on every boundary; rate limit by endpoint/IP/session/account with proxy-aware IP handling; sensitive data encrypted at rest and redacted in logs.
