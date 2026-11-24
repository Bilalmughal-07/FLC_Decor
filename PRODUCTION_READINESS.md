# FLC Decor Production Readiness

Updated: 2026-10-26 (Asia/Karachi)

This checklist is evidence-based. A checked item has a concrete verification reference. Unchecked items are not claims of readiness.

## Repository and environments

- [x] Local project audited; existing Next.js app preserved. Evidence: `IMPLEMENTATION_STATUS.md`, `FINAL_AUDIT_REPORT.md`.
- [x] `.gitignore` excludes `.env*` while retaining `.env.example`, dependencies, builds and generated state.
- [ ] Private GitHub repository created and connected. Blocked: no external repository/authentication was authorized or available.
- [ ] Protected branch, pull-request checks and CI configured. Blocked until a remote exists.
- [x] Safe `.env.example` exists with placeholders only.
- [x] No production credentials or real customer records are present in the project audit.

## Application and data

- [x] Local Next.js TypeScript build passes.
- [x] Baseline security response headers and no-index demo robots policy are present.
- [x] Global loading and error states are present.
- [x] Prisma schema validates and client generation passes with `DATABASE_URL` supplied.
- [x] Additive migration 0004 and production database schema are defined with explicit new foreign-key/delete rules. Prisma validation/generation pass; SQL application is unverified.
- [x] Development-only seed script exists.
- [ ] Runtime is switched to verified PostgreSQL transactions instead of the in-memory demo adapter. Opt-in demo path uses balances/reservations; default and production remain demo/fail-closed.
- [ ] Durable idempotency, inventory ledger, outbox and unknown-commit recovery are production-verified. Schema/code exists; integration/restart evidence remains open.
- [ ] Category-depth trigger and NULLS NOT DISTINCT variant-combination constraint are executed and verified in PostgreSQL.
- [ ] Production identity/RLS/backend-only boundaries and admin role mapping are implemented. Local demo auth is not a production provider.
- [ ] R2/object-storage authorization, processing and cleanup are implemented. Local media validation is available; storage remains disabled.

## Security and privacy

- [ ] Customer registration/login/logout/reset and secure revocable sessions in a durable production provider. Local demo sessions are verified only.
- [ ] Mandatory administrator MFA and optional customer MFA in durable production identity. Local TOTP/recovery helpers are verified only.
- [ ] CSRF, distributed rate limits, secure cookies and authorization middleware. Local origin checks/cookies/rate limits are verified.
- [ ] Verified guest email challenge and scoped order capability. Current behavior fails closed.
- [ ] Secure media validation, quarantine, EXIF stripping and reference-safe deletion. Validation/re-encode is implemented; durable lifecycle is not.
- [ ] Redacted audit logs, request IDs, secrets management and key rotation.
- [ ] Legal retention, deletion and Pakistani privacy review approved by owner/counsel.

## Storefront and operations

- [x] Local synthetic customer journey and server checkout behaviors verified (Playwright 6/6).
- [x] Live checkout fails closed when `NODE_ENV=production`.
- [ ] Real product media, approved prices, final copy and public contact details supplied.
- [ ] Shipping/courier/tax/returns/cancellation/status policies approved.
- [ ] Monitoring, alerts, backups, restore drill, HA/failover and incident runbooks tested.
- [ ] RPO/RTO approved and measured.
- [ ] Staging deploy and rollback verified on the chosen compatible host.
- [ ] Production domain, HTTPS, DNS and redirects configured.

## Testing and release gate

- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm test` passes: 12 passed, 1 skipped PostgreSQL file.
- [x] `npm run build` passes: 49 routes.
- [x] `prisma validate` and `prisma generate` pass.
- [ ] Real PostgreSQL integration tests (blocked by unavailable Docker/PostgreSQL).
- [x] Browser E2E tests: 6/6 desktop/mobile journey and tracking cases.
- [x] Accessibility homepage axe tests: 2/2 desktop/mobile. Full visual regression remains open.
- [x] Security scanning after dependency remediation: npm audit high threshold 0 vulnerabilities.
- [ ] Staging load/resilience and backup-restore tests.

## Launch decision

**Current assessment: NOT READY FOR PRODUCTION.** The project is suitable for local synthetic development and browser demonstration only. The exact blockers and reproduction evidence are recorded in [`FINAL_AUDIT_REPORT.md`](./FINAL_AUDIT_REPORT.md).

## 2026-10-27 current assessment override

Several older unchecked descriptions above are now stale. The codebase now has
Supabase customer Auth integration, durable PostgreSQL admin sessions/TOTP/RBAC,
transactional PostgreSQL checkout/inventory/idempotency, verified constraints,
encrypted account addresses, approved-only R2 media lifecycle, typed outbox
notifications, admin catalog/inventory/order/customer/analytics services and
isolated PostgreSQL/browser evidence. The authoritative detailed status is
`docs/OVERNIGHT_PROGRESS.md`; launch gates are in
`docs/GO_LIVE_CHECKLIST.md`.

The release decision remains **NOT READY FOR PRODUCTION**. Hosted migrations,
custom SMTP, Google OAuth, production admin recovery/key custody, distributed
rate limits, real R2 verification, backup restore, monitoring, approved product
content and all shipping/tax/COD/cancellation/returns/legal policies remain
open. Production checkout is still disabled.
