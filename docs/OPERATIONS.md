# FLC Decor Operations Runbook

## Environments

Use separate development, staging and production projects, databases, storage buckets, Auth identities, email identities and secrets. `.env.example` contains placeholders only. Never copy production secrets into local development or untrusted CI jobs.

## Release sequence

1. Run lint, strict typecheck, unit/integration/E2E/accessibility/security checks and production build.
2. Review migration SQL and apply it with a controlled migration identity.
3. Run staging smoke tests for catalog, checkout, auth, admin and media.
4. Verify monitoring, alert routing, backup freshness and restore evidence.
5. Obtain owner approval for shipping/tax/courier/returns/status/contact/legal policy.
6. Deploy with a rollback target and monitor checkout errors, latency, DB health, outbox backlog and auth abuse.

## Backup and restore requirements

Production readiness requires encrypted automated PostgreSQL backups with protected off-site retention, a separate R2 media recovery plan, key recovery and a real restore into an isolated database. Record restore duration, row counts, checksums, media reference integrity and application smoke results. Define owner-approved RPO/RTO before marking readiness.

## Incident response

- Checkout/DB incident: fail closed for new critical writes, preserve request IDs and idempotency keys, investigate before retrying.
- Credential compromise: revoke sessions/keys, rotate provider credentials, review audit events and restore only from verified backups.
- Malicious media: quarantine object, remove public reference, preserve evidence, scan affected references and review upload controls.
- Data exposure: stop affected access, preserve redacted logs, notify the owner/legal contact according to the approved policy.

## Current limitation

The local demo has no production monitoring, backup, restore, failover, alerting, outbox worker or real notification provider. Docker was unavailable during the audit, so the PostgreSQL migration was schema-validated but not applied to a running database.
