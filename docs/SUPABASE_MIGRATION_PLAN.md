# Supabase migration plan

Updated: 2026-10-27

## Current boundary

The connected hosted Supabase project is authenticated and was inspected with
read-only MCP operations. Its `public` schema and migration history are empty.
The FLC Decor Prisma schema currently lives only in the local PostgreSQL
development/test stack. No hosted schema, record, Auth user, policy, setting,
or secret was changed during this implementation run.

Customer identity can now use Supabase Auth while application data continues
through the server-side Prisma connection. The browser receives only the
project URL and publishable key. The service-role key is neither required nor
permitted in browser code.

## Approval-gated migration sequence

1. Create a disposable Supabase branch or separate staging project. Do not use
   the production project as the first migration target.
2. Configure direct and pooled PostgreSQL URLs separately. Prisma migrations
   use `DIRECT_DATABASE_URL`; the Next.js runtime uses the transaction-pooler
   `DATABASE_URL` with a bounded application pool.
3. Review all nine existing migrations against a schema-only staging restore.
   Preserve quoted Prisma identifiers and existing constraints. Do not use
   `db push` as a substitute for reviewed migration history.
4. Revoke broad default privileges. Grant the server runtime only the table,
   sequence, and function privileges it actually needs. Never use a database
   owner or service-role credential in the browser.
5. Decide whether the application tables will be exposed through Supabase Data
   API. The current architecture does not require that exposure. If they are
   exposed, enable and test RLS on every exposed table before granting
   `anon`/`authenticated` access. Index all columns used by policies and wrap
   stable auth calls as `(select auth.uid())`.
6. Keep `CustomerProfile.authUserId` as the external Supabase Auth UUID. Do not
   add a foreign key into Supabase's private `auth` schema and never claim an
   existing profile by matching email alone. Resolve collisions through an
   authenticated, audited recovery procedure.
7. Apply migrations to staging, run Prisma validation/generation, seed only
   unmistakably synthetic fixtures, and execute the complete PostgreSQL,
   checkout-concurrency, account, admin, and browser suites.
8. Run Supabase security/performance advisors, inspect grants/RLS explicitly,
   test backup/restore and rollback procedures, and obtain owner approval before
   any production migration.

## Supabase Auth configuration

Set these outside source control:

```dotenv
AUTH_RUNTIME=supabase
NEXT_PUBLIC_APP_URL=https://approved-application-origin.example
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Add exact allowed redirect URLs for both email and OAuth flows:

- `https://approved-application-origin.example/auth/callback`
- `https://approved-application-origin.example/auth/confirm`
- Local development equivalents only when local Auth testing is intended.

Configure Google OAuth in Supabase and Google Cloud before exposing the Google
button in a production deployment. Configure custom SMTP before relying on
verification, resend, invitation, or password-recovery delivery. Supabase's
default email service is not treated as a production sender.

## Verification and rollback

- Run all destructive/write tests only against the allowlisted
  `127.0.0.1:5433/flcdecor_test` database or an approved disposable branch.
- Snapshot and verify restore before a production migration.
- Deploy application code with `AUTH_RUNTIME` unset/disabled first if a staged
  schema rollout is needed; enable Supabase auth only after redirects, SMTP,
  OAuth, cookies, and profile-linking tests pass.
- Roll back runtime activation by disabling `AUTH_RUNTIME`; do not roll back
  data by dropping tables. Database rollback requires the reviewed backup and
  forward-fix process.

## Outstanding approval

Hosted Prisma migration, grants/RLS, SMTP, Google provider credentials,
production redirect URLs, production database credentials, backup policy, and
production admin identity strategy remain explicitly unapproved.
