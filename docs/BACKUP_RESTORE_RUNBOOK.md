# Backup and Restore Runbook

## Production prerequisites

Use an owner-approved PostgreSQL provider with encrypted point-in-time backups, an independent recovery location, protected key recovery, and a separately recoverable R2/media bucket. Do not infer these guarantees from a free tier.

## Restore drill

1. Freeze or isolate the target restore database; never overwrite production.
2. Restore the selected encrypted backup and record backup timestamp, key version, duration and checksum.
3. Apply only reviewed forward migrations.
4. Verify row counts, order/item totals, inventory-ledger reconciliation, idempotency rows and media references.
5. Point a staging build at the isolated database and run catalog, auth, admin and order smoke tests.
6. Record measured RPO/RTO, discrepancies and rollback/cleanup evidence.

Current status: NOT RUN. Docker is unavailable and no production provider/credentials are authorized.
