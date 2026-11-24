# FLC Decor Security, Integration and Production Readiness Audit

Updated: 2026-10-26 (Asia/Karachi)

This audit is based on the current repository code, Prisma schema/migrations, route handlers and PostgreSQL integration tests. It does not treat schema presence or documentation as proof of a runtime feature.

## Findings and priorities

| Priority | Area | Finding | Status / evidence |
|---|---|---|---|
| Critical | Checkout | Serializable inventory reservation previously leaked adapter-wrapped SQLSTATE `40001` (`P2010`) instead of retrying. | Fixed in `lib/database-store.ts`; 8 PostgreSQL integration tests pass, including repeated concurrent load. |
| High | Admin access | The admin page was only redirected in production middleware and could render its synthetic dashboard locally without a session. | Fixed with server-side `requireAdmin` in `app/admin/page.tsx`; media validation also requires an explicit admin permission. |
| High | Guest tracking | Order lookup was fail-closed but had no usable challenge/capability backend. | Implemented local mock-delivery flow in `lib/guest-tracking.ts` and verification routes. Codes are hashed in PostgreSQL, capabilities are hashed, scoped and expiring; no route reveals whether a request matched. |
| High | Payments | Payment schema existed without runtime signature, amount, state-transition or webhook deduplication handling. | Provider-independent test-only mock boundary added in `lib/payment-integrity.ts`; real providers remain disabled. |
| High | Notifications | Outbox tables existed without a worker claim/retry/dead-letter path. | Added SKIP LOCKED claim, committed claim-before-delivery, bounded retries and dead-letter state in `lib/outbox-worker.ts`. External delivery remains mock-only. |
| High | Customer identity | Current customer login/session implementation is process-local demo auth; durable identity/provider binding is not enabled. | Fail-closed production boundary retained. `/api/account/orders` derives ownership from the authenticated session and never accepts a client owner ID. Production identity remains blocked. |
| High | Admin RBAC | Role/permission tables and vocabulary exist, but no durable identity-to-role runtime is enabled. | Demo admin permission allowlist is explicit; production permission evaluation remains blocked until the approved identity authority is connected. |
| High | Backup/recovery | No provider backup/restore drill has been executed. | Guarded disposable-local `pg_dump`/`pg_restore` helpers and runbook added; production RPO/RTO remains unverified. |
| Medium | Performance | Pool bounds and relevant indexes exist, but no representative load or production query-plan evidence exists. | Read-only plan/load checks remain required against a disposable database only. |

## Security controls now exercised

- Customer resource ownership is bound to the server session; cross-customer owner IDs are rejected by tests.
- Admin MFA and permission checks remain server-side.
- Guest tracking requires an expiring, attempt-limited challenge and a scoped capability; order number alone returns no data.
- Payment events require a verified provider boundary, exact amount/currency, allowed state transition and unique provider event ID.
- Outbox delivery occurs only after a committed claim and uses bounded retry/dead-letter states; provider calls are outside database transactions.
- Production mode continues to reject synthetic/demo auth, payment, tracking and checkout paths.

## Production blockers

1. Select and configure the production identity authority, durable sessions, customer MFA/reset delivery and admin role mapping.
2. Obtain approved payment merchant accounts and implement each provider's documented signature/callback adapter; do not reuse the mock HMAC adapter.
3. Configure an approved email/SMS provider and notification worker credentials, templates, rate limits and redacted observability.
4. Approve shipping, tax, courier, COD, cancellation, returns, payment reconciliation and order-state policies.
5. Execute a separate backup restore drill, failover/durability test, connection-pool sizing test and representative load test.
6. Configure managed secrets, encryption key rotation, TLS, least-privilege database roles, retention/deletion policy and monitoring.

Production checkout remains disabled.
