# Supabase PostgreSQL migration readiness — pre-remediation audit

Updated: 2026-10-27 (Asia/Karachi)  
Target project: `wggnufkrsjsmqyutjmut`  
Decision: **BLOCKED — do not run the hosted migration yet**

This is a read-only preparation audit. No hosted table, migration, record,
role, policy, Auth user, Storage object, Realtime object, extension, or project
setting was created, changed, or deleted. Production checkout remains disabled.

## Executive finding

The SQL is compatible with the hosted PostgreSQL version and does not reference
Supabase-managed schemas. The migration set is nevertheless not safe to deploy
as it stands:

1. The repository contains **nine** migrations, not the seven named in the
   deployment request. Migrations 0008 and 0009 are required by current admin
   order-transition and customer-read permissions. `prisma migrate deploy`
   applies every pending directory; it cannot safely be described as a
   seven-migration deployment.
2. The current Prisma schema does not exactly match the schema produced by all
   nine migrations. A read-only local `prisma migrate diff` exited `1` and
   reported real drift in addition to index-name differences.
3. This Supabase project's current `public` default privileges automatically
   grant broad table privileges to `anon`, `authenticated`, and `service_role`,
   sequence privileges to those roles, and function execution to those roles.
   The migrations create sensitive tables in `public` but contain no RLS,
   `REVOKE`, or default-privilege hardening. Deploying them now would create an
   unacceptable Data API exposure.
4. Database connection variables are assigned incorrectly for the documented
   architecture. `.env.local` has a direct endpoint in `DATABASE_URL`, a
   transaction-pooler endpoint in `DIRECT_URL`, no
   `DIRECT_DATABASE_URL`, and no explicit SSL mode. `DIRECT_URL` is not read by
   this project. Prisma CLI also does not load `.env.local` through the current
   `import "dotenv/config"` setup.

The safe next step is an owner-approved, additive remediation phase before any
hosted apply. The recommended boundary is to keep Prisma as the only data-access
path and make all application objects server-only: correct the migration/schema
drift, revoke Data API roles and their default privileges, enable RLS with no
browser policies on all application tables, protect the analytics view, harden
the trigger function, and use correctly named direct and pooled URLs with
verified TLS. Moving the application into a non-exposed schema is an even
stronger alternative, but it is a larger architecture change and must be
approved separately.

## Risk assessment

| Risk | Severity | Current control | Required disposition |
| --- | --- | --- | --- |
| Data API access to password/session/MFA/order/payment/customer tables through inherited `public` grants and absent RLS | Critical | Hosted schema remains empty; migration not applied | Add and test server-only grants/default-privilege/RLS hardening before hosted apply. |
| Current Prisma schema differs from migration output | High | `db push` and hosted writes prohibited | Reconcile with reviewed forward migration(s), then require a zero-diff result apart from intentionally unmanaged view/trigger objects. |
| Migration/runtime URLs use the wrong variable roles and omit explicit TLS settings | High | No migration command was run; CLI currently fails closed without process variables | Correct secret names, use direct migration URL and pooled runtime URL, and verify TLS certificates. |
| Requested seven-migration scope differs from the nine files Prisma will deploy | High | Audit stopped before apply | Confirm the full reviewed baseline explicitly. |
| Brief exposure while migrations 0001–0009 run before a final hardening migration | High | No hosted objects exist | Disable Data API during initial apply or install reviewed default-privilege protection before application objects are created. |
| Failure in a migration without an explicit transaction | Medium | Empty staging-first target and Prisma migration log | Test on a disposable branch, retain recovery point, and use reviewed forward recovery rather than reset. |
| Locks from table alterations and non-concurrent indexes | Low for the current empty target; higher after traffic/data | Hosted `public` is empty | Perform initial deployment before traffic; use online/expand-contract migrations for later populated releases. |

## Hosted project evidence (read-only MCP)

The MCP connection is authenticated as a read-only database role. The target
reported PostgreSQL `17.11`, database `postgres`, and search path
`"$user", public`.

Current `public` object counts:

| Object | Count |
| --- | ---: |
| Tables/partitioned tables | 0 |
| Views | 0 |
| Materialized views | 0 |
| Sequences | 0 |
| Functions | 0 |
| Enum types | 0 |

Supabase MCP also returned no migration entries. Security and performance
advisors currently return no findings; this is expected while there are no
application objects and is not evidence that the proposed post-migration state
would be secure.

Both `anon` and `authenticated` currently have `USAGE` on `public`. The
project's default ACL for objects created by `postgres` in `public` grants:

- broad table privileges to `anon`, `authenticated`, and `service_role`;
- sequence usage/read/write privileges to those roles; and
- function execution to those roles.

This confirms the RLS/grants issue is project-specific and not merely a generic
warning. See Supabase's [API security guidance](https://supabase.com/docs/guides/api/securing-your-api)
and [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Migration inventory and ordering

The directories sort deterministically and Prisma 7.10.1 recognizes all nine.
The hashes below pin the files reviewed in this audit.

| Order | Migration | SHA-256 | Finding |
| ---: | --- | --- | --- |
| 1 | `0001_init` | `6442056DED9E9979AFF11A0584F606953C42E291EAFD6DF66675210DCF036410` | Creates `public`, core enums/tables/indexes/FKs; compatible, but no RLS or privilege hardening and no explicit transaction. |
| 2 | `0002_checkout_totals` | `E39AA7FE41F627C78A4FC3E8C47EBE60FFB2C8CFA30AF440F75134AC3B1EB6B0` | Adds financial checks/index; compatible. |
| 3 | `0003_identity_controls` | `2E0930E13F7B956FBBA386BD9EE280DE81E841813F25D4B3227F009EA3DA8141` | Adds legacy MFA/reset storage; compatible but sensitive. |
| 4 | `0004_production_database_foundation` | `8B874CBFA411F12A9C99E53E71DF93FF7246B1FF740ECD01E6770F54A61A8F3D` | Explicit transaction; adds production foundation, trigger, function, view, seed vocabulary and inactive baseline location. Compatible with PG 17. |
| 5 | `0005_customer_address_private_payload` | `0B22AF1F94AFCFA2339A42AE9E01C3811AD4D883B67B037821C8CC9074B93CCD` | Adds encrypted-address payload column; compatible. |
| 6 | `0006_persistent_admin_auth` | `9C39E2C463DC0B1F24188CD9A73F1AC2AB19B82185A5FD277066FD34195E505D` | Adds durable MFA session state and partial index; compatible. |
| 7 | `0007_notification_permissions` | `3A4928488A9A1AF47EBE63D22F8990607D7E8080B862EED8535640419D955D08` | Adds notification permissions to ADMIN/OWNER; compatible. |
| 8 | `0008_demo_order_transition_permission` | `67E4B7D928A4FBA666072E6FAD814D1DED552610A26971B92E43D70185B0D325` | Grants the existing transition permission to ADMIN/OWNER; present and pending for any empty target. |
| 9 | `0009_customer_read_permission` | `989B597573F6EDEB2BC4465B16A5CE673006C565C5FA5DE067D44B1C2D815157` | Adds minimized customer-read permission; present and pending for any empty target. |

`prisma/migrations/migration_lock.toml` is absent. This did not prevent Prisma
7.10.1 from recognizing, checksumming, or validating the migration history, so
it is not by itself a deployment blocker.

## SQL and Supabase compatibility

Across the nine migration files the reviewed SQL creates 50 application tables,
13 enum types, 39 ordinary indexes, one additional unique index, one trigger,
one PL/pgSQL trigger function, and one view. Prisma additionally creates
`public._prisma_migrations`; the locally migrated database therefore has 51
tables, one view, 13 enums, and one application function in `public`.

Compatible features:

- `NULLS NOT DISTINCT` requires PostgreSQL 15 or newer; hosted PostgreSQL 17.11
  supports it.
- `gen_random_uuid()` is available on the hosted version; `pgcrypto` is also
  already installed in Supabase's `extensions` schema.
- PL/pgSQL is installed. Advisory transaction locks, recursive CTEs, partial
  indexes, JSONB, timestamp precision, check constraints, and the
  `Asia/Karachi` time-zone expression are supported.
- No migration executes `CREATE EXTENSION`, so extension ownership/location is
  not changed.

Raw/privileged constructs:

- `0001` executes `CREATE SCHEMA IF NOT EXISTS "public"`. On Supabase this is a
  no-op because `public` exists.
- `0004` is the only migration with explicit `BEGIN`/`COMMIT`.
- `0004` creates `flc_enforce_category_tree()`, its category trigger, and
  `AnalyticsDailyPlacedValue`.
- No migration contains `GRANT`, `REVOKE`, `ALTER DEFAULT PRIVILEGES`,
  `SECURITY DEFINER`, destructive `DROP`, or `TRUNCATE` statements.
- SQL identifiers are mostly unqualified. A migration URL must explicitly
  target `schema=public`; relying only on a mutable search path is not accepted.

The trigger function is security-invoker, but it uses unqualified object names
and has no fixed `search_path`. It should be hardened. The analytics view was
created without `security_invoker=true`; PostgreSQL views created by an owner
can bypass underlying RLS semantics. It must be inaccessible to Data API roles
or recreated as a security-invoker view.

## Managed-schema boundary

The migration files do not name or reference `auth`, `storage`, `realtime`,
`vault`, `extensions`, `graphql`, or any other Supabase-managed schema. The
Prisma datasource is single-schema PostgreSQL and the application stores an
external Supabase Auth UUID in `CustomerProfile.authUserId` without a foreign
key to `auth.users`.

Therefore `prisma migrate deploy`, using an explicit `public` target and only
the reviewed files, is not expected to modify Supabase-managed schemas. Do not
run `prisma migrate dev`, `prisma db push`, introspection-driven rewrites, or
whole-database reset/restore operations against hosted Supabase; those workflows
can encounter managed-schema drift or cause destructive changes.

## Migration/schema drift (blocking)

The isolated local database has all nine checksummed migrations and Prisma
reports the migration history as up to date. A separate read-only diff from the
migrated database to `prisma/schema.prisma` still reports differences:

- missing migrated indexes for `Category(parentId, slug)` and
  `Order(guestEmailNormalized, createdAt)`;
- `Cart.expiresAt` timestamp type mismatch;
- `GuestTrackingVerification.destinationHash` and `purpose` exist in SQL but
  not in the Prisma model;
- database defaults differ from Prisma's `@updatedAt` declarations on several
  models; and
- numerous database index/constraint names differ from Prisma-generated names.

The three order indexes reported as remove/add have direction/name metadata
differences and require explicit review. The raw trigger and view must be
preserved because Prisma schema diff does not fully represent them.

Do not resolve this with `db push`, reset, or by editing already-applied files.
Add a reviewed forward migration and align the Prisma schema intentionally.

## Connection-mode decision

| Use | Required connection | Reason |
| --- | --- | --- |
| Prisma migration/status | `DIRECT_DATABASE_URL`: direct endpoint on port 5432, explicit `schema=public`, verified TLS | Prisma Migrate requires session semantics; Supabase recommends direct connections for migrations. The direct endpoint was TCP-reachable from this workstation. |
| Persistent Node server | Direct endpoint, or session pooler port 5432 when IPv4-only | A long-lived process can safely hold persistent sessions. |
| Serverless/auto-scaling Next.js runtime | `DATABASE_URL`: Supavisor transaction pooler on port 6543, verified TLS; start `DATABASE_POOL_MAX=1` | Prevents each application instance from exhausting direct database connections. |

The project uses Prisma 7's `@prisma/adapter-pg` with a `pg.Pool`. The adapter
does not cache named prepared statements unless a `statementNameGenerator` is
configured, and this project does not configure one. That makes the current
runtime query path suitable for transaction pooling, while migrations must
still use direct/session semantics. See Supabase's [connection-mode guidance](https://supabase.com/docs/guides/database/connecting-to-postgres)
and Prisma's [pooler guidance](https://docs.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer).

Configuration inspection (values were not printed):

| Variable/source | Current state | Required state |
| --- | --- | --- |
| `.env.local` `DATABASE_URL` | Configured for direct port 5432; no explicit SSL/schema query setting | Runtime transaction-pooler URL for serverless deployment, TLS verified, bounded pool. |
| `.env.local` `DIRECT_DATABASE_URL` | Missing | Direct port 5432 migration URL, TLS verified, `schema=public`. |
| `.env.local` `DIRECT_URL` | Configured for transaction port 6543; ignored by this repository | Remove/rename; this variable has no effect in `prisma.config.ts`. |
| Current process environment | All three variables absent | Inject from an approved secret manager/CI environment. |

`prisma.config.ts` selects `DIRECT_DATABASE_URL || DATABASE_URL`.
`lib/prisma.ts` uses only `DATABASE_URL`. With no process variables,
`npx prisma validate` fails because `dotenv/config` loads `.env`, not
`.env.local`. This is fail-closed, but the deployment command must inject the
variables explicitly and must perform a sanitized endpoint assertion first.

Both configured URLs currently omit an explicit SSL mode. Production
connections must use certificate-verified TLS. Supabase documents downloading
the project's server root certificate and using `sslmode=verify-full`; see its
[PSQL SSL guide](https://supabase.com/docs/guides/database/psql).

## Local verification completed

All database-writing tests were constrained to
`127.0.0.1:5433/flcdecor_test`.

| Check | Result |
| --- | --- |
| Target assertion | PASS: `flcdecor_test`, `127.0.0.1:5433`, PostgreSQL 18.4 |
| `npx prisma migrate status` | PASS: 9 migrations found, 9 applied, schema history up to date |
| `npx prisma validate` | PASS |
| `RUN_POSTGRES_INTEGRATION=true npm run test:integration -- --reporter=dot` | PASS: 5 files, 23 tests |
| Migrated DB to current Prisma schema diff | BLOCKING DRIFT: exit 1; details above |

The first integration invocation omitted `RUN_POSTGRES_INTEGRATION=true` and
correctly skipped all suites; it is not counted as a passing run. The enabled
run above is the verification result.

## Required remediation before approval

1. Confirm that the deployment baseline is migrations 0001 through 0009, not
   0001 through 0007.
2. Add a reviewed forward migration (or narrowly separated forward migrations)
   that reconciles the current Prisma schema with the migration-produced schema
   without dropping legacy data or raw SQL objects.
3. Add Supabase server-only hardening in the same approved release:
   revoke existing and default privileges from `anon`, `authenticated`, and
   `service_role`; revoke function execution from `PUBLIC`; enable RLS on every
   application table with no client policies; protect `_prisma_migrations`;
   make/recreate the view as security-invoker or revoke all Data API access;
   and fix the trigger function's search path/object qualification.
4. Decide whether to disable the Data API during initial deployment. This is
   recommended to avoid even a brief exposure window before a final hardening
   migration runs. Supabase Auth can remain in use independently.
5. Correct secret names and connection roles. Use direct 5432 for
   `DIRECT_DATABASE_URL`; use transaction 6543 for serverless
   `DATABASE_URL`; begin with `DATABASE_POOL_MAX=1`; add verified TLS and an
   explicit application schema.
6. Repeat the empty-database migration, schema diff, grants/RLS assertions,
   complete integration suite, and Supabase advisors on an approved disposable
   branch/staging project.
7. Verify a backup/restore or branch recovery point before production approval.

## Exact apply procedure after remediation and explicit approval

These commands are prepared but **must not be run while this report is
BLOCKED**. Run them from `D:\FLCdecor` in a clean PowerShell process. Obtain the
URLs from Supabase's Connect panel and inject them from the approved secret
manager. Do not paste credentials into source files, command transcripts, or
CI logs.

```powershell
Set-Location -LiteralPath 'D:\FLCdecor'

# The secret manager/CI must populate these process-scoped values.
if ([string]::IsNullOrWhiteSpace($env:DIRECT_DATABASE_URL)) {
  throw 'DIRECT_DATABASE_URL is required'
}
if ([string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
  throw 'DATABASE_URL is required'
}

# Sanitized target assertions: these print no URL or credential.
$direct = [Uri]$env:DIRECT_DATABASE_URL
$runtime = [Uri]$env:DATABASE_URL
if ($direct.Host -ne 'db.wggnufkrsjsmqyutjmut.supabase.co' -or $direct.Port -ne 5432) {
  throw 'DIRECT_DATABASE_URL is not the approved direct endpoint'
}
if ($runtime.Host -notlike '*.pooler.supabase.com' -or $runtime.Port -ne 6543) {
  throw 'DATABASE_URL is not the approved transaction-pooler endpoint'
}
if ($direct.Query -notmatch '[?&]schema=public(?:&|$)' -or
    $direct.Query -notmatch '[?&]sslmode=verify-full(?:&|$)' -or
    $direct.Query -notmatch '[?&]sslrootcert=[^&]+') {
  throw 'Direct URL must explicitly select public and verify TLS with the project CA'
}
if ($runtime.Query -notmatch '[?&]sslmode=verify-full(?:&|$)' -or
    $runtime.Query -notmatch '[?&]sslrootcert=[^&]+') {
  throw 'Runtime URL must verify TLS with the project CA'
}
Write-Output 'Sanitized Supabase endpoint checks passed.'

npm ci
npm run db:validate
npx prisma migrate status

# Approval gate: verify the pending list contains exactly the reviewed set,
# including the new corrective/security migration(s), before continuing.
npm run db:deploy
npx prisma migrate status
```

After deploy, use read-only MCP/SQL to verify:

```sql
select migration_name, finished_at, rolled_back_at
from public._prisma_migrations
order by started_at;

select count(*) filter (where c.relkind in ('r','p')) as tables,
       count(*) filter (where c.relkind='v') as views
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public';

select c.relname
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relkind in ('r','p')
  and not c.relrowsecurity;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and grantee in ('anon','authenticated','service_role')
order by grantee, table_name, privilege_type;
```

Expected after the approved hardening migration: no failed/rolled-back Prisma
migration; no application table without RLS; and no Data API role grants on
server-only application objects. Also rerun both Supabase advisor categories,
the complete local/staging integration suite, and a schema diff. Do not seed
real customer/admin/order data as part of migration verification.

## Recovery and rollback considerations

- Treat the migrations as forward-only. Do not use `prisma migrate reset`,
  `db push --force-reset`, `DROP SCHEMA public CASCADE`, or a whole-database
  restore against Supabase; those actions can damage managed services.
- Apply first to an approved disposable branch/staging project and retain a
  verified recovery point before production.
- If a migration fails, stop application rollout, preserve the database and
  `_prisma_migrations.logs`, determine whether the file was partially applied,
  and prepare a reviewed forward fix. Use `prisma migrate resolve` only after
  the actual database state has been reconciled and documented.
- Migration 0004 is explicitly transactional. Other migration files are not
  explicitly wrapped, so partial-application recovery must not be improvised.
- Roll back runtime activation by removing the new application deployment or
  disabling its database-dependent runtime flags. Database rollback is a
  reviewed restore/forward-fix operation, not automatic down SQL.

## Approval gate and next action

**BLOCKED.** Do not apply the current migration directory to hosted Supabase.

Owner action required: approve the recommended **server-only `public` schema
hardening approach** and confirm that migrations **0001 through 0009 plus new
additive drift/security remediation migration(s)** are the intended deployment
baseline. If instead the owner wants a non-exposed `flc_app` schema, approve
that larger schema relocation explicitly before implementation.

