# Incident Runbook

## Checkout/database incident

Fail closed for new critical writes, preserve request IDs and idempotency keys, inspect durable order/ledger state, reconcile before retrying, and communicate only through approved channels.

## Credential or session compromise

Revoke affected sessions and keys, disable impacted admin identities, rotate secrets, review redacted audit events, and restore only from verified backups.

## Malicious media

Quarantine the object, remove public references, retain evidence safely, scan affected references, and review upload validation and delivery headers.

## Data exposure

Stop the affected route, preserve minimal redacted evidence, determine scope, follow approved legal/owner notification policy, and document corrective actions.

Current status: procedural runbook only; no alerting/incident integration is configured.
