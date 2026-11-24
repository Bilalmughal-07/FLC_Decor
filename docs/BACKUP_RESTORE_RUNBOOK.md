# Backup and Restore Runbook

## Production prerequisites

Use an owner-approved PostgreSQL provider with encrypted point-in-time backups, an independent recovery location, protected key recovery, and a separately recoverable R2/media bucket. Do not infer these guarantees from a free tier.

## Local disposable verification

The repository includes guarded PowerShell helpers for local testing only:

```powershell
$env:DATABASE_URL = "postgresql://...@127.0.0.1:5433/flcdecor_test"
.\scripts\backup-postgres.ps1 -OutputPath .\tmp\flcdecor_test.dump
pg_restore --list .\tmp\flcdecor_test.dump

$env:DATABASE_URL = "postgresql://...@127.0.0.1:5433/flcdecor_restore"
$env:ALLOW_DISPOSABLE_RESTORE = "true"
.\scripts\restore-postgres.ps1 -BackupPath .\tmp\flcdecor_test.dump
```

The scripts refuse non-local hosts, databases outside the disposable allowlist, and backup overwrite. The restore helper requires an explicit disposable restore flag. Do not put dump files, connection strings or customer data in Git.

## Restore drill

1. Freeze or isolate the target restore database; never overwrite production.
2. Restore the selected encrypted backup and record backup timestamp, key version, duration and checksum.
3. Apply only reviewed forward migrations.
4. Verify row counts, order/item totals, inventory-ledger reconciliation, idempotency rows and media references.
5. Point a staging build at the isolated database and run catalog, auth, admin and order smoke tests.
6. Record measured RPO/RTO, discrepancies and rollback/cleanup evidence.

Current status: Local backup/restore helper prepared; a restore drill is not claimed until `pg_dump`, `pg_restore`, a separate disposable database, checksum/row-count validation and migration verification are executed. Production backup guarantees remain provider- and plan-dependent.
