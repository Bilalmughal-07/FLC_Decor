# Database security and authorization

## Identity boundary

Production auth authority is not provisioned. Architecture prefers Supabase Auth; `CustomerProfile.authUserId` stores its UUID without a database FK to a proprietary schema. The existing custom `User`/`Session`/MFA/reset models support local legacy/demo code and are not selected for production. Before production, document one authority, map external identities, disable legacy auth routes, and test every server authorization check.

## Data classes

- Public: published catalog fields only.
- Restricted: customer profile/address, order snapshots, contact lookup hashes, payment records.
- Highly restricted: auth provider tokens, MFA secrets, payment provider credentials, encryption keys. These are not stored as plaintext in application tables; provider/managed secrets belong in secrets management.
- Audit and outbox payloads contain identifiers and redacted metadata, never full addresses, OTPs, PAN/CVV, provider secrets or full email bodies.

## Access controls

The intended application role receives only required CRUD on application tables; migration role owns DDL; reporting role receives read-only views; worker role receives only outbox/notification operations. Exact role creation is deployment-specific and not performed on the local pre-existing PostgreSQL service. If direct Supabase clients are introduced, enable and test RLS for every exposed table. Current app uses trusted server route handlers, so server-side authorization remains mandatory even with RLS.

Audit, status, inventory movement, payment transaction, webhook and consent history are append-only by application contract. A production deployment should revoke UPDATE/DELETE from runtime roles and use correction events. Migration 0004 preserves existing models and data, but does not alter old cascades until reviewed against real data.

## Operational protection

TLS, managed at-rest encryption, least-privilege credentials, key rotation, encrypted backups, redacted logs and privacy retention require a chosen host and owner policy. Never log `DATABASE_URL`. Do not expose order/payment/audit/contact tables through public APIs. Current production checkout remains fail-closed.
