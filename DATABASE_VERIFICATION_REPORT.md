# FLC Decor Database Verification Report

**Assessment: PARTIALLY VERIFIED**  
**Verification date:** 2026-10-26  
**Scope:** Database schema, migrations, transaction behavior, authorization/data isolation, payment event handling, and backup/restore. Frontend and production checkout were out of scope and were not modified or enabled.

## Executive summary

The Prisma schema passes validation and the application’s non-database checks have passed in a prior recorded run. PostgreSQL-dependent verification is incomplete: the integration suite was skipped because a usable, isolated PostgreSQL database could not be authenticated. No migration was applied to an unknown database. The command runner failed to start during this verification turn, preventing a fresh inspection and further test execution. Therefore the database is **not production-verified**.

## Tests executed

| Check | Result | Evidence / limitation |
|---|---|---|
| Prisma schema validation and client generation (`npm run db:validate`) | PASS (recorded prior run) | Prisma reported schema valid and generated client v7.10.1. Not rerun in this turn because command execution was unavailable. |
| TypeScript typecheck (`npm run typecheck`) | PASS (recorded prior run) | Not rerun in this turn. |
| Lint (`npm run lint`) | PASS (recorded prior run) | Not rerun in this turn. |
| Unit test suite (`npm test`) | PASS with one skipped integration suite (recorded prior run) | 12 tests passed; PostgreSQL integration file skipped. |
| Security dependency audit (`npm run security:audit`) | PASS (recorded prior run) | 0 reported dependency vulnerabilities at that time; this is not a database security assessment. |
| Production build (`npm run build`) | PASS (recorded prior run) | Build passed before the last local build-directory configuration change; not rerun in this turn. |
| Browser end-to-end suite (`npm run test:e2e -- --reporter=line`) | PASS (recorded prior run) | 6 passed using isolated `.next-e2e` build output. Does not exercise PostgreSQL transaction behavior. |
| PostgreSQL integration suite (`npm run test:integration`) | NOT VERIFIED | Suite skipped because no authenticated, isolated PostgreSQL test target was available. |
| Documented local PostgreSQL connection | FAIL | Read-only connection to `localhost:5432/flcdecor` using documented local development credentials returned PostgreSQL `28P01` password authentication failure. No SQL writes were made. |
| Migration execution on real PostgreSQL | NOT RUN | No migration was applied. An unknown local database was not treated as a safe disposable test target. |
| Backup and restoration | NOT RUN | No verified database target or backup/restore execution was available. |
| Fresh verification commands in this turn | BLOCKED | `exec_command` failed before starting with `helper_unknown_error: setup refresh had errors`, including when using an explicit PowerShell executable. |

## Schema coverage review

Recorded implementation work includes Prisma models and an additive migration for:

- Customer profiles, addresses, consent records, roles, permissions, and role assignments.
- Inventory locations, per-variant balances, stock movements, and reservations.
- Order status/payment state extensions, immutable order-address snapshots, and order items with price/tax/currency fields.
- Shipments, payment intents/transactions/reconciliation, transactional outbox/job attempts, notifications/delivery attempts, guest tracking capabilities, and system settings.
- Media metadata, cart state, and audit/event request identifiers.

The migration was designed to preserve the legacy `Variant.availableQty` and existing order status values while adding the new inventory and fulfillment structures. It includes foreign keys, checks, indexes, category-cycle/depth protection, data backfill, role/permission vocabulary, and a placed-value analytics view. The application checkout path was changed to reserve from `InventoryBalance` and create the order, address snapshot, pending COD intent, reservations, movements, outbox record, notification metadata, audit entry, and idempotency result within a database transaction.

This is a source/schema review summary, not proof that the SQL applies cleanly or that runtime constraints behave as intended on the deployed PostgreSQL version. The migration includes PostgreSQL-specific SQL (including `NULLS NOT DISTINCT`, which requires PostgreSQL 15 or newer); deployment server version compatibility must be confirmed. Custom triggers, view and some SQL-only constructs are not fully represented by Prisma schema models and need explicit migration drift checks.

## Required behavioral tests

| Requirement | Result | Evidence / limitation |
|---|---|---|
| Concurrent purchase of last available unit | NOT VERIFIED against PostgreSQL | Integration test source was added to assert only one reservation succeeds, but the PostgreSQL suite was skipped. |
| Duplicate checkout and durable idempotency | NOT VERIFIED against PostgreSQL | Test source covers replay, but durable behavior/restart persistence has not been run against a database. |
| Atomic order, stock movement, payment, history, outbox, and idempotency state | NOT VERIFIED against PostgreSQL | Transactional implementation and rollback test source exist; no database execution evidence. |
| Guest/customer data isolation | NOT VERIFIED | No live database authorization/isolation tests were executed. Do not infer row-level security from application-level checks. |
| Admin role/permission enforcement and unauthorized access | NOT VERIFIED | Role/permission schema vocabulary is present, but no live permission integration test evidence is recorded. |
| Payment webhook deduplication | NOT VERIFIED | Payment/reconciliation schema is present; there is no recorded live webhook duplicate-delivery test or proof of an enforced unique provider event key. |
| Database backup and restore | NOT VERIFIED | No backup artifact was created and restored. |

## Security findings

1. **Critical verification gap: PostgreSQL behaviors have not been exercised.** Transaction locking, constraints, rollback, privileges, and migration compatibility remain unproven until integration tests run against the supported PostgreSQL version.
2. **Access control is not proven by the role schema.** Verify actual guards and database credentials/privileges. If direct database access is in scope for untrusted tenants, establish and test database-enforced isolation (for example, PostgreSQL row-level security with a non-bypass application role) rather than relying only on application predicates.
3. **Payment webhook replay protection is unverified.** Confirm a provider-scoped unique event identifier, atomic event claim plus state update, signature validation, and duplicate delivery behavior before enabling any provider.
4. **Sensitive order address data is represented as encrypted snapshot fields.** Verify encryption/decryption key management, rotation, redaction from logs, and database backup protection; schema field names alone do not prove encryption is active.
5. **Production checkout must remain disabled.** Payment providers, real customer messaging, shipping/tax rules, and production credentials are not configured or validated.

No exploit was confirmed in this turn because live database access and fresh code inspection were unavailable.

## Performance findings

- No production-like dataset, query plan, connection-pool load, or concurrent checkout benchmark was run.
- The application pool was configured with a bounded maximum (default 10) and validation for configured values from 1 through 50; effective sizing must be coordinated with the deployment connection limit and any pooler.
- Index and uniqueness definitions have not been validated against real query plans or workload volume.
- The category mutation trigger serializes mutations with an advisory transaction lock; contention impact has not been measured.
- No latency or throughput claims are made.

## Remaining production blockers

1. Provide an isolated PostgreSQL 15+ verification database with known credentials and a clean/resettable schema; run the complete migration chain and inspect the resulting schema and data.
2. Run the integration suite on that database, including concurrent last-unit checkout, idempotent replay after reconnect/restart, rollback consistency, category constraints, and invariant queries.
3. Add and execute explicit database tests for customer/guest isolation, admin authorization, payment webhook deduplication, and unauthorized database roles.
4. Execute and document a real backup plus restore drill, including integrity checks and recovery timing; keep backup secrets and artifacts protected.
5. Confirm migration deploy strategy, PostgreSQL version, pooler/connection settings, migration drift, restore procedure, and operational monitoring.
6. Resolve provider and operational configuration (payment methods, shipping/tax, contacts, retention, and production credentials) without substituting demo values. Keep production checkout disabled until these requirements pass.
7. Rerun lint, typecheck, unit tests, schema validation, build, and E2E after final configuration changes; the latest recorded passes predate those final changes.

## Final assessment

**PARTIALLY VERIFIED.** The schema and non-PostgreSQL checks have useful recorded passing evidence, and database integration test cases have been prepared. However, migration application, PostgreSQL concurrency/idempotency/atomicity, access isolation, webhook deduplication, and backup/restore have not been executed against a real PostgreSQL instance. The database is **not ready to be represented as production-verified**, and backend integration that depends on those guarantees should wait for the blockers above. Production checkout remains disabled.

## Verification continuation attempt (2026-10-26)

Attempted command: `$PSVersionTable.PSVersion.ToString(); Get-Location; git status --short` in `D:\FLCdecor`. The execution service rejected process creation before PowerShell started with `helper_unknown_error: setup refresh had errors`. As a result, no PostgreSQL configuration, environment URL, Docker state, PostgreSQL version, migration files, or current working-tree state could be inspected in this attempt. No database command, migration, reset, backup, or restore was run. This is an environment/tooling blocker; it does not establish that PostgreSQL or Docker is absent. Resume these checks when the workspace command runner is available, then amend this report with captured outputs.

## User-provided test database details and resumed attempt (2026-10-26)

The user reports installing Docker Desktop and creating a PostgreSQL 16 test database at `127.0.0.1:5433`, database `flcdecor_test`, with credentials provided through environment variables. These details have **not been independently verified**. The workspace command runner again rejected both PowerShell and `cmd.exe` process creation with `helper_unknown_error: setup refresh had errors` before any shell command ran. Consequently, environment files and variable names were not read, the database identity/isolation was not queried, and no migration or SQL command was executed. No credential values were requested, printed, or used. Do not apply migrations until a live read-only identity check confirms host `127.0.0.1`, port `5433`, database `flcdecor_test`, PostgreSQL version 15+, and an explicitly non-production target.
