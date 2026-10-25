# FLC Decor Remediation Baseline

Updated: 2026-10-26 (Asia/Karachi)

This is the initial traceability baseline for the remediation prompt. Statuses reflect code and command evidence, not intent. `Partial` means only a subset of the requirement is implemented; `Blocked` means the current fail-closed behavior or missing external dependency prevents the required live capability.

## Repository and evidence baseline

- Existing application: Next.js 16.4.3 App Router + TypeScript in `app/`, `components/`, and `lib/`.
- Current runtime checkout: `lib/demo-store.ts` process-global maps; PostgreSQL is schema/migration only.
- Existing verification: lint, strict typecheck, Vitest unit tests, production build, Prisma validate/generate and HTTP smoke checks.
- Missing verification: running PostgreSQL integration, performance/load, restore and failover tests; browser E2E and homepage accessibility are now verified locally.
- Production checkout guard: `lib/demo-store.ts` rejects writes in `NODE_ENV=production` and `app/api/checkout/orders/route.ts` returns 503.

## Functional traceability

| ID | Status | Actual implementation/evidence | Remediation target |
|---|---|---|---|
| FR-001 | Partial | `app/page.tsx`, `lib/catalog.ts`; synthetic CSS art and unconfigured contact | Owner media/contact and final content |
| FR-002 | Partial | `prisma/schema.prisma`, public category pages | DB depth validation and admin CRUD |
| FR-003 | Partial | `app/products/[slug]`, variant selection | Media gallery/zoom and persisted catalog |
| FR-004 | Partial | `app/shop/shop-client.tsx`, `app/api/catalog` | URL state, server querying, arbitrary range, pagination |
| FR-005 | Partial | client sort controls | Server stable deterministic pagination |
| FR-006 | Partial | `lib/domain.ts`, `lib/demo-store.ts` | DB-authoritative price and stock |
| FR-007 | Partial | Prisma media/order models plus validated/re-encoded quarantine endpoint | Media reference lifecycle and durable storage |
| FR-008 | Partial | localStorage guest cart | Authenticated/server cart and safe merge |
| FR-009 | Partial | checkout form and demo quote | Configured authoritative shipping/tax |
| FR-010 | Partial | demo COD path | Live COD launch gate |
| FR-011 | Partial | in-process lock/tests | PostgreSQL transaction and ledger |
| FR-012 | Partial | process-local scoped key/replay/conflict | Durable idempotency and unknown-commit recovery |
| FR-013 | Blocked | production checkout fails closed | Durable DB and failover evidence |
| FR-014 | Partial | no expiry release in demo | Owner policy and persistent lifecycle |
| FR-015 | Partial | demo snapshots | Durable immutable order records |
| FR-016 | Partial | local demo scrypt auth, secure revocable sessions and generic reset response | Durable identity/provider and email delivery |
| FR-017 | Partial | local TOTP/recovery-code implementation and replay guard | Durable factor storage and provider integration |
| FR-018 | Partial | admin login/MFA boundary and server `requireAdmin` guard | Durable admin identity/RBAC/audit and CRUD |
| FR-019 | Blocked | order lookup returns 503 without capability | Email challenge and scoped capability |
| FR-020 | Not implemented | admin page is read-only preview | Authenticated CRUD and audited operations |
| FR-021 | Not implemented | no transition API | Owner transition map and state machine |
| FR-022 | Not implemented | no rate/fraud controls | Durable throttling and review signals |
| FR-023 | Partial | `/api/admin/media/validate`, magic sniffing, sharp decode/re-encode, limits and quarantine key | Authorized durable object storage and media references |
| FR-024 | Not implemented | schema fields only | Reference-safe 30-day cleanup |
| FR-025 | Blocked/configurable | `WHATSAPP_CONTACT` placeholder | Owner-approved number |
| FR-026 | Partial | theme/reduced motion/semantic forms | OS initialization and a11y evidence |
| FR-027 | Partial | CSS showcase only | Optional lazy 3D/tilt with fallback |

## Bug traceability

| ID | Status | Evidence |
|---|---|---|
| BUG-001 | Open | `/admin` renders without a session; synthetic only |
| BUG-002 | Open | `lib/demo-store.ts` loses state on restart |
| BUG-003 | Fail-closed/incomplete | `/api/orders/[number]` returns 503 without capability |
| BUG-004 | Resolved locally | account forms call real local auth/reset route handlers |
| BUG-005 | Partial | media validation endpoint exists; durable media API/UI/storage remain open |
| BUG-006 | Open | no inventory/order mutation APIs |
| BUG-007 | Resolved locally | `npm audit --audit-level=high` reports 0 vulnerabilities after controlled upgrades |
| BUG-008 | Resolved locally | theme bootstrap reads localStorage/OS preference before hydration |
| BUG-009 | Open | no product gallery/zoom |
| BUG-010 | Partial | filters are client-only; no URL sync/pagination/drawer |
| BUG-011 | Blocked | Docker daemon unavailable in audit environment |
| BUG-012 | Partial | Playwright customer/accessibility harness passes locally; performance/load evidence remains open |

## Security traceability

| ID | Status | Evidence |
|---|---|---|
| SEC-001 | Partial | local scrypt sessions, admin TOTP boundary and customer MFA code; no durable provider/email |
| SEC-002 | Open | in-memory checkout adapter |
| SEC-003 | Fail-closed/incomplete | no guest email verification capability |
| SEC-004 | Partial | `requireAdmin`/admin MFA boundary exists; production admin is fail-closed and CRUD/audit remain open |
| SEC-005 | Resolved locally | npm audit high threshold passes with 0 vulnerabilities; ongoing supply-chain monitoring required |
| SEC-006 | Partial | actual image sniff/decode/re-encode/quarantine validation exists; storage/reference lifecycle remains open |
| SEC-007 | Partial | request IDs, origin checks and in-process rate limits exist; distributed limits/metrics/audit remain open |

## Production blockers

Approved policies (shipping/courier/tax/returns/cancellation/status/retention/contact), real PostgreSQL durability, identity/MFA, guest email, secure media, rate limiting/observability, dependency remediation, provider secrets, backups/restore/failover, browser/accessibility/performance/resilience evidence and owner go/no-go approval are not established. Live checkout remains disabled.
