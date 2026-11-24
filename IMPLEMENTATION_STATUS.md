# Implementation Status — Fahad Laser / FLC Decor

Updated: 2026-10-27 (Asia/Karachi)

## Cloudflare R2 media integration — 2026-10-27

- Implemented a fail-closed S3-compatible R2 adapter for upload, metadata lookup, approved reads, exact-key deletion, existence verification and staging-to-public promotion. Server-only configuration uses region `auto` and the required `R2_*` environment variables.
- Added private staged upload, Sharp main/thumbnail processing, approval, audit, product/variant assignment, ordering, main-image replacement, shared-safe detach, purge and reconciliation APIs. Existing Prisma media models were reused; no migration or duplicate table was added.
- Added an MFA-guarded responsive admin media manager with drag/drop, multiple uploads, progress, previews, approval, assignment, ordering, replacement, detach, deletion, retry and cleanup states.
- Storefront catalog output remains approved-only and now uses generated thumbnails for cards and main objects for galleries. If storage is disabled, media references are omitted and existing CSS fallback artwork is used.
- Real R2 credentials were not available, so no external bucket was contacted. PostgreSQL tests use only `127.0.0.1:5433/flcdecor_test` and an in-memory storage double. Setup and guarded disposable-bucket verification are documented in `docs/R2_MEDIA_RUNBOOK.md`.
- Verification: typecheck and lint passed; unit suite 22/22; PostgreSQL integration suite 17/17; production build passed with 63 routes; existing Playwright regression suite passed 11 with seven intentional environment/project skips. `npm install` reported zero dependency vulnerabilities. Real R2 verification remains unexecuted because all five required R2 settings are absent from `.env.local`.

## Current state

Foundation, storefront, checkout demo, admin preview, implementation documentation, local Git history and baseline web hardening are present in a local-only, synthetic-data demo. A final audit on 2026-10-26 verified the runnable journey and recorded substantial production/demo gaps below.

## Milestones

| Phase | Status | Notes |
|---|---|---|
| Phase 0 — Foundation | Complete for local demo | Next.js TypeScript app, environment example, Prisma/PostgreSQL schema, migration, seed, Docker Compose, health/readiness routes and domain fixtures. |
| Phase 1 — Storefront | Complete for local demo | Responsive home, shop/search filters, product detail, theme, cart, CSS sample artwork, reduced-motion rules and policy pages. |
| Phase 2 — Catalog/admin/media | Partial demo surface | Admin preview, catalog API, schema for categories/variants/media/audit and category/filter UI exist. Product CRUD, inventory controls, order management and upload processing/auth are not implemented. |
| Phase 3 — Cart/checkout | Complete for local demo | Server quote, demo COD order, stock-safe mutation, idempotency replay/conflict and concurrent final-unit tests. Live policy remains disabled. |
| Phase 4 — Accounts/orders | Partial demo boundary | Account/tracking/admin surfaces are present; customer/admin auth, sessions, MFA, email verification and real order history are not implemented. Guest lookup now fails closed. |
| Phase 5 — Hardening/demo | Complete for local demo | Lint, typecheck, unit tests, production build, HTTP smoke tests, security headers, SEO no-index routes, error/loading states and handoff docs completed. |
| Phase 6 — Production readiness | Blocked by owner/infrastructure decisions | Courier, shipping, tax, returns, legal retention, secrets, HA DB, notifications and operational policies are not supplied. |

## Verification log

Checks: `npm run lint` ✅; `npm run typecheck` ✅; `npm test` ✅ (6 tests); `npm run build` ✅ clean (Next 15.5.28, 37 routes); `prisma validate` ✅ with `DATABASE_URL` supplied; `prisma generate` ✅; HTTP smoke ✅ for journey pages/order/success/replay/conflict and fail-closed guest lookup; production-mode checkout ✅ returns 503. Docker migration execution was not available because the Docker daemon was not running. `npm audit` reports 8 advisories (2 moderate, 4 high, 2 critical); review and remediate before production. A passing local build does not mean production readiness.

## Known boundaries

- Catalog fixtures and product artwork are synthetic samples.
- Demo checkout is local-only and must not be used for real customer orders.
- Shipping, tax, courier, returns, cancellation, legal retention, status transitions and contact details remain `NOT_CONFIGURED`.
- Strong acknowledged-order durability, HA/failover, email delivery, media processing and production MFA require the documented infrastructure adapters and owner configuration.

## Remediation phase updates

| Date/phase | Completed | Verification | Remaining |
|---|---|---|---|
| 2026-10-26 / Phase 0 | Baseline ledger/register/runbooks; Next 16.4.3; Vitest 5.0.5; Prisma 7.10.1; local CI workflow; reproducible scripts | lint, typecheck, 6 unit tests, Prisma validation/generation, build and npm audit passed | GitHub workflow not run; Docker unavailable |
| 2026-10-26 / Phase 1 | `lib/prisma.ts`, `lib/database-store.ts`, route branches, `0002_checkout_totals`, database guard tests | lint/typecheck, 8 unit tests, Prisma validation and build passed | No live PostgreSQL migration/concurrency/restart test; checkout totals are synthetic-zero only |

## Final remediation audit update — 2026-10-26

| Phase | Result | Evidence | Remaining |
|---|---|---|---|
| Phase 2 — Auth/security boundary | PARTIAL, locally verified | `npm test` auth coverage; BrowserAct registration/session smoke; scrypt sessions, origin checks, rate limits, TOTP/recovery-code helpers, admin MFA boundary | In-memory demo identity only; no durable auth provider, email verification/reset delivery, shared sessions or production admin CRUD |
| Phase 3 — Media/admin boundary | PARTIAL, locally verified | Media unit tests; authorized validation route; actual MIME sniffing, sharp re-encode, limits and quarantine key | No durable object storage, media reference cleanup, product/inventory/order CRUD or audit ledger runtime |
| Phase 5 — Storefront/accessibility | VERIFIED for tested local scope | Playwright 6/6; axe 2/2 desktop/mobile; URL-synced filters, OS theme bootstrap, reduced-motion CSS, responsive journey | Final owner media/copy, gallery/zoom and interactive 3D are not complete |
| Phase 7 — Release gates | PARTIAL | lint, typecheck, 12 tests, build 49 routes, npm audit 0, production fail-closed smoke | PostgreSQL integration, load/performance, backup/restore and hosted CI remain unverified |

### Current verification summary

`npm run lint` PASS; `npm run typecheck` PASS; `npm test` PASS (12 passed, 1 skipped); `npm run test:integration` SKIPPED (PostgreSQL unavailable); `npm run security:audit` PASS (0 vulnerabilities); `npm run db:validate` PASS; `npm run build` PASS (49 routes); `npm run test:e2e` PASS (6/6); homepage axe PASS (2/2). Production smoke confirmed checkout returns 503 `CHECKOUT_NOT_CONFIGURED` and `/admin` is redirected to the not-configured login boundary.

Production checkout remains disabled. This repository is locally runnable for synthetic development, not approved for live orders.

## Production database foundation update — 2026-10-26

| DB phase | Status | Implementation/evidence | Remaining |
|---|---|---|---|
| DB-0 — Existing schema audit and plan | VERIFIED (repository inspection/docs) | `docs/database/EXISTING_SCHEMA_AUDIT.md`, ERD, data dictionary, decisions and migration plan | Owner resolution of payment-scope conflict before activation |
| DB-1 — PostgreSQL foundation | IN PROGRESS | Additive `0004_production_database_foundation`, direct-URL placeholder, pool configuration, local-only seed guard | Prisma validate/generate pass; migration not applied. Docker daemon unavailable; port-5432 listener rejected the documented local demo password. No existing database was modified. |
| DB-2 — Identity/catalog/inventory | IN PROGRESS | External-auth profile/role schema; two-level category cycle/depth trigger; location balances, reservations, movement ledger; backfill preserves `availableQty` | PostgreSQL constraint/concurrency/adjustment/reconciliation tests not run; first warehouse is not approved |
| DB-3 — Orders/tracking | IN PROGRESS | Split fulfillment/payment state, legacy status preservation, encrypted address snapshot, transactional ready-stock reservation/outbox/COD-pending intent code and DB test cases | DB integration/restart/two-instance/verified guest capability tests not executed |
| DB-4 — Payments/notifications | PARTIAL schema only | Four method codes, intents/attempts/transactions/refund/reconciliation, webhook dedupe, notification/outbox/delivery tables | No merchant provider or delivery worker; COD collection remains unconfigured |
| DB-5 — RBAC/audit/analytics | PARTIAL schema only | Role/permission joins, audit request IDs and read-only placed-value view | No production identity binding, runtime admin authorization, metric reconciliation or grants tested |
| DB-6 — Operations | BLOCKED | Migration and restore runbooks prepared | Unknown local PostgreSQL ownership/credentials, provider, backup/restore target, RPO/RTO and staging unavailable |

Current database verification: `npm run db:validate` PASS (Prisma schema valid and Prisma Client generated); `npm run typecheck` PASS; `npm run lint` PASS; `npm test` PASS (12 passed, one PostgreSQL integration file skipped). The documented local connection probe failed with PostgreSQL `28P01` authentication error. No SQL migration, seed, or write was run against that listener. Production checkout remains disabled.

## PostgreSQL concurrency remediation update - 2026-10-26

- **Root cause:** Under Prisma 7 with `@prisma/adapter-pg`, the serializable raw inventory update surfaced PostgreSQL SQLSTATE `40001` as Prisma `P2010` with `meta.driverAdapterError.cause.originalCode = "40001"`. The existing catch block recognized `P2034` but not this adapter-wrapped raw-query form, so the losing checkout escaped as an exception.
- **Implemented:** Added a bounded four-attempt retry around the complete database transaction for `P2034`, `40001`, and `40P01`, with short randomized exponential backoff. Each retry re-runs idempotency, active catalog, balance and conditional reservation checks. Isolation remains `Serializable`; no constraint or stock predicate was weakened. External payment gateways and notifications remain outside the transaction; the current path only writes durable payment/outbox/notification records transactionally.
- **Controlled failure:** Once the winning transaction commits, a retry sees `onHand - reserved < quantity` and returns the existing `stock` domain result. Retry exhaustion is also mapped to a controlled domain/service result rather than a raw Prisma exception.
- **Test coverage:** Added classifier unit cases for `P2034`, adapter-wrapped `40001`, `40P01`, and unrelated `23505`; strengthened the last-unit test to assert exactly one order and one each of reservation, movement, COD intent, notification, outbox, audit, status event, address snapshot and idempotency record; added an eight-request concurrent-load test for nonnegative/never-over-reserved stock and no orphan side effects. Fixtures now use run-scoped IDs/emails so repeated runs are isolated without fixed-key collisions.
- **Verification:** `npm run db:deploy` reported no pending migrations on the isolated `127.0.0.1:5433/flcdecor_test` database. `npm run typecheck` PASS; `npm test` PASS (13 passed, 1 skipped); `npm run test:integration` PASS (6/6). The integration suite was then repeated five times against the same isolated test database: 30/30 tests passed. Production checkout remains disabled.

## Security and integration readiness update - 2026-10-26

- Added server-side admin page authorization, explicit demo permission allowlisting, session-bound customer ownership helpers and a private account-orders boundary. Production durable identity/RBAC remains fail-closed.
- Added database-backed guest tracking challenges and scoped capabilities with hashed codes/tokens, expiry, five-attempt limit, replay protection and generic enumeration-resistant responses. The configured mock delivery adapter captures codes only in memory for tests; it does not send messages.
- Added test-only provider-neutral payment webhook verification with exact amount/currency checks, allowed payment transitions, unique event dedupe, transaction/audit/outbox writes and no browser-trusted payment success.
- Added an outbox worker with PostgreSQL `FOR UPDATE SKIP LOCKED`, committed processing leases, delivery outside the claim transaction, bounded exponential retry and `DEAD` recovery state.
- Added guarded disposable-local PostgreSQL backup/restore scripts and `SECURITY_INTEGRATION_AUDIT.md`. No production backup restore, real payment provider, email/SMS provider, or production checkout was enabled.
- Current expanded verification: unit suite 16 passed/1 skipped; PostgreSQL integration suite 8 passed and repeated three times (24/24); lint, typecheck, 52-route build, E2E 6/6, migration deploy with no pending migrations, read-only EXPLAIN checks and redacted secret scan passed. Backup restore and real provider integrations remain unexecuted by design.

## Backend implementation audit and phased build — 2026-10-26

- **Audit:** `BACKEND_IMPLEMENTATION_AUDIT.md` classifies all 18 requested modules by implemented behavior, API methods, Prisma use, auth, UI integration, tests and blockers. Schema-only payment/shipping/address/setting tables are explicitly distinguished from working services.
- **Phase 1, catalog/admin:** Added validated MFA guarded category, product, variant, price, approved-media-reference and database catalog routes/services; wired opt-in DB shop/product/cart reads. Product publishing requires an active priced variant; two-level categories and same-variant filters are enforced. Price updates create history; writes create audit events. Files: `lib/backend-validation.ts`, `lib/admin-api.ts`, `lib/catalog-store.ts`, `app/api/admin/categories/**`, `app/api/admin/products/**`, `app/api/admin/variants/**`, `app/api/catalog/**`, `app/shop/**`, `app/products/**`, `app/cart/**`.
- **Phase 2, inventory/orders/admin reads:** Added MFA guarded inventory adjustment/read, order read, dashboard and audit read APIs; the admin page reads DB dashboard/recent orders in DB mode. Inventory adjustment is serializable and rejects reduction below reserved stock while writing movement/audit atomically. Signed-in demo checkout links a CustomerProfile and order in the same transaction; guest checkout remains. Files: `lib/admin-store.ts`, `lib/database-store.ts`, `app/api/admin/inventory/**`, `app/api/admin/orders/**`, `app/api/admin/dashboard/route.ts`, `app/api/admin/audit/route.ts`, `app/api/checkout/orders/route.ts`, `app/admin/page.tsx`.
- **Verification:** Typecheck, lint and production build passed; unit suite passed 16/16 with two database suites skipped when the integration flag is absent; new and existing PostgreSQL integration suite passed 11/11 four consecutive times against verified `127.0.0.1:5433/flcdecor_test` (44/44). No migration, reset, production DB access or production checkout enablement occurred.
- **Open blockers:** Production identity/RBAC, shipping/tax/courier and operational status policy, saved-address privacy policy, real payments and notifications, R2 storage, full admin editor UI and large-catalog SQL/query performance. Production checkout remains disabled.

### Phase 3 — Local account storage

- Added guarded customer profile and saved-address endpoints in `app/api/account/profile/**` and `app/api/account/addresses/**`, with services `lib/account-api.ts`, `lib/account-store.ts`, and `lib/private-fields.ts`. Profile name and address details use AES-GCM ciphertext; new address rows write non-sensitive placeholders into required legacy fields.
- Added only nullable `CustomerAddress.privateDataCiphertext` in migration `0005_customer_address_private_payload`. Existing database length constraints were preserved. Validated/generated Prisma Client and applied migration 0005 **only** to verified `127.0.0.1:5433/flcdecor_test`; no production database or destructive migration was touched.
- PostgreSQL suite passed 13/13 immediately after migration, then 13/13 on each of three consecutive runs with the concurrent default-address case (39/39). Final unit tests passed 16/16 with three integration suites skipped when the flag is absent; lint, typecheck and production build passed. Production auth, key rotation, existing-row backfill and address-management UI remain open. Production checkout remains disabled.

### Catalog media reference completion

- Added approved-media attachment/detachment for both product and variant references, with MFA guarded routes and audit writes. Detaching one reference preserves the shared MediaAsset and other references; PostgreSQL integration verified this behavior. R2 upload, promotion, serving and cleanup remain unconfigured.

## Stitch frontend integration — 2026-10-26

- Audited 10 Stitch HTML screens, nine usable screenshots, two invalid image placeholders, and the design guide. Screen-to-route mapping and feature-by-feature integration status are in `FRONTEND_INTEGRATION_STATUS.md`.
- Delivered shared warm-neutral design tokens, verified business contact links, mobile navigation, cart drawer, database-backed catalog/product cards, approved-media gallery and variant synchronization, URL-backed filters, mobile filter sheet, account/profile/address UI, guarded admin workbench, demo COD checkout, signed private confirmation, and guest tracking UI.
- Production checkout remains disabled. Real identity/MFA, delivery, payment, courier/tax, R2 storage and legal policy dependencies remain blocked or partial as recorded in the integration matrix.
- Verification this phase: lint and typecheck passed; unit suite 18/18; isolated PostgreSQL integration suite 13/13; isolated PostgreSQL browser tests 2/2 (reservation and encrypted account/address); synthetic browser suite 11 passed with seven intentional project/environment skips; production build passed with 61 routes. The PostgreSQL test target was checked as `127.0.0.1:5433/flcdecor_test` before each run. No production data or production checkout was touched.
- Final checks after the last cart change: lint and typecheck passed; production build passed (61 routes); guarded PostgreSQL browser tests 2/2 passed; desktop/mobile synthetic browser suite 11 passed with seven intentional skips. The guarded PostgreSQL integration suite was repeated three times after final UI changes (39/39), including concurrent stock tests. No production checkout was enabled.

## Durable local administrator onboarding — 2026-10-27

- **Root cause:** Admin login depended on `DEMO_ADMIN_*` environment credentials and process-local users/sessions. There was no initial-admin creation path, no PostgreSQL session binding, and no first-login MFA enrollment UI, so the database RBAC tables did not produce a usable administrator.
- **Implemented:** Added a loopback-only, explicit-confirmation bootstrap with an advisory transaction lock, permanent database marker, scrypt password hash, limited ADMIN permissions and audit event. Added PostgreSQL sessions with MFA verification timestamps, encrypted TOTP secrets, replay prevention, hashed one-time recovery codes, session revocation auditing, and database permission checks for every admin API and page. Public customer registration remains customer-only.
- **UI and operations:** Added `/admin/login`, `/admin/mfa/enroll`, `/admin/mfa`, persistent logout, protected dashboard access, and a secure interactive `npm run admin:bootstrap:local` command. The script keeps initial credentials out of source and shell output and stores only the generated local MFA encryption key in gitignored `.env.local`.
- **Database:** Migration `0006_persistent_admin_auth` was validated, generated and applied only to verified `127.0.0.1:5433/flcdecor_test`. No production database or destructive migration was touched.
- **Verification at implementation:** Focused PostgreSQL admin-auth integration passed 3/3, including bootstrap refusal, login, enrollment, permissions, dashboard, Media Manager and logout invalidation. Desktop Playwright onboarding passed 1/1. Full lint, typecheck, unit, integration and build results are recorded in the final handoff after this milestone.
- **Remaining:** Production identity/recovery policy, additional-admin lifecycle, encryption-key rotation, distributed rate limiting, production database controls and R2 credentials remain configuration/architecture work. Production checkout remains disabled.
- **Final verification:** Prisma validate/generate passed and migration 0006 applied only to `flcdecor_test`; ESLint passed; TypeScript passed; unit suite passed 22/22; complete PostgreSQL integration suite passed 20/20; focused admin integration passed 3/3; focused desktop admin Playwright passed 1/1; complete synthetic browser suite passed 11 with 9 intentional environment/project skips; production build passed with 65 generated pages/routes. The interactive PowerShell bootstrap script also passed a non-executing syntax parse.

## Overnight backend/auth/reliability completion - 2026-10-27

- Added Supabase Auth SSR/PKCE integration for customer email/password,
  confirmation/resend, recovery/update, Google initiation/callback, logout and
  authoritative server identity. Hosted Supabase remained read-only and still
  has no application tables or migration history.
- Added transactional typed notification processing with an escaped template
  catalog, non-networked development provider, exact outbox/notification
  correlation, durable attempts, retry/dead-letter operations and protected
  admin visibility. No external message was sent.
- Completed account order details/default addresses, minimized admin customer
  reads, honest paid-versus-placed analytics, database-native catalog filtering
  and a test-only COD lifecycle with atomic inventory effects.
- Centralized checkout pricing behind an explicit fail-closed policy. The only
  implemented total policy is the non-production `synthetic-zero` fixture;
  shipping, tax, courier, COD and legal rules remain unapproved.
- Reverified the R2 lifecycle without external writes and hardened the legacy
  validation endpoint with the shared origin/MFA/RBAC boundary and upload caps.
- Added liveness/readiness endpoints, deployment/go-live/policy documentation,
  controlled Supabase provider-outage behavior and hydration-safe admin login.
- Final local verification: TypeScript PASS; ESLint PASS; unit 38/38;
  PostgreSQL integration 23/23 plus five stress repetitions (115/115);
  default desktop/mobile Playwright 17/17; database Playwright 2/2; admin
  onboarding/MFA Playwright 1/1; Prisma validate/generate PASS; production
  build PASS with 76 routes/pages; npm audit reports zero vulnerabilities.
- Production checkout, hosted migrations, live Auth email/OAuth, R2 writes,
  external notifications/payments, deployment and production data changes all
  remain disabled/not performed.

## Supabase migration/security remediation — 2026-10-27

- Preserved migrations 0001-0009 and added forward-only migrations 0010
  (schema/index alignment) and 0011 (server-only `public` security).
- Added the pre-migration default-ACL guard, dedicated restricted
  `flc_app_server` role, RLS on all 51 tables including Prisma history, 50
  server-only policies, API-role revokes, and hardened analytics view/trigger
  function. No browser-facing data policy was added.
- Corrected Prisma 7 direct/runtime URL separation, explicit `public` schema,
  initial pool maximum 1, environment loading, and production role/endpoint/
  certificate-verification checks.
- Local verification passed: fresh 0001-0011 installation, pre-exposure probe,
  ACL/RLS assertions, zero schema drift, 23/23 PostgreSQL integration tests
  through the restricted role, 42/42 unit tests, TypeScript, and ESLint.
- Read-only hosted MCP still reports an empty `public` schema and no migration
  entries. No hosted write, role, setting, migration, deployment, or production
  checkout change occurred.
- Status: ready for a separately approved disposable staging rehearsal;
  hosted execution remains blocked pending explicit approval, secret injection,
  Data API/pre-guard confirmation, runtime-role provisioning, TLS/pooler proof,
  and recovery evidence.

## Supabase staging preflight — 2026-10-27

- Authorized staging reference is `ltcgiquvrplfrbojbbbb`; the connected MCP was
  proven to target protected original project `wggnufkrsjsmqyutjmut`. No SQL,
  catalog listing, advisor call, or write was sent to that project.
- Added a non-connecting target validator and sanitized staging template. The
  validator rejects the original project, endpoint/query overrides, wrong
  role/port/database/schema, weak TLS, unreadable/mismatched CA paths, unsafe
  password URL encoding, and a serverless pool limit other than one.
- Local checks passed: Prisma validation; fresh 0001-0011 migration/security
  harness with zero drift; unit 46/46; PostgreSQL integration 23/23; focused
  staging/config tests 8/8; TypeScript; ESLint.
- Status: BLOCKED for hosted staging migration until MCP is reconfigured to
  project-scoped read-only staging access and the staging catalog, privileges,
  version, role capabilities, extensions, advisors, network, TLS, and pooler
  behavior are verified. No hosted migration or setting change was performed.

## Overnight storefront pass — 2026-11-11

- Reproduced and fixed the desktop collection-card media collapse: stable 4:5
  media frames now contain approved images or the documented `FLC / SAMPLE`
  fallback, and the title/price layout no longer collides.
- Added failed-image fallback behavior to collection cards and product gallery.
- Corrected the default `npm test` entry point to run the unit suite; database
  integration tests remain explicit and require a configured local PostgreSQL
  target.
- Visual evidence captured at 1440x900, 1280x800, 768x1024, 390x844, and
  360x800 under `.next-e2e/qa-shop-*-fixed.png`.
- Verification: typecheck PASS; lint PASS with 0 errors and existing bundled
  helper warnings; unit 46/46; production build PASS with 76 routes/pages;
  Playwright 17 passed and 9 skipped.
- BrowserAct is installed but blocked by missing API-key authentication. No
  BrowserAct result is claimed. No production database, hosted service,
  deployment, real provider, or customer data was touched.
- `npm audit --audit-level=high` reports 8 moderate transitive `minimatch`
  advisories in the lint toolchain. The suggested forced fix would change the
  Next ESLint config across a major version; no forced dependency rewrite was
  performed.
# Implementation Status

## UI transformation pass — 2026-11-12

- Added the project-local Hallmark skill and documented the FLC Decor product/design context in `PRODUCT.md` and `DESIGN.md`.
- Evaluated Skiper UI, Vengeance UI, Animmaster, and the available plugin/MCP catalog. No unverified MCP endpoint or unlicensed runtime dependency was added; details are in `docs/UI_RESOURCE_EVALUATION.md`.
- Refined the editorial storefront with shared typography/color/focus/motion tokens, responsive overflow safeguards, stable interaction states, and shared inline icons on touched surfaces.
- Review screenshots were captured for home, shop, admin login, and cart at desktop/mobile sizes.
- Verification: typecheck passed; lint passed with existing warnings; production build passed; Playwright passed 17 tests with 9 intentional skips.
- Hallmark static audit remains non-clean because of legacy findings across the broader codebase (188 failures, 185 reflexive findings, 15 warnings in the latest run). Its optional render verifier was unavailable because `puppeteer-core` is not installed locally.
- No hosted database, production deployment, real customer data, or live order flow was used.

## Post-transformation QA — 2026-11-12

- Audited all documented Hallmark findings against the actual app and classified their overlap; no findings were suppressed.
- Fixed the only verified visual regression found by the 60-route/viewport checks: the mobile product sticky purchase bar’s two-pixel overflow at 360/390px.
- Playwright rerun: 17 passed, 9 intentional skips. Unit suite: 46/46. Typecheck: passed. Lint: passed with 101 warnings from bundled design-tool scripts. The visual audit covers 12 routes at 5 viewport widths and is available as `scripts/qa-visual-audit.mjs`.
- Admin dashboard and PostgreSQL browser journeys remain unexecuted because the required isolated loopback database is not listening on `127.0.0.1:5433`; `/admin` correctly redirects to the login page without a session.
- The previously exposed database password, untracked OAuth client-secret file, and local R2 credentials are documented as rotation/handling concerns. No external service was contacted.

## Ink bleed theme integration — 2026-11-12

- Integrated the reference interaction into the shared header/theme architecture. Light and dark state remains the existing `html[data-theme]` plus `flc-theme` localStorage contract; no database or business logic changed.
- Added `components/ink-theme-transition.tsx`: click-origin capture, WebGL2 organic noise reveal, context-loss fallback, CSS captured-image fallback, reduced-motion handling, and WebGL/listener/frame cleanup.
- Added `html2canvas@1.4.1` as the only runtime dependency. The reference repo’s GSAP animation stack was not added because this adaptation uses a native requestAnimationFrame lifecycle and keeps the bundle smaller.
- Added `tests/e2e/theme-transition.spec.ts` and `scripts/qa-theme-audit.mjs`. Focused theme Playwright coverage is 8/8 across desktop/mobile, including system preference and manual override. The screenshot matrix completed 40 captures: home, shop, product, cart, and checkout in light/dark at 1440, 768, 390, and 360px.
- Final verification: unit 46/46; typecheck PASS; production build PASS (76 routes); full Playwright 25 passed, 9 skipped; accessibility axe homepage PASS on desktop/mobile. Lint remains 0 errors with the existing 101 bundled-tool warnings.
- Visual limitation recorded: `html2canvas` requires `foreignObjectRendering` in this app because the stylesheet contains unsupported color-mix parsing in its normal parser. The browser-native capture path passed; if that capture fails, the WebGL path uses a safe destination-color texture and the no-WebGL path uses the same safe CSS fallback. This is a graceful fallback, not a claim of perfect snapshot parity on every browser.

### Ink bleed motion refinement — 2026-11-12

- Slowed the spread from 520ms to 1180ms, added three time-evolving noise fronts, and introduced a lower-left directional current for a more fluid layered feel.
- Anchored the visual origin at the upper-right corner while retaining the actual click coordinate as diagnostic data. Corrected WebGL texture orientation after inspecting active-transition screenshots.
- Focused Playwright motion suite: 8/8 passed across desktop/mobile, including the upper-right anchor, active transition screenshots, fallback, reduced motion, system preference, and persistence.

## Ink bleed transition correctness fix — 2026-11-13

- **Root cause:** The previous lifecycle committed the destination theme before the reveal began. The overlay therefore contained the outgoing/current theme while the live page had already changed, allowing a visible destination flash and an apparent reversal. The visual origin had also been forced to a fixed upper-right point rather than using the actual pointer coordinates.
- **Fix:** `InkThemeTransition` now keeps the current document theme visible, captures a clone with the destination `data-theme`, applies destination CSS variables and background explicitly, hides the live transition canvas in the clone, and reveals the destination bitmap through the existing layered WebGL2 mask. The CSS captured-image fallback follows the same model. `data-theme` and `flc-theme` are committed only after the reveal reaches completion; generation tokens, active-state guards, context-loss handling, resize cancellation, reduced motion, and unmount cleanup prevent stale callbacks and duplicate toggles.
- **Origin:** `ThemeToggle` passes `clientX`/`clientY` for pointer activation, with the control center retained only as a keyboard/programmatic fallback. The reveal radius uses the farthest viewport corner and covers all tested origins.
- **Evidence:** Focused Playwright `tests/e2e/theme-transition.spec.ts` passed 14/14 across desktop and mobile. Coverage includes dark→light, light→dark, start/middle/end screenshots, all four corners plus center, old-theme retention during reveal, persistence, rapid repeated clicks, forced CSS fallback, reduced motion, and system preference. Full Playwright passed 31 tests with 9 existing environment skips. Typecheck passed; production build passed (76 routes); lint passed with 0 errors and the existing 101 bundled-tool warnings.
- **Visual review:** Desktop start/middle/end captures for both directions were inspected from `test-results/`; the starting theme is intact, the destination is revealed in the active frame, and the settled frame remains entirely in the committed destination theme. No production database, hosted service, deployment, or unrelated business logic was touched.
