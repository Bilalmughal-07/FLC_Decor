# Migration and backup runbook

## Migration safety

1. Confirm target environment/database and current migration history using read-only inspection.
2. Obtain and verify a restorable backup before non-disposable migrations. Record backup ID, restore point, owner, and recovery key access without placing secrets in the repository.
3. Rehearse on a clean disposable PostgreSQL DB, then on a restored copy containing synthetic prior-version rows.
4. Run `npm run db:validate`, `npm run db:deploy`, schema/constraint tests, and inventory reconciliation. Never use `prisma db push` in production.
5. Migrations are forward-only/additive. If a migration fails, stop deployment and use a reviewed forward-fix; do not reset/drop/truncate.
6. Deployment may proceed only with backward-compatible application code and an approved rollback/forward-fix plan.

## Local database commands

```powershell
Copy-Item .env.example .env.local
# Configure DATABASE_URL and DIRECT_DATABASE_URL with local-only credentials.
docker compose up -d postgres
npm run db:validate
npm run db:deploy
npm run db:seed
npm run test:integration
```

Do not copy demo credentials into production. The current machine's Docker daemon was unavailable at audit time; a PostgreSQL listener was present on port 5432, but its owner/credentials/contents were not inspected. No operation may migrate that service until its ownership and disposable status are confirmed. Use a dedicated disposable DB from CI or an explicitly isolated local container.

## Backup/restore

Production provider, encryption, PITR entitlement, retention, RPO/RTO and key recovery are owner decisions. Once selected: enable provider-native PITR/encrypted backups; test a restore into an isolated DB; verify migration state, row counts, checksums, ledger/balance reconciliation, order snapshots, idempotency replay and application smoke. Restore media object metadata and R2 bytes with checksum verification. Record elapsed times and discrepancies. No restore was executed in this implementation run.
