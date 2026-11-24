# Database test evidence

Updated: 2026-10-26. This file distinguishes executed checks from schema intent.

| Gate | Status | Evidence |
|---|---|---|
| Prisma schema validation/client generation | VERIFIED | `npm run db:validate` passed after the DB foundation expansion using Prisma 7.10.1 and a synthetic local `DATABASE_URL`. |
| SQL migration applies on real PostgreSQL | NOT VERIFIED | Docker daemon unavailable. Local port 5432 has a PostgreSQL listener; the read-only probe using documented demo credentials returned `28P01`, so no migration or write was sent. |
| Local PostgreSQL connection identity | BLOCKED | The documented `flc/flc_dev_only` URL failed authentication; database owner/schema contents remain unknown. |
| Foreign key/check/category depth constraints | NOT VERIFIED | Requires migration application and PostgreSQL constraint integration tests. |
| Last-unit concurrent reservation | NOT VERIFIED | `tests/integration/postgres.test.ts` now tests balances, reservations, movements, pending COD intent and outbox; requires disposable PostgreSQL. |
| Multi-line rollback/idempotency restart | NOT VERIFIED | Integration source now tests rollback and durable replay; process restart/two-instance unknown-commit tests still need implementation and a real DB. |
| Category depth/cycle and balance checks | NOT VERIFIED | Integration source covers database trigger/check rejection; migration and tests have not run on PostgreSQL. |
| Payment webhook, refund and COD reconciliation | BLOCKED | No payment runtime/provider or approved collection/refund policies. |
| Backup restore and key recovery | BLOCKED | No selected production provider, backup target, recovery key process or approved RPO/RTO. |

After the database foundation code changes: `npm run typecheck` PASS, `npm run lint` PASS, `npm test` PASS (12 passed, 1 PostgreSQL integration test file skipped). These do not substitute for the gates above. Payment, backup, restore and performance gates remain blocked/unverified.
