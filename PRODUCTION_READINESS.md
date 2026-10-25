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
- [x] Prisma schema validates and client generation passes with `DATABASE_URL` supplied.
- [x] Forward migration declares the 18 schema tables and explicit foreign-key/delete rules.
- [x] Development-only seed script exists.
- [ ] Runtime uses PostgreSQL transactions instead of the in-memory demo adapter.
- [ ] Durable idempotency, inventory ledger, outbox and unknown-commit recovery are implemented.
- [ ] Category-depth enforcement and nullable variant-combination uniqueness are verified in PostgreSQL.
- [ ] Supabase Auth integration, RLS/backend-only boundaries and admin role mapping are implemented.
- [ ] R2 upload authorization, processing and cleanup are implemented.

## Security and privacy

- [ ] Customer registration/login/logout/reset and secure revocable sessions.
- [ ] Mandatory administrator MFA and optional customer MFA.
- [ ] CSRF, rate limits, secure cookies and authorization middleware.
- [ ] Verified guest email challenge and scoped order capability.
- [ ] Secure media validation, quarantine, EXIF stripping and reference-safe deletion.
- [ ] Redacted audit logs, request IDs, secrets management and key rotation.
- [ ] Legal retention, deletion and Pakistani privacy review approved by owner/counsel.

## Storefront and operations

- [x] Local synthetic customer journey and server checkout behaviors verified.
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
- [x] `npm test` passes: 6 tests.
- [x] `npm run build` passes: 35 routes.
- [x] `prisma validate` and `prisma generate` pass.
- [ ] Real PostgreSQL integration tests.
- [ ] Browser E2E tests.
- [ ] Accessibility/visual regression tests.
- [ ] Security scanning after dependency remediation.
- [ ] Staging load/resilience and backup-restore tests.

## Launch decision

**Current assessment: NOT READY FOR PRODUCTION.** The project is suitable for local synthetic development only. The exact blockers and reproduction evidence are recorded in [`FINAL_AUDIT_REPORT.md`](./FINAL_AUDIT_REPORT.md).
