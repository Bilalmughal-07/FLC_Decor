# FLC Decor — Fahad Laser

This repository is a local-first synthetic demo storefront for Fahad Laser / FLC Decor. It implements the documented shopping journey with an original warm-neutral visual system, CSS sample artwork, server-authoritative demo quotes, idempotent demo COD order creation, inventory checks, private tracking boundary, admin preview, and a production-shaped Prisma/PostgreSQL schema.

The project is not production-ready. The current local adapter deliberately fails closed for production checkout and does not yet implement customer/admin authentication, MFA, email verification, secure media processing, persistent runtime services, or production operations. See [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) and [`FINAL_AUDIT_REPORT.md`](./FINAL_AUDIT_REPORT.md).

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

The local demo storefront uses an in-memory adapter so it can run without Docker; demo orders reset when the server process restarts. The Prisma schema and migration define the recommended PostgreSQL persistence path and are not a claim that the in-memory fallback meets production durability requirements.

## Checks

```powershell
npm run typecheck
npm test
npm run build
```

## Important boundaries

- `DEMO_CHECKOUT_ENABLED=true` is for synthetic local testing only. Set it to `false` outside local development until shipping, tax, courier, returns, cancellation, legal retention, notification and operational status policies are approved.
- Product data and CSS artwork are fake sample fixtures; they are not real catalog facts or final photography.
- WhatsApp, email, phone, public address and social contact values remain `NOT_CONFIGURED`.
- Admin TOTP, customer sessions/MFA, secure guest-email delivery, image decoding/storage, observability, HA database failover and backup/key recovery require production adapters and infrastructure before live orders.

See [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md), [`10_ROADMAP.md`](./10_ROADMAP.md), and [`12_DECISIONS.md`](./12_DECISIONS.md) for the current implementation and decisions.

## Architecture documentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — trust boundaries, data flow and failure modes.
- [`docs/DATABASE.md`](./docs/DATABASE.md) — PostgreSQL entities, constraints and migration workflow.
- [`docs/SECURITY.md`](./docs/SECURITY.md) — security controls and known gaps.
- [`docs/OPERATIONS.md`](./docs/OPERATIONS.md) — environments, backups, monitoring and incident procedures.
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — pointer to the source decision register.
