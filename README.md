# FLC Decor — Fahad Laser

This repository is a local-first synthetic demo storefront for Fahad Laser / FLC Decor. It implements the documented shopping journey with an original warm-neutral visual system, CSS sample artwork, server-authoritative demo quotes, idempotent demo COD order creation, inventory checks, private tracking boundary, admin preview, and a production-shaped Prisma/PostgreSQL schema.

The project is not production-ready. Local customer authentication remains a process-local demo adapter, while administrator identity, RBAC, MFA and sessions can use the local PostgreSQL database. Production checkout remains fail closed. See [`FRONTEND_INTEGRATION_STATUS.md`](./FRONTEND_INTEGRATION_STATUS.md), [`BACKEND_IMPLEMENTATION_AUDIT.md`](./BACKEND_IMPLEMENTATION_AUDIT.md) and [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md).

Cloudflare R2 media support is implemented but disabled until scoped credentials are configured. See [`docs/R2_MEDIA_RUNBOOK.md`](./docs/R2_MEDIA_RUNBOOK.md) for the private staging, approval, cleanup, and disposable-bucket verification workflow.

The first local PostgreSQL administrator is created with `npm run admin:bootstrap:local`; no public admin registration exists. See [`docs/ADMIN_BOOTSTRAP_RUNBOOK.md`](./docs/ADMIN_BOOTSTRAP_RUNBOOK.md) for the one-time bootstrap, login, MFA enrollment and image-upload workflow.

## Run locally

1. Install Node.js 22+ and copy `.env.example` to `.env.local`.
2. Install dependencies: `npm install`.
3. Start the storefront: `npm run dev`.
4. Open `http://localhost:3000`.

Optional database-shaped setup:

```powershell
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
```

The default storefront uses sample catalog data and process-local demo checkout, so demo orders reset when the server restarts. To use the migrated local PostgreSQL catalog, set `CATALOG_RUNTIME=database`; shop, product and cart views then resolve database products. The separate opt-in database checkout requires `CHECKOUT_RUNTIME=database`, one active inventory location, a valid random `CHECKOUT_FIELD_ENCRYPTION_KEY`, and `CHECKOUT_TOTALS_MODE=synthetic-zero`. That total mode is for synthetic development only. Production checkout remains disabled by code. Do not run migration or seed commands against a production database.

## Checks

```powershell
npm run typecheck
npm test
npm run build
npm run security:audit
npm run db:validate
```

Additional check scripts are available for unit, PostgreSQL integration and
Playwright E2E suites. `npm run db:deploy` uses `DIRECT_DATABASE_URL` when set.
Integration/E2E commands require their declared services and are not treated
as passing until they have actually run. Database runbooks and current evidence
are in [`docs/database/`](./docs/database/).

The local `.github/workflows/ci.yml` is prepared for a future private GitHub
repository. No remote or GitHub execution is claimed in this local checkout.

## Important boundaries

- `DEMO_CHECKOUT_ENABLED=true` is for synthetic local testing only. Set it to `false` outside local development until shipping, tax, courier, returns, cancellation, legal retention, notification and operational status policies are approved.
- Product data and CSS artwork are fake sample fixtures; they are not real catalog facts or final photography.
- The owner-confirmed WhatsApp, telephone, email and public address are centralized in `lib/business-contact.ts`. Shipping, tax, courier, legal policy, real payment and notification providers remain unconfigured.
- Production-grade customer identity, administrator recovery/rotation, distributed rate limiting, secure guest-email delivery, R2 credentials, observability, HA database failover and backup/key recovery require production adapters and infrastructure before live orders. Local PostgreSQL admin sessions and TOTP MFA are implemented and tested.

See [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md), [`10_ROADMAP.md`](./10_ROADMAP.md), and [`12_DECISIONS.md`](./12_DECISIONS.md) for the current implementation and decisions.

The current database security and integration audit is in [`SECURITY_INTEGRATION_AUDIT.md`](./SECURITY_INTEGRATION_AUDIT.md). It distinguishes locally tested mock boundaries from production blockers; production checkout remains disabled.

## Architecture documentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — trust boundaries, data flow and failure modes.
- [`docs/DATABASE.md`](./docs/DATABASE.md) — PostgreSQL entities, constraints and migration workflow.
- [`docs/SECURITY.md`](./docs/SECURITY.md) — security controls and known gaps.
- [`docs/OPERATIONS.md`](./docs/OPERATIONS.md) — environments, backups, monitoring and incident procedures.
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — pointer to the source decision register.
