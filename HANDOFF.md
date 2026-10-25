# Fahad Laser / FLC Decor — Local Demo Handoff

## What works

- Responsive Fahad Laser storefront with original warm-neutral/brass visual system.
- Home editorial layout, category exploration, shop/search/filter/sort, product detail, valid variant selection, stock indicators, cart and accessible theme toggle.
- Server routes for catalog, health, readiness, quote, idempotent demo order creation and limited order lookup.
- Demo COD flow with server-authoritative prices, sale prices, stock-safe mutation, duplicate-key replay, conflicting-key rejection and concurrent final-unit protection.
- Success page, private guest-tracking boundary, account/admin/policy surfaces, custom-order WhatsApp placeholder and no-invented-contact behavior.
- Prisma/PostgreSQL production-shaped schema, initial migration, seed script and local Docker Compose PostgreSQL service.
- OpenAPI starter contract, environment example, lint/typecheck/test/build scripts and decision/status logs.

## Verify

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Optional database setup:

```powershell
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
```

Checks already run successfully on 2026-10-26:

- `npm run lint`
- `npm run typecheck`
- `npm test` — 5 tests
- `npm run build` — Next.js 15.5.28, 30 routes
- HTTP smoke checks for health/readiness/home/catalog/quote/order/replay/conflict/tracking

## Production blockers

Do not accept live orders until the owner approves and configures courier/shipping/tax/returns/cancellation/status/retention/contact policies; production sessions, MFA, email verification, image safety/storage, notifications, observability, secrets, HA/failover, encrypted backups, restore/key recovery and load/resilience gates. The local in-memory adapter resets orders on restart and does not provide production durability.

See `IMPLEMENTATION_STATUS.md` and `12_DECISIONS.md` for the detailed state and autonomous decisions.
