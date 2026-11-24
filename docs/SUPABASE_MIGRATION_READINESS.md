# Supabase PostgreSQL migration readiness

Updated: 2026-10-27 (Asia/Karachi)  
Target project: `wggnufkrsjsmqyutjmut`  
Decision: **READY for a separately approved staging deployment; hosted execution is not authorized by this document**

No hosted database object, setting, Auth user, Storage object, migration, or
record was changed during this remediation. Production checkout remains
disabled. The original pre-remediation audit is retained in
`SUPABASE_MIGRATION_READINESS_PRE_REMEDIATION.md`.

## Outcome

The approved migrations 0001-0009 remain unchanged. Two forward-only
migrations now reconcile the Prisma model and implement the approved
server-only `public` architecture:

| Order | Migration | Purpose |
| ---: | --- | --- |
| 10 | `0010_schema_drift_alignment` | Adds the two indexes missing from the migration baseline without deleting or rewriting data. |
| 11 | `0011_server_only_public_security` | Creates the restricted runtime role, revokes Data API access, enables RLS, installs server-only policies, and hardens the view, function, migration history, and default privileges. |

A fresh local install applied all eleven migrations and produced **no Prisma
schema difference**. The existing isolated integration database was also
advanced from 0009 to 0011, after which all 23 PostgreSQL integration tests
passed through the restricted runtime role.

The final read-only Supabase MCP check still reports:

- `public` tables: 0;
- hosted migration entries: 0.

## Schema alignment

`prisma/schema.prisma` now intentionally represents the 0001-0009 database
types, migrated legacy fields, timestamp defaults, index directions, and
database object names. Migration 0010 adds only:

- `Category_parentId_slug_idx`;
- `Order_guestEmailNormalized_createdAt_idx`.

No prior migration was edited. No table, column, legacy structure, trigger, or
view was dropped. `prisma migrate diff --from-config-datasource --to-schema
prisma/schema.prisma --exit-code` now returns `No difference detected` for both
a fresh migrated database and `flcdecor_test`.

## Server-only security controls

Migration 0011:

- creates `flc_app_server` as a login role with no superuser, database-create,
  role-create, replication, or `BYPASSRLS` capability and no embedded password;
- grants that role only database connect, `public` usage, required table DML,
  and analytics-view read access;
- enables RLS on all 50 application tables and on `_prisma_migrations`;
- creates exactly one `FOR ALL` policy on each application table, restricted
  to `flc_app_server`, with no `PUBLIC`, `anon`, `authenticated`, or
  `service_role` policies;
- revokes application table/view/function access from `PUBLIC`, `anon`,
  `authenticated`, and `service_role`;
- leaves `_prisma_migrations` accessible only to its owner/direct migration
  role, not the runtime role;
- revokes broad future table, sequence, and function defaults from Supabase API
  roles and revokes PostgreSQL's global default function execution from
  `PUBLIC`;
- changes `AnalyticsDailyPlacedValue` to `security_invoker=true`;
- keeps `flc_enforce_category_tree()` security-invoker, pins its search path to
  `pg_catalog, public`, and revokes public/API execution;
- touches only the application `public` schema and role/database ACL metadata.

The current schema creates no sequences. Default sequence grants are still
revoked from API roles. Any later migration that introduces an identity or
sequence must explicitly grant only the minimum sequence privilege required by
`flc_app_server` and extend the security test.

## Initial-deployment exposure prevention

Running only a final hardening migration would leave tables temporarily exposed
while migrations 0001-0010 run under this project's current Supabase default
ACLs. One of these controls is therefore mandatory **before** the first hosted
`prisma migrate deploy`:

1. Preferred defense in depth: disable the Data API in the approved staging
   project for the migration window, then re-enable it only after the security
   assertions pass; or
2. Run `scripts/supabase-pre-migration-security.sql` over the direct migration
   connection before Prisma. It refuses to operate unless `public` has no
   relations or functions, then removes future API-role table/sequence/function
   grants and `PUBLIC` function execution for the migration owner.

The repository test creates objects after the guard but before Prisma and
proves that `anon`, `authenticated`, and `service_role` receive no table or
function access. It then removes the probes and confirms `public` is empty.

Do not skip this gate. If `public` is unexpectedly non-empty, stop and audit;
do not weaken the guard or use a destructive reset.

## Prisma 7 connection configuration

`prisma.config.ts` loads either the explicitly named `PRISMA_ENV_FILE` or
`.env`, while preserving process/secret-manager precedence. It requires
`DIRECT_DATABASE_URL`; migrations no longer fall back to the runtime URL.

`lib/prisma.ts` uses only `DATABASE_URL`, fixes the adapter schema to `public`,
and defaults `DATABASE_POOL_MAX` to 1. In production it fails closed unless:

- the username identifies `flc_app_server`;
- `schema=public` is explicit;
- TLS uses `sslmode=verify-full` with `sslrootcert`;
- serverless mode uses the Supavisor transaction pooler on port 6543; or
- explicitly selected persistent mode uses port 5432.

Required production/staging secret configuration:

```dotenv
DATABASE_URL=postgresql://flc_app_server.PROJECT_REF:SECRET@POOLER_HOST:6543/postgres?schema=public&sslmode=verify-full&sslrootcert=ENCODED_CA_PATH
DIRECT_DATABASE_URL=postgresql://postgres:SECRET@db.PROJECT_REF.supabase.co:5432/postgres?schema=public&sslmode=verify-full&sslrootcert=ENCODED_CA_PATH
DATABASE_CONNECTION_MODE=serverless
DATABASE_POOL_MAX=1
```

These are placeholders only. Do not commit real values. The workstation's
existing `.env.local` was not rewritten because it contains secrets; it must be
corrected or replaced by process-scoped secret injection before staging.

## Local verification evidence

All database writes were limited to the isolated local PostgreSQL cluster and
the databases `flcdecor_migration_test` and `flcdecor_test`. Windows denied the
cluster's prior port 5433 during this run, so the same isolated cluster was
started on loopback port 55432. The test safety guard still requires
`127.0.0.1`, the exact database name, and an explicitly matching port.

| Command/check | Result |
| --- | --- |
| `npx prisma format` | PASS |
| `npx prisma validate` | PASS |
| `npm run test:migrations:local` | PASS: pre-guard probe, fresh 0001-0011 apply, 51 RLS tables, 50 server-only policies, API denial, runtime-role DML, zero drift |
| `npx prisma migrate status` on `flcdecor_test` | PASS: 11/11 applied, up to date |
| Prisma diff on fresh database and `flcdecor_test` | PASS: no difference detected |
| `npm run test:integration -- --reporter=dot` with `flc_app_server` | PASS: 5 files, 23 tests |
| `npm run test:unit` | PASS: 13 files, 42 tests |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| Read-only hosted MCP table/migration lists | PASS: both empty |

The first integration attempt on port 55432 correctly stopped at an existing
hardcoded 5433 safety assertion after 20 tests passed. The assertion now takes
`LOCAL_POSTGRES_TEST_PORT` (default 5433) while retaining the loopback and exact
database checks; the complete rerun passed.

## Exact staging apply procedure — requires separate approval

This section is a prepared runbook, not authorization. Use an approved empty
staging/branch project before production. Obtain all secrets from the approved
secret manager and never echo the URLs.

```powershell
Set-Location -LiteralPath 'D:\FLCdecor'

if ([string]::IsNullOrWhiteSpace($env:DIRECT_DATABASE_URL)) {
  throw 'DIRECT_DATABASE_URL is required'
}
if ([string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
  throw 'DATABASE_URL is required'
}
if ([string]::IsNullOrWhiteSpace($env:DIRECT_PSQL_URL)) {
  throw 'DIRECT_PSQL_URL is required and must omit Prisma-only schema=public'
}

# Run a sanitized target validator before any SQL. It must verify the approved
# project ref, direct port 5432, pooler port 6543, public schema, runtime role,
# and verify-full/root-certificate parameters without printing the values.

# Approval gate A: disable Data API for the staging migration window, OR run
# the mandatory empty-schema guard below. Using both is preferred.
psql --no-psqlrc --set ON_ERROR_STOP=1 --dbname $env:DIRECT_PSQL_URL `
  --file scripts/supabase-pre-migration-security.sql

npm ci
npm run db:validate
npx prisma migrate status

# Confirm the only pending migrations are the reviewed 0001-0011 set.
npm run db:deploy
npx prisma migrate status

# Assign the runtime role password interactively; do not put it in shell
# history or source control.
psql --no-psqlrc --dbname $env:DIRECT_PSQL_URL
# At the psql prompt: \password flc_app_server

# Run owner-level security assertions before enabling application traffic.
psql --no-psqlrc --set ON_ERROR_STOP=1 --dbname $env:DIRECT_PSQL_URL `
  --file scripts/verify-supabase-security-local.sql
```

After those commands, verify the custom role can connect through the staging
transaction pooler, run the PostgreSQL integration suite with synthetic data,
rerun Supabase security/performance advisors, and inspect the migration list
through read-only MCP. Re-enable the Data API only after all checks pass.

## Recovery and rollback

- Treat migrations as forward-only. Never run `prisma migrate reset`,
  `prisma db push --force-reset`, `DROP SCHEMA public CASCADE`, or destructive
  whole-project restoration against hosted Supabase.
- Create and verify a staging branch/backup recovery point before applying.
- If the pre-guard fails, no migration should run. Investigate the unexpected
  `public` objects.
- If migrations 0001-0010 fail, keep the Data API disabled and either discard
  the disposable branch or repair forward after inspecting
  `_prisma_migrations`.
- If migration 0011 fails, keep application traffic and Data API disabled;
  do not expose the partially secured schema.
- A rollback must include database objects, runtime role credentials,
  application release, and secrets as one coordinated recovery operation.

## Remaining staging risks and gates

1. Confirm the hosted migration owner can create/alter the `flc_app_server`
   login role. If Supabase restricts that capability, create the role through
   an approved privileged mechanism and adapt 0011 forward; do not grant a
   broader role to the application.
2. Verify custom-role authentication through Supavisor transaction pooling and
   certificate validation using the downloaded project CA. Local tests cannot
   prove the hosted TLS/pooler path.
3. Configure a strong runtime role password interactively or through an
   approved secret manager; migration 0011 intentionally contains none.
4. Correct process-scoped URLs; the current local secret file is not deployment
   ready.
5. Obtain an explicit staging deployment approval and select/approve the Data
   API disablement or pre-guard step. Production remains a later, separate
   approval.

## Approval gate

**READY for a separately approved, disposable staging deployment.** The next
exact owner action is to approve that staging deployment and provide the
process-scoped `DIRECT_DATABASE_URL`, `DIRECT_PSQL_URL`, and `DATABASE_URL`
through the secret manager, plus confirmation that the Data API will be
disabled for the migration window or that the reviewed pre-migration guard is
the authorized exposure control.

Until that explicit approval is given, hosted migration execution remains
**BLOCKED**.
