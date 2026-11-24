# FLC Decor Database and Migration Notes

The source schema is [`prisma/schema.prisma`](../prisma/schema.prisma); the additive migration history is under `prisma/migrations/0001_init` through `0004_production_database_foundation`.

## Entities

The schema covers legacy demo identity, external-auth customer profiles, normalized roles, two-level categories, catalog and media, carts, ready-stock balances/reservations/movements, orders and immutable snapshots, separate fulfillment/payment state, shipments, payment lifecycle, webhook dedupe, notification/outbox delivery, guest tracking capabilities, audit events and a derived placed-value view. See [`database/DATA_DICTIONARY.md`](./database/DATA_DICTIONARY.md) and [`database/EXISTING_SCHEMA_AUDIT.md`](./database/EXISTING_SCHEMA_AUDIT.md).

Money is integer PKR paisa. Existing variant IDs/SKUs/slugs are retained. The new inventory balance is on-hand/reserved per location; `availableQty` remains as a compatibility column while a separately verified cutover is pending. The migration mirrors it into an inactive `MAIN` baseline without destructive updates. Null variant combinations receive a PostgreSQL `NULLS NOT DISTINCT` unique index. Historical legacy statuses are copied to events and only unambiguous fulfillment states are mapped; old payment state stays unknown/NULL.

## Migration workflow

```powershell
$env:DATABASE_URL="postgresql://..."
$env:DIRECT_DATABASE_URL="postgresql://..."
npm run db:validate
npm run db:deploy
npm run db:seed
```

Run migrations against a controlled migration connection before application traffic. Never use destructive `db push` or automatic startup sync in staging/production. Every migration requires a forward plan, rollback/recovery notes, backup verification and an isolated restore test.

## Current limitations

- The default storefront still uses in-memory demo checkout. The database adapter is opt-in, demo-only and synthetic-zero totals only.
- Migration 0004 has not been applied. Docker is unavailable and documented local demo credentials were rejected by the port 5432 PostgreSQL listener; owner/database identity remains unknown.
- Outbox worker, payment/provider integration, category-trigger execution, admin CRUD, media cleanup and guest verification remain unimplemented/unverified.
- The migration preserves old `Order.status` and adds independent fulfillment/payment columns. Legacy payment status is not inferred from method and stays NULL.
