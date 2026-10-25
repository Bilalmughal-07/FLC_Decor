# System Architecture Proposal — FLC Decor

**Status: proposed design, not an approved final infrastructure topology.**

## Recommended modules
- **Web:** Next.js + TypeScript (SSR/SSG where suitable; client-side interactive product selection).
- **API:** NestJS TypeScript modular monolith; modules Auth, Catalog, Categories, Media, Cart, Checkout, Orders, Inventory, Admin, Audit, Notifications.
- **Database:** PostgreSQL, Prisma for ordinary queries and explicit transaction-safe SQL where required.
- **Storage:** object storage for media, optimized CDN/public media endpoint.
- **Async work:** reliable jobs for image processing, notifications, cleanup and retries; transactional outbox pattern when database commit must trigger side effects.
- **Shared state:** production-compatible shared session and rate-limit store; exact service selected later.

## Core flow
Browser → Web UI → authenticated API → PostgreSQL.  
Admin upload → isolated pending object → validate/decode/re-encode → approved media object → media reference transaction → CDN delivery.  
Checkout → validate price/stock/address → DB transaction [idempotency + order/items + stock decrement + reservation/ledger + outbox] → durable commit → return success → async email/courier actions.

## Checkout consistency invariants
- Lock/conditionally update exact variant rows (`UPDATE ... SET available = available - qty WHERE id = ... AND available >= qty RETURNING ...`).
- Lock variants in deterministic order to limit deadlocks. Unique index on scoped idempotency key; bind request fingerprint; replay original outcome.
- Snapshot price/product names and currency in order items; integer minor units, no floats for money.
- Roll back all order/stock changes on any failure. Never trust frontend totals.
- Strong acknowledged-commit durability and failover require a specifically validated production DB configuration; generic free PostgreSQL does **not** satisfy this automatically.

## Operational principles
- Separate development, staging and production environments and credentials.
- Health/readiness checks, graceful shutdown, backward-compatible migrations, structured logs, request correlation IDs, safe retries, outbox and alerts.
- Rolling releases and automatic app/database failover are **production targets**; verify with actual infrastructure tests.
- Never expose admin routes without server-side authorization; separate store-admin privileges from cloud/deployment privileges.

## Open architecture decisions
Cloud provider/region, database HA topology, session store, queue implementation, CDN, email provider, object storage provider, DNS, monitoring vendor, production budget. Avoid selecting based solely on free-tier availability.
