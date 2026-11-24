# Free-tier deployment assessment

Updated: 2026-10-27 (Asia/Karachi)

This is a preparation document, not a deployment record. No host, DNS,
Supabase schema, R2 bucket or external provider was changed.

## Recommendation

There is no approved zero-cost production host for this commercial storefront.
Vercel Hobby is restricted to personal/non-commercial use, so it is suitable
only for an owner-controlled development preview, not FLC Decor commerce.
Cloudflare Workers is a possible future route, but its recommended Next.js 16
adapter (`vinext`) is currently beta and this application must first prove
compatibility with Prisma's PostgreSQL adapter, TCP pooling, Sharp's native
image pipeline, Next.js proxy/cookies, and all route handlers. Do not migrate
the runtime merely to obtain a free tier.

The lowest-risk initial staging shape is a Node.js-compatible Next.js host plus
Supabase Auth/PostgreSQL and private Cloudflare R2. Select a business-appropriate
paid plan before public commercial traffic. Reassess current terms, quotas and
regional availability at selection time.

Current provider references:

- Vercel Hobby usage and non-commercial restriction:
  https://vercel.com/docs/plans/hobby
- Cloudflare Next.js/Workers compatibility:
  https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- Supabase connection modes:
  https://supabase.com/docs/guides/database/connecting-to-postgres
- Supabase Auth SMTP limits:
  https://supabase.com/docs/guides/auth/auth-smtp
- Cloudflare R2 pricing/quotas:
  https://developers.cloudflare.com/r2/pricing/

## Compatibility work before staging

1. Run the unmodified Node deployment first. Confirm Next.js 16, Node 22,
   Sharp, the AWS R2 SDK, Prisma 7 and `@prisma/adapter-pg` are supported by the
   selected runtime.
2. Use a Supabase pooler URL appropriate to the runtime for `DATABASE_URL` and
   a direct/session URL for `DIRECT_DATABASE_URL`. For serverless instances,
   begin with `DATABASE_POOL_MAX=1`, require TLS, and load-test before raising
   it. Migrations never use the transaction pooler.
3. Keep schema/data access server-side. The browser receives only the Supabase
   project URL and publishable key; no database password, secret API key or R2
   credential enters a `NEXT_PUBLIC_` variable.
4. Run the production build and full mocked browser suite on the target build
   image. Then run isolated staging checks for SSR cookies, OAuth callback,
   password recovery, database transactions and R2 upload processing.
5. Run `/api/health` for liveness and `/api/health/ready` for a minimal database
   and auth-configuration readiness signal. Keep provider details out of the
   response.
6. Run outbox processing as a separately authenticated/scheduled worker. A
   request-driven or process-local development worker is not a production job.

## Environment variables (names only)

Application/runtime:

- `NODE_ENV`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_BUILD_DIR`
- `TRUSTED_PROXY_CIDRS`

Database:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `DATABASE_POOL_MAX`

Customer/admin security:

- `AUTH_RUNTIME`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `ADMIN_AUTH_RUNTIME`
- `AUTH_FIELD_ENCRYPTION_KEY`
- `SESSION_SECRET`

Commerce/provider gates:

- `CHECKOUT_RUNTIME`
- `CHECKOUT_TOTALS_MODE`
- `CHECKOUT_FIELD_ENCRYPTION_KEY`
- `DEMO_CHECKOUT_ENABLED`
- `CATALOG_RUNTIME`
- `GUEST_TRACKING_ENABLED`
- `GUEST_TRACKING_DELIVERY`
- `PAYMENT_PROVIDER_RUNTIME`
- `NOTIFICATION_RUNTIME`

Media:

- `MEDIA_STORAGE_RUNTIME`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`
- `R2_PUBLIC_BASE_URL`

One-time local bootstrap variables must not be present in a running production
deployment: `ADMIN_BOOTSTRAP_ENABLED`, `ADMIN_BOOTSTRAP_ENV`,
`ADMIN_BOOTSTRAP_CONFIRM`, `INITIAL_ADMIN_EMAIL`, and
`INITIAL_ADMIN_PASSWORD`.

## Free-tier limitations and production blockers

- Supabase free projects can pause after inactivity and do not provide the
  production backup/SLA posture assumed by a public store. Custom SMTP is
  required for public Auth email delivery; the built-in sender is restricted.
- Process-local rate limiting is not shared between serverless instances. Add
  an approved distributed limiter/WAF policy before public traffic.
- Runtime logs on free plans can have very short retention. Configure redacted
  operational logs, metrics and alerts without customer secrets.
- R2's free allowance does not remove the need for scoped credentials, private
  staging, lifecycle monitoring, backup/recovery and cost alerts.
- Google OAuth needs exact production and staging callback URLs in both Google
  Cloud and Supabase.
- Backups, restore drills, RPO/RTO, data retention/deletion and incident
  ownership require explicit approval.

## Staging sequence

Create a separate staging project/branch and R2 test bucket, store secrets in
the host secret manager, apply reviewed migrations with the migration URL,
seed synthetic data only, run all quality gates, verify backup restore, and
perform the manual OAuth/SMTP/R2 checks. Production remains disabled until the
go-live checklist is signed off.
