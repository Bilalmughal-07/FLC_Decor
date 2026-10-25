# FLC Decor Database and Migration Notes

The source schema is [`prisma/schema.prisma`](../prisma/schema.prisma); the forward migration is under [`prisma/migrations/0001_init/migration.sql`](../prisma/migrations/0001_init/migration.sql).

## Entities

The schema covers users/sessions, two-level categories, products and additional category placements, variants, media assets and references, carts, orders, immutable order items, inventory ledger, checkout idempotency, guest verification, status events and audit events.

Money is integer PKR minor units. Product/variant identifiers, SKU and slug constraints are database-backed. Variant stock and prices have SQL checks in the migration. Historical orders retain product and variant snapshots and use explicit `ON DELETE` rules.

## Migration workflow

```powershell
$env:DATABASE_URL="postgresql://..."
npm run db:generate
npx prisma validate
npm run db:migrate
npm run db:seed
```

Run migrations against a controlled migration connection before application traffic. Never use destructive `db push` or automatic startup sync in staging/production. Every migration requires a forward plan, rollback/recovery notes, backup verification and an isolated restore test.

## Current limitations

- The running storefront still uses the in-memory demo adapter; it does not use Prisma at runtime.
- Docker/PostgreSQL execution has not been verified in this environment because the Docker daemon is unavailable.
- Auth/MFA factor tables, outbox processing, category-depth enforcement and media cleanup jobs require the production persistence implementation.
- PostgreSQL nullable composite uniqueness for variant combinations requires an explicit normalization/partial-index decision before production use.
