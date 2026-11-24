# Supabase server-only public schema remediation

Updated: 2026-10-27 (Asia/Karachi)  
Scope: local implementation and verification only  
Hosted changes performed: none

## Architecture implemented

FLC Decor keeps its Prisma-managed application objects in Supabase `public`,
but treats that schema as server-only. Browser clients continue to use
Supabase Auth; they do not query application tables through PostgREST/Data API.
All business data access goes through the Next.js server and Prisma using the
restricted `flc_app_server` database login.

The authorization layers are intentionally separate:

1. Supabase Auth establishes the end-user identity.
2. Next.js server code validates sessions, MFA, origin, rate limits, and RBAC.
3. Prisma connects as `flc_app_server`.
4. PostgreSQL grants and RLS reject `anon`, `authenticated`, `service_role`,
   and `PUBLIC` from FLC Decor application objects.

No browser-facing RLS policy was added. The `service_role` JWT/database role is
also denied because this architecture does not use Data API bypass access for
application data.

## Files changed

| File | Change |
| --- | --- |
| `prisma/schema.prisma` | Aligned legacy fields, timestamp types/defaults, index direction, and mapped names with the migration-produced schema. |
| `prisma/migrations/0010_schema_drift_alignment/migration.sql` | Forward-only addition of two missing indexes. |
| `prisma/migrations/0011_server_only_public_security/migration.sql` | Runtime role, grants/revokes, RLS/policies, default ACLs, view/function hardening, and migration-history protection. |
| `scripts/supabase-pre-migration-security.sql` | Empty-schema default-ACL guard that closes the initial migration exposure window. |
| `scripts/supabase-local-api-role-fixtures.sql` | Local-only Supabase API-role fixtures. |
| `scripts/verify-supabase-pre-migration-security-local.sql` | Proves newly created pre-migration objects are not exposed. |
| `scripts/verify-supabase-security-local.sql` | Catalog, ACL, RLS, policy, view/function, default-ACL, and runtime-role assertions. |
| `scripts/verify-supabase-remediation-local.ps1` | Destructive-operation allowlisted fresh-database harness for loopback PostgreSQL only. |
| `package.json` | Adds/updates `test:migrations:local`. |
| `prisma.config.ts` | Requires direct migration URL and explicit environment-file loading. |
| `lib/prisma.ts` | Runtime/direct separation, `public` targeting, pool bound, production role/endpoint/TLS validation. |
| `.env.example` | Documents direct and pooled URLs, verified TLS, serverless mode, and pool size 1 without secrets. |
| `tests/prisma-config.test.ts` | Tests local defaults and production fail-closed endpoint/role/TLS rules. |
| `tests/integration/admin-auth.test.ts` | Keeps the local target allowlist while permitting an explicit test-cluster port. |
| `12_DECISIONS.md` | Records the approved server-only architecture and reversible implementation choices. |
| `docs/SUPABASE_MIGRATION_READINESS.md` | Replaces the blocking audit with verified staging readiness and approval gates. |

The previous audit is preserved as
`docs/SUPABASE_MIGRATION_READINESS_PRE_REMEDIATION.md`.

## Database controls

### Dedicated runtime role

`flc_app_server` is a login role with `NOSUPERUSER`, `NOCREATEDB`,
`NOCREATEROLE`, `NOREPLICATION`, and `NOBYPASSRLS`. It has no migration-history
access and cannot rely on owner RLS bypass. Migration 0011 deliberately assigns
no password; an approved operator must set one outside source control.

The role receives schema usage, application-table `SELECT/INSERT/UPDATE/DELETE`,
and analytics-view `SELECT`. The policy on each application table permits that
role's server-side operations. The local integration suite runs through this
role, proving the grants and policies are sufficient for current application
flows.

### Data API denial

For every application table, migration 0011 removes privileges from `PUBLIC`
and each existing Supabase API role (`anon`, `authenticated`, `service_role`).
RLS is enabled on all 50 application tables, but no policy names an API role or
`PUBLIC`. `_prisma_migrations` also has RLS enabled and is denied to API and
runtime roles.

The analytics view is security-invoker and denied to API roles. The category
trigger function remains security-invoker with a pinned trusted search path and
no public/API execution grant.

### Future-object defaults

Both the pre-migration guard and migration 0011 revoke the migration owner's
future table, sequence, and function privileges from API roles. PostgreSQL's
implicit default function execution for `PUBLIC` is revoked globally for that
owner. Future migrations therefore fail closed unless they deliberately add
server-role access and RLS coverage.

### Managed-schema boundary

The new migrations and scripts do not alter `auth`, `storage`, `realtime`,
`extensions`, `vault`, GraphQL, or other Supabase-managed schemas. The local
security migration operates on the `public` application objects, the dedicated
application role, current-database connect privilege, and the current migration
owner's default ACLs.

## Verification performed

The following results were obtained against local PostgreSQL 18.4 on
`127.0.0.1:55432`. Hosted Supabase was accessed only through read-only list
operations.

| Verification | Result |
| --- | --- |
| Pre-migration guard on empty `public` | PASS |
| Table/function creation between guard and Prisma | PASS: no API/PUBLIC access |
| Fresh 0001-0011 migration deployment | PASS |
| Application table count | PASS: 50 plus `_prisma_migrations` |
| RLS coverage | PASS: all 51 tables |
| Policies | PASS: 50, all restricted to `flc_app_server` |
| API table/view/function/migration-history privileges | PASS: denied |
| Live `SET ROLE` negative probes | PASS for `anon`, `authenticated`, `service_role` |
| Runtime-role table and view reads | PASS |
| Runtime-role transactional `AuditEvent` insert | PASS and rolled back |
| Trigger function security/search path | PASS |
| Analytics view security-invoker option | PASS |
| New-object default ACL probes | PASS |
| Prisma drift, fresh and existing test DB | PASS: no difference |
| PostgreSQL integration tests through runtime role | PASS: 23/23 |
| Unit tests | PASS: 42/42 |
| TypeScript | PASS |
| ESLint | PASS |
| Hosted `public` table and migration lists | PASS: empty |

## Operational requirements

- Use `DIRECT_DATABASE_URL` with the direct port 5432 endpoint for Prisma
  migration/status operations.
- Use `DATABASE_URL` with the custom `flc_app_server` identity and Supavisor
  transaction pooler port 6543 for serverless runtime.
- Keep `DATABASE_POOL_MAX=1` initially and measure before increasing it.
- Require `schema=public`, `sslmode=verify-full`, and the project CA via
  `sslrootcert` on both URLs.
- Disable Data API during initial deployment or execute the reviewed
  empty-schema pre-migration guard before any Prisma migration. Both is safer.
- Set the runtime role password interactively or through an approved secret
  manager, never in a migration, environment template, command log, or commit.
- Keep the Data API/application traffic disabled if any security assertion
  fails.

## Remaining risks

Local PostgreSQL cannot prove that the hosted `postgres` migration identity may
create the custom login role, that Supavisor accepts the custom role exactly as
configured, or that the downloaded CA path and certificate chain work in the
deployment runtime. Those are mandatory staging checks.

The runtime role uses broad DML across application tables because authorization
is enforced in the trusted server application; RLS's purpose here is the
server/API boundary, not per-customer row filtering. A compromised server
credential therefore remains high impact. Protect, rotate, and scope that
credential operationally, retain application RBAC, and do not expose it to the
browser.

Future migrations must update the table allowlist/security tests when adding
tables, views, functions, or sequences. They must not depend on API-role
defaults. Production backup/restore and a disposable Supabase branch rehearsal
remain required before production approval.

## Decision

The code and local database controls are **READY for a separately approved
staging deployment**. Hosted writes, role creation, settings changes, and
migration execution remain blocked until that approval and the gates in
`docs/SUPABASE_MIGRATION_READINESS.md` are satisfied.
