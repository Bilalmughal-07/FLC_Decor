# FLC Decor Architecture

## Current local demo

The current implementation is a single Next.js App Router application with TypeScript route handlers and a small domain layer. It is intentionally local-first:

`Browser → Next.js UI → route handlers → demo domain adapter`

Catalog fixtures live in `lib/catalog.ts`. Demo order state lives in `lib/demo-store.ts` and is process-local. It is protected by an in-process promise lock for deterministic local tests but is not a database transaction, shared session store, or production durability boundary.

## Preferred production target

`Browser → Next.js server/application boundary → authenticated services → PostgreSQL/Supabase → R2 media`

- Supabase Auth owns identity; the server validates the authenticated identity and performs privileged operations.
- PostgreSQL stores catalog, variants, carts, orders, idempotency records, audit events, status history and outbox events.
- R2 stores approved product media. Upload intents are server-authorized; objects are quarantined until validated and re-encoded.
- External email/courier/WhatsApp actions occur after the database transaction through an outbox worker.
- Cloudflare Workers are a deployment candidate only after Next.js runtime compatibility, server package support, connection behavior and commercial terms are verified against current official documentation.

## Trust boundaries

1. Browser input is untrusted. It never supplies authoritative price, stock, role, status transition or media approval.
2. Public catalog reads may be cached; customer/order/admin data must not be publicly cached.
3. Server-only Supabase/Postgres/R2 keys never enter client bundles.
4. Admin actions require authenticated identity, server-side role checks, mandatory MFA and audit logging.
5. Guest order details require a short-lived email-verified capability; order number alone is insufficient.

## Checkout transaction

In production, a single PostgreSQL transaction must claim the scoped idempotency key, lock or conditionally decrement variants in deterministic order, insert the immutable order/item snapshots, write inventory ledger and outbox rows, and store the response. No third-party network call may occur before commit. If durability is unsafe, the service fails closed; if the client loses the response, the same idempotency key resolves the original outcome.

## Failure modes

- Database unavailable/unsafe: reject new critical writes with 503; do not claim success.
- Outbox provider unavailable: keep the committed order and retry idempotently; do not roll back the order.
- Media processing failure: leave the object pending/quarantined and do not publish its reference.
- Session/rate-limit store unavailable: fail closed for privileged writes and sensitive auth operations.
- App instance restart in the current demo: synthetic orders disappear. This is an explicit local limitation, not an acceptable production behavior.

## Environment separation

`development`, `staging` and `production` must have distinct databases, R2 buckets, Auth projects, secrets, email identities and admin identities. Migrations run as a controlled release step, never as destructive application startup synchronization.
