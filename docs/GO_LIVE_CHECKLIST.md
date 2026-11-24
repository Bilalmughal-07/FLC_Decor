# FLC Decor go-live checklist

Updated: 2026-10-27 (Asia/Karachi)

Current decision: **NO-GO**. Production checkout must remain disabled.

## Identity and administration

- [ ] Hosted Supabase migrations explicitly approved and applied to staging.
- [ ] Exact site/confirmation/recovery/Google callback URLs approved.
- [ ] Custom SMTP sender/domain configured; SPF, DKIM and DMARC verified.
- [ ] Email verification, resend, recovery, logout and session expiry tested live.
- [ ] Google consent/provider flow tested for new, returning and cancelled users.
- [ ] Initial production admin identity strategy approved; no public elevation.
- [ ] Every administrator enrolled in MFA and stored recovery material safely.
- [ ] Admin recovery, removal, role review and key-rotation procedures tested.
- [ ] Distributed auth/admin/upload/checkout/guest rate limits configured.

## Catalog, media and business policy

- [ ] Owner-approved products, SKUs, PKR prices, descriptions and image rights.
- [ ] Real R2 private bucket uses least-privilege credentials and rotation.
- [ ] Disposable-bucket upload/approve/read/detach/purge/reconcile test passed.
- [ ] If direct media delivery is used, only `public/` is exposed; staging is private.
- [ ] Shipping areas, courier rates, delivery windows and COD eligibility approved.
- [ ] Tax/invoice, cancellation, returns, refunds and failed-delivery policy approved.
- [ ] Legal terms, privacy notice, contact details and retention schedule reviewed.
- [ ] WhatsApp custom-order flow confirmed; no on-site custom-order builder.

## Checkout and data integrity

- [ ] Production checkout activation receives a separate recorded owner approval.
- [ ] Server pricing policy is configured; no synthetic-zero mode in production.
- [ ] Staging duplicate/idempotency, price tamper and multi-line rollback tests pass.
- [ ] Repeated concurrent final-unit test passes without negative stock or orphans.
- [ ] COD confirmation, dispatch, collection, cancellation and return responsibilities approved.
- [ ] Payment method scope resolved; any online provider has real signed-webhook tests.
- [ ] Guest tracking email delivery and privacy controls are live-tested.
- [ ] Confirmation/order/account pages expose no cross-customer personal data.

## Database and operations

- [ ] Runtime pooler and migration/direct URLs are separate and TLS-enforced.
- [ ] Least-privilege runtime and migration roles reviewed; no browser DB secret.
- [ ] Security/performance advisors reviewed after staging migration.
- [ ] Encrypted backup and isolated restore drill completed with row/checksum evidence.
- [ ] RPO/RTO, retention, deletion requests and backup deletion behavior approved.
- [ ] `/api/health` and `/api/health/ready` monitored without leaking configuration.
- [ ] Outbox worker scheduling, lease recovery, dead-letter alert and manual replay tested.
- [ ] Redacted logs, inventory/checkout/auth alerts and incident ownership configured.
- [ ] Domain, HTTPS/HSTS, DNS, CSP and rollback target verified in staging.

## Release evidence

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test:unit`
- [ ] `npm run test:integration` against verified isolated `flcdecor_test` only
- [ ] `npm run test:e2e`
- [ ] `npm run db:validate`
- [ ] `npm run security:audit`
- [ ] `npm run build`
- [ ] Manual desktop/mobile accessibility and checkout privacy review
- [ ] Owner go/no-go record and named rollback operator

Unchecked items are blockers, not optional enhancements.
