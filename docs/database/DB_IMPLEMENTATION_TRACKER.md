# Production database implementation tracker

Updated: 2026-10-26. Status vocabulary: `NOT_STARTED`, `IN_PROGRESS`, `VERIFIED`, `BLOCKED`. `VERIFIED` requires executed evidence; Prisma generation alone does not satisfy a database gate.

| Phase/requirement | Status | Files/evidence | Remaining gate |
|---|---|---|---|
| DB-0 existing schema audit and safe plan | VERIFIED (documentation/source inspection) | [`EXISTING_SCHEMA_AUDIT.md`](./EXISTING_SCHEMA_AUDIT.md), [`ERD.md`](./ERD.md), [`DATA_DICTIONARY.md`](./DATA_DICTIONARY.md) | Owner review of payment scope conflict before payment activation. |
| DB-1 PostgreSQL config/migration/tooling | IN_PROGRESS | `prisma.config.ts`, `docker-compose.yml`, migration `0004_production_database_foundation`, `.env.example`; `npm run db:validate` PASS | Apply migration on a disposable real PostgreSQL instance; run DB constraints. |
| DB-1 environment/role/pool separation | IN_PROGRESS | PrismaPg pool and direct URL placeholder documented | Provider-specific pooler/direct URL, least privilege roles and secret configuration. |
| DB-2 identity/catalog/category integrity | IN_PROGRESS | Prisma + SQL migration | Execute trigger/cycle/depth/placement tests on PostgreSQL; external auth selection. |
| DB-2 ready-stock balances/reservations/ledger | IN_PROGRESS | Prisma models, additive balance backfill, conditional reservation transaction and integration test cases | Real concurrent reservation/adjust/commit/release/reconciliation tests; migrate runtime away from legacy `availableQty`. |
| DB-3 orders/idempotency/tracking schema | IN_PROGRESS | Prisma state/address/challenge/capability models | Durable transaction integration, restart/two-instance tests, provider-bound tracking. |
| DB-4 payments/notifications/outbox schema | IN_PROGRESS | Prisma models; no live provider adapters | Owner policy and merchant approvals; webhook/outbox failure/replay tests. |
| DB-5 RBAC/audit/analytics schema | IN_PROGRESS | Role/permission tables, audit extensions and placed-value view | Authorization tests, append-only DB roles and analytics reconciliation. |
| DB-6 backup/restore/performance/hosting | BLOCKED | [`MIGRATION_AND_BACKUP_RUNBOOK.md`](./MIGRATION_AND_BACKUP_RUNBOOK.md) | Provider, restore target, RPO/RTO, load runner and staging not available. |
| Live checkout | BLOCKED | Production route guard remains | All release gates and owner business approvals. |

The currently running site remains on the demo store by default. A schema migration does not switch the runtime or enable live checkout.
