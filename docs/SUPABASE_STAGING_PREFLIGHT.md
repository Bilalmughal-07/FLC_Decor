# Supabase staging preflight

Updated: 2026-10-27 (Asia/Karachi)  
Authorized staging project: `ltcgiquvrplfrbojbbbb`  
Protected original project: `wggnufkrsjsmqyutjmut`  
Decision: **BLOCKED for staging migration until staging-scoped read-only access and credentials are configured**

This is a preflight only. No hosted SQL, migration, role, password, project
setting, Data API setting, Auth record, or other hosted object was changed. The
original project received no SQL or catalog request during this task.
Production checkout remains disabled.

## 1. Project identity and MCP scope

The authorized target is exactly `ltcgiquvrplfrbojbbbb`. The connected Supabase
MCP returned this project URL instead:

```text
https://wggnufkrsjsmqyutjmut.supabase.co
```

That is the protected original project. After this identity check, no
`execute_sql`, table/migration/extension listing, advisor, or other
project-database operation was sent through MCP.

The MCP connection must be replaced with this project-scoped, read-only URL:

```text
https://mcp.supabase.com/mcp?project_ref=ltcgiquvrplfrbojbbbb&read_only=true&features=database,debugging,docs
```

Authenticate it to the organization containing staging and reload/restart the
MCP client. OAuth is preferred. If non-interactive authentication is required,
use a scoped PAT restricted to this project and only the read permissions
needed for Database, Advisors, and Project Settings; do not use a classic
all-project token. Supabase documents `project_ref` and `read_only=true` as
composable MCP parameters in its [MCP server guide](https://supabase.com/docs/guides/ai-tools/mcp).

The first verification after reconnection must be `get_project_url`. Stop
unless it returns exactly:

```text
https://ltcgiquvrplfrbojbbbb.supabase.co
```

## 2. Hosted read-only inspection status

The following staging facts are **UNVERIFIED** because using the current MCP
would inspect the forbidden original project:

| Check | Status |
| --- | --- |
| PostgreSQL version | UNVERIFIED |
| `public` table/view/function/sequence/enum counts | UNVERIFIED |
| `public._prisma_migrations` existence/history | UNVERIFIED |
| Existing object grants and schema privileges | UNVERIFIED |
| Default privileges for `postgres`/migration owner | UNVERIFIED |
| Automatic grants to `anon`, `authenticated`, `service_role`, or `PUBLIC` | UNVERIFIED |
| Current read-only identity and migration-owner capabilities | UNVERIFIED |
| Installed/available extensions | UNVERIFIED |
| Security and performance advisors | UNVERIFIED |
| Data API enabled/exposed-schema state | UNVERIFIED |

Do not reuse the original project's empty-schema or default-ACL findings as
staging evidence. Once MCP is corrected, run only read-only catalog queries
equivalent to the following:

```sql
select current_database() as database_name,
       current_user as inspection_role,
       current_setting('server_version') as postgres_version,
       current_setting('server_version_num') as postgres_version_num;

select count(*) filter (where c.relkind in ('r','p')) as tables,
       count(*) filter (where c.relkind = 'v') as views,
       count(*) filter (where c.relkind = 'S') as sequences
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public';

select count(*) as functions
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public';

select count(*) as enum_types
from pg_catalog.pg_type t
join pg_catalog.pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public' and t.typtype = 'e';

select pg_catalog.to_regclass('public._prisma_migrations') as prisma_history;

select r.rolname as owner_role,
       coalesce(n.nspname, '<all schemas>') as schema_name,
       d.defaclobjtype,
       grantee.rolname as grantee,
       x.privilege_type
from pg_catalog.pg_default_acl d
join pg_catalog.pg_roles r on r.oid = d.defaclrole
left join pg_catalog.pg_namespace n on n.oid = d.defaclnamespace
cross join lateral pg_catalog.aclexplode(d.defaclacl) x
left join pg_catalog.pg_roles grantee on grantee.oid = x.grantee
where r.rolname in ('postgres', current_user)
order by owner_role, schema_name, d.defaclobjtype, grantee, x.privilege_type;

select rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole,
       rolreplication, rolbypassrls, rolvaliduntil
from pg_catalog.pg_roles
where rolname in (current_user, 'postgres', 'anon', 'authenticated',
                  'service_role', 'flc_app_server')
order by rolname;

select e.extname, e.extversion, n.nspname as schema_name
from pg_catalog.pg_extension e
join pg_catalog.pg_namespace n on n.oid = e.extnamespace
order by e.extname;
```

Also run MCP `list_tables` for `public`, `list_migrations`, `list_extensions`,
and both advisor categories only after project identity is verified.

## 3. Migration inventory and compatibility

The repository contains exactly eleven ordered Prisma migrations. All were
read completely and checksummed during this preflight:

| Migration | SHA-256 |
| --- | --- |
| `0001_init` | `6442056DED9E9979AFF11A0584F606953C42E291EAFD6DF66675210DCF036410` |
| `0002_checkout_totals` | `E39AA7FE41F627C78A4FC3E8C47EBE60FFB2C8CFA30AF440F75134AC3B1EB6B0` |
| `0003_identity_controls` | `2E0930E13F7B956FBBA386BD9EE280DE81E841813F25D4B3227F009EA3DA8141` |
| `0004_production_database_foundation` | `8B874CBFA411F12A9C99E53E71DF93FF7246B1FF740ECD01E6770F54A61A8F3D` |
| `0005_customer_address_private_payload` | `0B22AF1F94AFCFA2339A42AE9E01C3811AD4D883B67B037821C8CC9074B93CCD` |
| `0006_persistent_admin_auth` | `9C39E2C463DC0B1F24188CD9A73F1AC2AB19B82185A5FD277066FD34195E505D` |
| `0007_notification_permissions` | `3A4928488A9A1AF47EBE63D22F8990607D7E8080B862EED8535640419D955D08` |
| `0008_demo_order_transition_permission` | `67E4B7D928A4FBA666072E6FAD814D1DED552610A26971B92E43D70185B0D325` |
| `0009_customer_read_permission` | `989B597573F6EDEB2BC4465B16A5CE673006C565C5FA5DE067D44B1C2D815157` |
| `0010_schema_drift_alignment` | `CFDC6732B5E8A4013C456FB0F2E8694033FE52E96A3871C1146A25E7FF2EC328` |
| `0011_server_only_public_security` | `39E5DA7C9AAD01EB12D0FADB0F600482482A72A9BF0F69E067AFF26CF6D74F8F` |

No migration creates or alters an extension or references Supabase-managed
`auth`, `storage`, `realtime`, `vault`, or similar schemas. Migration 0001
creates `public` if missing. Migration 0004 creates the category trigger
function/view and uses features requiring PostgreSQL 15 or newer. Migration
0011 creates/alters `flc_app_server`, changes ACL/default ACL state, enables
RLS, and creates policies. Hosted compatibility therefore remains conditional
on the staging PostgreSQL version and migration-owner capability checks above.

## 4. Current local connection configuration

Values were never printed. Sanitized inspection found:

| Source | Finding |
| --- | --- |
| `.env` | Absent |
| `.env.local` | Present but `DATABASE_URL` and public Supabase URL identify the protected original project; no verified TLS/public-schema parameters were detected |
| `.env.local` migration variables | `DIRECT_DATABASE_URL`, `DIRECT_PSQL_URL`, and project reference are missing |
| `.env.staging.local` | Absent |
| Current process | Required staging variables are unset |

`.env.local` was not changed. Never use it for staging migration commands.
Use process-scoped secrets or copy `.env.staging.example` to an untracked
`.env.staging.local`, then select it explicitly with `STAGING_ENV_FILE` and
`PRISMA_ENV_FILE` as appropriate.

## 5. Required connection targets

| Variable | Required target |
| --- | --- |
| `DIRECT_DATABASE_URL` | `postgres` owner, `db.ltcgiquvrplfrbojbbbb.supabase.co:5432/postgres`, `schema=public`, `sslmode=verify-full`, project CA path |
| `DIRECT_PSQL_URL` | Same direct owner/host/port/database/TLS, but **without** `schema=public` |
| `DATABASE_URL` | `flc_app_server.ltcgiquvrplfrbojbbbb`, exact shared-pooler host from staging Connect panel, port 6543, database `postgres`, `schema=public`, verified TLS |
| `DATABASE_CONNECTION_MODE` | `serverless` |
| `DATABASE_POOL_MAX` | `1` |

Supabase's current [connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres)
states that direct connections on port 5432 are IPv6 unless the project has the
IPv4 add-on; the shared Supavisor pooler is IPv4 and uses port 6543 for
transaction mode. Whether this workstation/deployment network has direct IPv6
reachability and whether staging has an IPv4 add-on are **UNVERIFIED**. Do not
silently substitute a session/transaction pooler for Prisma migrations.

The shared-pooler username format is `<database-role>.<project-ref>`, giving
`flc_app_server.ltcgiquvrplfrbojbbbb`. Supabase documentation and its custom
role troubleshooting material indicate that custom Postgres roles can
authenticate through Supavisor when they have a valid password and are not
expired. Staging-specific authentication remains **UNVERIFIED** until the role
exists and a separately approved connection smoke test succeeds.

## 6. TLS, URL parsing, and password handling

Download the staging Server root certificate from the staging Connect/Database
settings panel. Keep it outside the repository. All three URLs must use an
absolute, URL-encoded `sslrootcert` path and `sslmode=verify-full`.

Client differences matter:

- Prisma receives `DIRECT_DATABASE_URL` and needs `schema=public`.
- `psql`/libpq accepts `sslmode` and `sslrootcert` but rejects Prisma's
  `schema` query parameter, hence the separate `DIRECT_PSQL_URL`.
- Installed `pg`/`pg-connection-string` reads the certificate file named by
  `sslrootcert`; `verify-full` retains CA and hostname verification.
- The runtime Prisma adapter separately fixes its schema to `public`.

Username and password components must be percent-encoded before insertion into
a URL. Do not paste an unescaped password containing `@`, `:`, `/`, `?`, `#`,
`%`, or other reserved characters. Do not encode by printing the password into
terminal output or shell history; let an approved secrets manager/template
construct the value or use an interactive local process whose output is never
logged.

The non-connecting validator checks the certificate file is readable PEM and
rejects placeholders, relative paths, routing overrides, duplicate/unsupported
query parameters, improperly encoded passwords, wrong projects, roles, hosts,
ports, database names, schemas, TLS mode, and pool settings:

```powershell
$env:STAGING_ENV_FILE = 'D:\secure\flc\.env.staging.local'
npm run staging:validate-target
```

It prints only a success sentence, never connection strings or secrets.

## 7. Runtime role capability assessment

The requested role attributes match migration 0011:

- `LOGIN`, `NOSUPERUSER`, `INHERIT`;
- `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, `NOBYPASSRLS`;
- application-table DML plus analytics-view read;
- no Prisma migration-history access;
- one server-only RLS policy per application table.

This design passed local catalog assertions and the complete PostgreSQL
integration suite through `flc_app_server`. Supabase documents `postgres` as
the administrative project role, but read-only access cannot prove that this
specific staging migration identity can execute `CREATE ROLE`/`ALTER ROLE` or
that Supabase platform restrictions permit migration 0011 unchanged. Mark both
role creation and pooled custom-role authentication **UNVERIFIED**, not passed.

Do not pre-create the role, assign a password, or change role capabilities
during this preflight.

## 8. Temporary Data API exposure control

The preferred migration-window control is:

1. In staging Dashboard, open
   `https://supabase.com/dashboard/project/ltcgiquvrplfrbojbbbb/integrations/data_api/overview`.
2. Turn **Enable Data API** off immediately before the approved guard/migration
   window.
3. Run the reviewed pre-migration guard before Prisma creates any application
   object.
4. Keep Data API off until all post-migration ACL/RLS assertions pass.
5. Because FLC's architecture is server-only, leaving Data API disabled is the
   safest steady state. If it must be re-enabled, use the same dashboard toggle
   only after verification and approval.

Supabase states that this toggle disables auto-generated REST/GraphQL data
endpoints. Auth is a separate service. Repository inspection confirms FLC's
Supabase client calls are Auth-only (`supabase.auth.*`); there are no `.from()`,
`.rpc()`, or Supabase Storage calls. Therefore the intended Auth flows should
remain available while Data API is disabled. This must still receive a staging
Auth smoke test later; no hosted Auth call was made now.

`scripts/supabase-pre-migration-security.sql` is compatible with an empty
`public` schema. Inside one transaction it first checks for any relation,
sequence, view, materialized view, foreign table, or function. If one exists,
it raises before changing default privileges. It then revokes future table,
sequence, and function privileges from existing API roles for `current_user`
and removes default function execution from `PUBLIC`.

The guard requires the direct migration identity to alter its own default
privileges and to reference the standard API roles. Those capabilities remain
unverified on staging. Do not run the guard over Supavisor transaction mode.

## 9. Ordered staging deployment procedure

The following procedure is prepared only; it requires a new explicit approval.

1. Verify a disposable staging recovery point/branch and confirm no real
   customer/order data exists.
2. Reconnect MCP using the exact project-scoped read-only URL in section 1.
3. Verify `get_project_url`, then complete every read-only inspection in
   section 2. Stop unless `public` is empty and no Prisma history exists.
4. Obtain the exact direct and shared transaction-pooler strings from the
   staging Connect panel, the staging database password, a new runtime-role
   password, and the staging Server root certificate.
5. Inject secrets process-scoped or through an untracked staging secrets file.
   Never overwrite `.env.local`.
6. Run `npm run staging:validate-target`. Stop on any failure.
7. Disable staging Data API in the Dashboard. Verify REST/GraphQL data
   endpoints are unavailable and Auth health remains available.
8. Run the empty-schema guard over `DIRECT_PSQL_URL`:

   ```powershell
   psql --no-psqlrc --set ON_ERROR_STOP=1 --dbname $env:DIRECT_PSQL_URL `
     --file scripts/supabase-pre-migration-security.sql
   ```

9. Set `PRISMA_ENV_FILE` only if using the approved untracked staging file,
   rerun the target validator, and inspect `npx prisma migrate status`.
10. Confirm the pending sequence is exactly 0001-0011 and checksums match
    section 3. Then run `npm run db:deploy`.
11. Set `flc_app_server`'s password through an approved interactive/secret
    mechanism; never put it in a migration or transcript.
12. Run the privileged post-migration security assertions through the direct
    owner connection. Note that `verify-supabase-security-local.sql` creates
    and drops ACL probe objects and performs a rolled-back insert, so this step
    is a hosted write and belongs only to the separately approved deployment.
13. Validate `DATABASE_URL` again, then smoke-test the custom role through
    Supavisor transaction mode and run synthetic integration tests.
14. Reconnect read-only MCP and verify migrations, 51 RLS-enabled tables, 50
    server-only policies, zero API-role application grants, expected view/
    function security, extensions, and both advisor categories.
15. Leave Data API disabled, or re-enable it only after explicit approval and
    a final server-only access test. Keep application traffic disabled until
    every gate passes.

## 10. Pre-deployment approval checklist

- [ ] New explicit staging migration approval recorded.
- [ ] MCP returns the staging project URL exactly and is read-only/project-scoped.
- [ ] Staging catalog inspection is complete and `public` is confirmed empty.
- [ ] No existing `_prisma_migrations` table/history.
- [ ] PostgreSQL version supports all reviewed SQL.
- [ ] Default ACL exposure is recorded and guard applicability confirmed.
- [ ] Migration owner role creation/default-ACL capabilities confirmed.
- [ ] Direct IPv6 or approved IPv4 connectivity confirmed.
- [ ] Exact transaction pooler host copied from staging Connect panel.
- [ ] Staging CA downloaded outside the repository.
- [ ] Three URLs and all passwords supplied without logging/committing.
- [ ] `npm run staging:validate-target` passes.
- [ ] Recovery point and failure owner confirmed.
- [ ] Data API shutdown window approved.
- [ ] Production checkout remains disabled.

## 11. Post-migration verification checklist

- [ ] All eleven Prisma migrations completed with no rolled-back entry.
- [ ] Prisma schema diff reports no difference.
- [ ] Exactly 50 application tables plus `_prisma_migrations` exist.
- [ ] RLS is enabled on all 51 tables.
- [ ] Exactly 50 policies target only `flc_app_server`.
- [ ] API roles and `PUBLIC` have no application object access.
- [ ] Runtime role has required DML/view access and no migration-history access.
- [ ] Trigger function is security-invoker with pinned search path.
- [ ] Analytics view is security-invoker.
- [ ] Future-object default ACL probes pass.
- [ ] Supavisor custom-role TLS connection succeeds.
- [ ] Synthetic integration tests pass without real customer/admin/order data.
- [ ] Security and performance advisors reviewed.
- [ ] Auth smoke test passes while Data API is disabled.
- [ ] No managed Supabase schema changed unexpectedly.

## 12. Recovery and failure handling

- If target validation fails, run no network/database command.
- If the guard finds any `public` object, stop; inspect with staging-scoped
  read-only access. Do not reset or drop the schema.
- If direct connectivity/TLS fails, do not weaken TLS or substitute an
  unapproved endpoint. Resolve IPv6/IPv4/CA configuration.
- If role creation fails, keep Data API and traffic disabled. Review a forward
  role-provisioning adjustment; do not run the app as `postgres` or
  `service_role`.
- If any migration fails, keep Data API/traffic disabled, preserve logs and
  `_prisma_migrations`, and repair forward or discard only the approved
  disposable staging project.
- Never use `prisma migrate reset`, `prisma db push --force-reset`, linked
  remote reset, or `DROP SCHEMA ... CASCADE` as recovery.
- If post-migration security checks fail, do not set the runtime secret in the
  application and do not re-enable Data API.

## 13. Local verification evidence

All database-writing tests first asserted the destination as the isolated
loopback PostgreSQL cluster/database. No command used a hosted URL.

| Check | Result |
| --- | --- |
| Prisma schema validation | PASS |
| Migration inventory/checksums | PASS: exactly 0001-0011 |
| Fresh local migration/security harness | PASS: pre-guard, 11 migrations, ACL/RLS, runtime-role DML, zero drift |
| Unit tests | PASS: 14 files, 46 tests |
| PostgreSQL integration tests | PASS: 5 files, 23 tests through restricted local role |
| TypeScript | PASS |
| ESLint | PASS |
| Staging validator focused tests | PASS: 4 tests; combined config tests 8/8 |
| Non-connecting validator CLI smoke with synthetic values/local PEM | PASS |

## 14. Remaining blockers and decision

Blocking user actions:

1. Replace/reconfigure the MCP connection using the exact staging-scoped,
   read-only URL in section 1 and authenticate it.
2. Provide staging connection values and the CA through an approved local
   secret mechanism; do not send them in chat or commit them.
3. Confirm direct-network reachability and the staging Data API migration-window
   procedure.
4. Request a new preflight continuation so the read-only staging catalog and
   advisors can be inspected. Migration approval is a separate later action.

Final decision: **BLOCKED for a separately approved staging migration**. The
local code and safety tooling are ready, but staging identity, emptiness,
privileges, PostgreSQL version, role capability, extensions, advisors, network,
TLS, and pooler behavior have not yet been verified against the authorized
project.
