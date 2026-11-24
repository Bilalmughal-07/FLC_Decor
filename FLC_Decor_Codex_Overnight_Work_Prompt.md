# FLC Decor — Overnight Autonomous Engineering Work Plan

**Project:** `D:\FLCdecor`  
**Date:** 2026-10-27  
**Role:** Senior full-stack engineer, security engineer, QA lead, and release engineer.

## Mission

Make the maximum **safe, verifiable** progress on FLC Decor while I am away. **Execute implementation, not just planning.** Work through the prioritized backlog below, inspect the actual repository before making assumptions, and keep going from one independently executable task to the next. Use reasonable engineering judgment for routine decisions; document assumptions. Do not claim to run indefinitely or in the background: work for as long as the current Codex session and its permissions allow. If interrupted, preserve a clear continuation plan.

### Current project context — verify against the repository

- Next.js + TypeScript, Prisma 7, PostgreSQL 16, VS Code on Windows; existing project directory above.
- Google Stitch storefront designs integrated into the app; premium minimal FLC Decor aesthetic, responsive layouts.
- Existing product/category/variant, inventory, COD checkout demo, customer profile/address, admin workbench, audit, and media APIs. Production checkout remains disabled.
- Cloudflare R2 media adapter and admin Media Manager implemented with private staging, approval, public approved-only delivery, reconciliation and tests. Real R2 credentials may or may not be configured; do not assume live connectivity.
- Supabase project ref `wggnufkrsjsmqyutjmut`; Supabase MCP authenticated, **read-only**. Last inspection found Supabase-managed schemas and **empty `public` schema**. No FLC Decor application migrations have been applied to hosted Supabase.
- User has chosen Supabase PostgreSQL + Supabase Auth for email/password with verified email and Google OAuth. **Do not implement phone/SMS OTP.** Checkout can collect a phone number without OTP.
- Business priorities: initial Cash on Delivery; custom-order requests through WhatsApp, not on-site custom-order engine; admin-managed two-level categories; product primary category plus optional additional categories; variant-specific stock/SKU/prices/images; featured-first then newest default sorting.
- Existing tests reportedly pass locally, but rerun and verify. Preserve R2 and all functioning features.

## Non-negotiable safety rules

1. **Do not modify the hosted Supabase database** (including migrations, inserts, grants, schema changes, SQL execution with write effects, or auth user creation) without my explicit approval. The MCP connection is read-only. Prepare and test migrations locally and produce exact approval-ready commands; do not run them against Supabase.
2. **Do not modify production/live infrastructure, Cloudflare R2 buckets, Google OAuth settings, DNS, hosting deployments, or external service configurations** without explicit approval. Do not delete, purge, or upload real customer/business data. Use isolated local mocks or disposable test environments only when verified safe and authorized.
3. Do not enable production checkout, accept real payments, activate live order placement, or claim a store is ready for public commerce.
4. Never expose secrets in logs, code, chat, commits, screenshots, or reports. Never hardcode credentials or default admin passwords. Never commit `.env*` with secrets.
5. Do not weaken admin session, MFA, RBAC, CSRF/origin, audit, authorization, or rate-limit controls. Public registration must always create a customer, **never an admin**.
6. Do not run destructive commands (`prisma migrate reset`, `db push --force-reset`, destructive SQL, broad bucket cleanup, force pushes, `git clean -fdx`, etc.). Preserve uncommitted user changes; inspect `git status` first. Avoid rewriting unrelated files.
7. For database tests, use **only a verified isolated local test database**, historically `127.0.0.1:5433/flcdecor_test`. Check host, port, database name, and environment before any write. Never allow test commands to point to hosted Supabase.
8. If an external provider, email, or OAuth flow cannot be tested live, implement and test with mocks and clearly label it **not live-verified**. Do not fabricate successful results.
9. If a task requires my approval, credentials, paid services, or external setup, write down the blocker, **skip that action**, and continue with independent safe work. Do not repeatedly stop to ask routine questions.
10. Prioritize a secure, maintainable implementation over speed or decorative UI. Keep scope realistic for a free-tier deployment and document free-tier limitations.

## Operating loop

1. Inspect `git status`, README, package scripts, Prisma schema/migrations/config, auth/session/RBAC, API routes, existing tests, environment variable **names only**, and docs. Write `docs/OVERNIGHT_PROGRESS.md` with timestamp, baseline status, priorities, completed work, commands/results, blockers, and next actions. Do not copy secrets.
2. Work in small, coherent increments. Before each risky change, inspect dependencies and expected impact. Prefer additive, backward-compatible edits. Avoid unrelated refactors.
3. After each substantial phase, run the narrowest relevant tests; fix regressions. Record what actually passed/failed/skipped.
4. Update `docs/OVERNIGHT_PROGRESS.md` after each phase, so another Codex session can resume if context or time runs out. Keep a checklist of remaining tasks.
5. Continue to the next safe phase automatically. When reaching a blocked item, document it and move on rather than waiting.
6. At the end, produce a concise final handoff with implemented features, files changed, commands/tests, exact manual steps and approvals required, and highest-priority unfinished work. Do not claim deployment or live verification without evidence.

## Phase A — Repository and database architecture audit (highest priority)

- Establish actual baseline: architecture, routes, auth implementation, demo vs real dependencies, Prisma 7 config, migrations, data access, security boundaries, and current test health.
- Check whether `DATABASE_URL`/`DIRECT_URL` are present **without printing values**; confirm how Prisma's runtime adapter and migration CLI use them. Ensure no tests can accidentally use hosted Supabase.
- Inspect Supabase metadata **read-only** through MCP if useful. Verify `public` is empty; do not assume any application tables exist there.
- Compare current migrations to the isolated test database and Supabase-managed schemas. Check PostgreSQL extensions, permissions, schemas, indexes, enums, foreign keys, transaction behavior, migration ordering, and Prisma 7 pooler/direct connection compatibility.
- Prepare `docs/SUPABASE_MIGRATION_PLAN.md` explaining prerequisites, safe commands, migration dry-run/testing evidence, rollback/restore considerations, and explicit **approval gate** before hosted execution.
- Validate the migration sequence only against an isolated local disposable DB; never hosted Supabase. No destructive resets of existing test DB unless clearly disposable, verified, and allowed by existing project conventions.

## Phase B — Real Supabase Auth implementation

Implement fully integrated authentication without creating a parallel or insecure identity system:

- Use current supported `@supabase/supabase-js` and `@supabase/ssr` conventions appropriate to this Next.js version; verify APIs from installed packages/docs.
- Email/password registration with name, password confirmation, accessible validation, clear pending verification state, email verification callback, resend confirmation with cooldown, and generic enumeration-resistant messaging.
- Email/password login, logout, forgot password, reset password, session refresh, expired session behavior, redirect allowlisting, and safe handling of authentication errors.
- Google OAuth sign-in through Supabase, callback with PKCE/code exchange as appropriate, safe `next` redirects, cancel/error states, and returning-user behavior.
- SSR cookie-based sessions and **server-side identity validation** for protected operations; never trust browser-only role claims or `getSession()` alone for authorization. Respect existing auth, MFA, RBAC, and audit protections.
- Idempotently provision/link the existing application customer profile to the Supabase identity; avoid duplicate profiles, unsafe email-only account linking, and cross-account order/address access. Define how anonymous guest orders remain separate until a secure claim process is implemented.
- Public registrations always get customer access only. Existing admin MFA requirements must remain intact; if admin login depends on demo identity, document and implement a secure compatible migration path without auto-promoting users.
- **Do not add phone OTP.** Phone numbers are optional contact data only where required for delivery.
- Handle missing Supabase config gracefully with honest, nonfunctional states; do not present a fake successful login.

## Phase C — Customer-facing UI and account flows

- Reuse Stitch-based FLC Decor design system, tokens, components, typography, navigation and responsive conventions.
- Implement/refine `/login`, `/register`, `/auth/callback`, email verification/pending, forgot/reset password, customer account, profile and saved-address flows, adapting actual route names if needed.
- Add Continue with Google and consistent sign-in/sign-out states in header/mobile menu/cart/account entry points.
- Ensure keyboard accessibility, labels, screen-reader status, loading/error states, password reveal, form validation, no layout overflow on mobile, and meaningful empty states.
- Avoid introducing new decorative design systems or unnecessary dependencies.

## Phase D — Admin access readiness without security bypass

- Audit existing admin login, roles, permissions, MFA and Media Manager access. Determine exactly why an initial admin cannot log in.
- Implement or prepare a **one-time, explicitly authorized initial-admin bootstrap** compatible with the chosen identity system, only if it can be safely built without creating accounts in hosted Supabase. It must require explicit execution and secure credentials, refuse existing-admin overwrite, enforce MFA enrollment, and audit the action.
- Do **not** run the bootstrap against hosted services or create an admin on my behalf. Do not grant admin through public signup.
- Confirm Media Manager is reachable through authorized admin routes, and that approved R2 media is used correctly across product/variant galleries.

## Phase E — Existing commerce features and integration hardening

Audit and safely fix real defects (not speculative rewrites) in:

- Catalog: two-level categories, primary/additional category assignment, filters/search, sorting featured-first/newest, pagination, slug handling, SEO metadata and canonical links.
- Products and variants: SKU uniqueness, stock consistency, variant price/availability/media synchronization, main image ordering, approved-only images, image fallbacks.
- Cart and COD demo checkout: accurate totals and stock checks, guest vs authenticated flow, idempotency, retries, errors, safe order confirmation, correct address ownership. **Do not turn on production checkout** or invent shipping/tax rules.
- Admin dashboard: navigation, forms, validation, clear errors, RBAC/MFA, inventory and media flows; no mock claims of persisted data.
- WhatsApp customization links and business contact details: owner Fahad Ali, phone `0309 8663816`, email `fahadaliali712@gmail.com`, location Mughal Pura, Prince Road, Gujranwala, Pakistan. WhatsApp link `https://wa.me/923098663816`. Keep custom-order workflow on WhatsApp, not an on-site custom builder.
- Cloudflare R2: configuration validation, disabled state, staged approval safety, public approved-only delivery, cache behavior, gallery assignment, cleanup and reconciliation. Use mocks/local tests. Never expose private staging via public bucket URL; leave `R2_PUBLIC_BASE_URL` unset unless a verified public-prefix-only Worker/CDN exists.

## Phase F — Security and operational quality

- Review authentication/session security, password reset, callback redirect validation, rate limiting, CSRF/origin protection, IDOR, server-side authorization, input/file validation, SQL injection risk, XSS, security headers, error disclosure, logging and secrets handling.
- Review Prisma connection pooling and Supabase free-tier compatibility; ensure migrations use an appropriate direct/session connection and runtime uses a suitable pooler/driver configuration.
- Check for unsafe production defaults, demo credentials, hardcoded secrets, fake payments, unrestricted admin APIs, unverified image publication, and sensitive logging. Fix safely and document blockers.
- Improve structured logging, health/readiness checks, clear provider-unavailable behavior, and operational docs without activating paid services or production jobs.
- Document SMTP requirements: Supabase's default mail delivery is restricted and **public email verification needs configured SMTP**. Do not claim email is production-ready without it.

## Phase G — Testing and quality gates

- Add meaningful unit tests for auth helpers, validation, callback allowlists, profile linking, role boundaries and media behavior.
- Add isolated PostgreSQL integration tests for profile provisioning, ownership, permissions, idempotency and migrations; verify target is local before running.
- Add Playwright tests for login/register/verification/reset UI and protected route behavior using controlled mocks or test-only fixtures. Never send real SMS or email, and never claim mock tests prove provider integration.
- Run available scripts for TypeScript, ESLint, unit tests, isolated DB integration tests, browser tests, production build, and dependency audit as practical.
- Distinguish **pass**, **fail**, **skipped**, and **not run**; record the reason for every skip. Fix issues introduced by this work before proceeding.

## Phase H — Free-tier deployment readiness (prepare, do not deploy)

- Assess actual hosting compatibility of this Next.js app, Prisma 7, Sharp, R2 SDK, SSR auth, background/outbox work and API routes with free-tier candidates (e.g., Cloudflare Workers and other realistic free-tier providers). Do not assume Workers supports every Node feature or that a free plan permits commercial production traffic.
- Prepare `docs/FREE_TIER_DEPLOYMENT_PLAN.md`: recommended hosting option(s), compatibility blockers, required build/runtime changes, Supabase and R2 environment variables **by name only**, Google OAuth callback updates, email SMTP, secrets management, staging environment, monitoring, backups, rate limits and provider quotas.
- Prepare `.env.example` with placeholders and comments, no credentials.
- Prepare `docs/GO_LIVE_CHECKLIST.md` covering admin MFA, real product media, shipping/tax/COD policy, legal pages, domain, SMTP, backups, monitoring, rate limiting, real R2 verification, real OAuth tests and explicit approval to enable checkout.
- Do not deploy, change DNS, provision paid resources, or enable checkout.

## Optional safe backlog — only after higher-priority work

- Improve accessible loading/error/empty states, mobile responsiveness, SEO, image performance and Lighthouse-relevant issues grounded in actual code.
- Improve docs for product creation, media approval, variants, order management, local setup and safe developer workflows.
- Add non-destructive smoke-test scripts and diagnostics that refuse production targets.
- Review data retention and cleanup plans; document, do not activate scheduled deletion.


## Phase I — Stitch storefront completion and responsive polish (implement, not merely audit)

First inventory all existing Stitch exports and integrated Next.js pages. **Do not redo completed features**: compare this checklist to actual behavior and tests, then implement missing or broken pieces only.

- Convert remaining Stitch HTML patterns into reusable typed Next.js components using the existing design tokens and accessible semantic elements; remove duplicated markup when safe.
- Verify responsive desktop/tablet/mobile navigation, category menu, search with URL state, filters, sorting, reset controls, pagination, and keyboard/mobile filter-sheet behavior.
- Ensure dynamic home, category, search, and product detail routes query the actual backend/database interfaces, not hardcoded catalog placeholders. Handle missing/invalid slugs gracefully.
- Verify variant-dependent SKU, pricing, stock, availability, primary image, thumbnails and gallery content update together without stale state.
- Complete accessible gallery thumbnails, fullscreen zoom/lightbox, keyboard Escape and arrow controls, touch swipe, and **pinch-to-zoom where feasible** without breaking scrolling or accessibility; add fallback behavior for devices lacking gestures.
- Verify cart persistence, drawer open/close, cart quantity edits, variant-aware line items, stock checks, empty-cart states and refresh behavior. Avoid storing sensitive data in browser storage.
- Improve COD **demo** checkout form validation, address selection, order summary and private confirmation; ensure totals are clearly marked demo-only until approved shipping/tax policies exist. **Do not enable real order submission.**
- Complete account/profile, saved-address, order history and guest tracking screens with server-side ownership and accurate status messages; no fabricated orders.
- Complete missing admin management UI forms, searchable/filterable tables, pagination, confirmation dialogs, safe mutation feedback and permission-aware actions.
- Add loading, empty, error, success, retry, sold-out, unavailable-variant and degraded-provider states across the site.
- Improve reduced-motion support, focus visibility, screen-reader announcements, responsive layout, image sizing, lazy loading and performance. Measure before/after when practical.
- Add component or browser tests for each newly completed behavior, including mobile navigation and gallery interactions.

## Phase J — Catalog, inventory, admin backend and order lifecycle

Work only with isolated local test data. Do not apply changes to hosted Supabase or activate live order placement.

- Audit product/category/variant CRUD, publishing/unpublishing, slug uniqueness, archived states, validation and permissions. Implement missing safe endpoints and matching admin forms.
- Verify two-level category hierarchy, primary/secondary assignments, variant SKUs/prices, stock, featured ordering, search/filter/sort and backend-to-frontend consistency end to end.
- Audit inventory reservations, expiration/release, manual adjustment, stock reconciliation, concurrent checkout and cancellation. Implement missing idempotent transitions and compensating actions with transaction tests.
- Design and implement a **demo/test-safe** order state machine: placed, confirmed, processing, dispatched, delivered, cancelled, returned (only states justified by current schema); enforce legal transitions, permissions, audit events, stock release and idempotency.
- Complete missing admin product, inventory, customer and order APIs, including safe filters, pagination, data minimization, and audit logs. Ensure no admin privilege escalation or customer data leakage.
- Check analytics against real isolated DB aggregates: orders, revenue, inventory, cancellations, date ranges and status exclusions; remove misleading placeholder metrics.
- Add editable store settings and merchandising controls where existing models allow (featured/manual priority, category visibility, homepage merchandising). For settings requiring business decisions, create disabled draft controls and document the unresolved policy rather than inventing values.
- Add integration tests for all critical admin mutations, authorization, concurrent updates, rollback behavior and order-state transitions.

## Phase K — Cloudflare R2 production-readiness audit (no external writes)

The R2 adapter, Sharp pipeline, media manager and approved-only galleries reportedly already exist. **Verify and improve, do not rebuild.**

- Verify server-side credential gating and least-privilege bucket access; document missing production configuration without displaying secret values.
- Audit authorized multi-file upload, MIME/magic-byte validation, size/pixel/dimension caps, EXIF removal, WebP conversion, thumbnails, checksums, retries and partial failure cleanup.
- Confirm actual stored object keys and approved database references are consistent; pending/staged/orphaned media must never be publicly served.
- Verify product/variant gallery association, primary image, ordering, replacement, shared-safe detach and image fallbacks.
- Review private bucket delivery through `/api/media/[id]`, caching, cache invalidation, access-control checks and content types. Do **not** enable a public whole-bucket URL exposing `staging/`.
- Review deletion, orphan reconciliation, retry/backoff and safe exact-key cleanup; test with mocks/isolated doubles only.
- Document a future **manual** disposable-bucket smoke test and production custom-domain/Worker option restricted to `public/`. Do not create buckets, upload/delete real objects, or run live tests unattended.

## Phase L — Checkout, COD, shipping/tax and payment readiness (do not go live)

- Review pricing calculation boundaries, currency, product snapshots, discounts, shipping, tax and totals. Add a centralized, testable server-side pricing interface with **explicit unconfigured policy errors** instead of inventing shipping fees, tax rates or zero totals.
- Prepare configurable delivery areas, courier rates, COD eligibility, order confirmation, cancellation, returns and refund policy models/admin drafts, **without assuming business decisions** or publishing legal promises.
- Preserve demo checkout and production-disabled gates. Prepare production-calculated totals and stock-reservation integration in a disabled or test-only pathway until owner-approved policies and credentials exist.
- Implement/test COD lifecycle fields and admin workflows for collection, reconciliation, refunds/returns as applicable, but keep real-world settlement operations disabled.
- For future JazzCash/Easypaisa/card providers, define interfaces and webhook verification contracts (signatures, amount, currency, deduplication, replay resistance, retries, failed payments). **Do not activate providers, create merchant accounts or fake successful payment events.**
- Add regression tests for duplicate submissions, inventory contention, price tampering, retries, cancellation, order confirmation privacy and payment webhook idempotency with controlled fixtures.
- Document explicit owner approval gates before production checkout is ever enabled.

## Phase M — Notifications and communications (high-priority additional work)

**Implement the notification architecture and safe local flows now**, even if live email delivery credentials are missing. This is a priority, not merely documentation.

- Audit the existing notification and outbox tables, worker, templates, provider adapters, retry policies, and delivery status tracking. Reuse rather than duplicate.
- Implement a provider-agnostic transactional email adapter and a **development-only console/file or in-memory provider** that never sends messages externally. Keep real delivery disabled until a provider is configured and approved.
- Build branded, accessible, mobile-friendly email templates for: email verification (handled by Supabase Auth template/config), password reset (Supabase Auth), welcome email (after verified account), COD order placed/confirmed, order status changed, dispatch/tracking, cancellation, and relevant admin alerts. Distinguish Supabase-managed auth emails from application transaction emails.
- Build a typed notification event catalog and template-variable validation, with safe defaults, HTML escaping, link allowlisting, no sensitive details in subjects/logs, and idempotent event keys.
- Connect demo/test order status transitions to the existing outbox transactionally; do not send real customer emails or create live orders. Ensure events are emitted exactly once per business action under retries.
- Improve outbox worker lease/claim concurrency, retry with bounded exponential backoff, dead-letter state, recovery/replay tooling, deduplication, poison-message handling and crash safety. Do not schedule production workers or external cron jobs without approval.
- Add admin notification visibility: safe delivery-status list, failed/retry indicators, event history and a permission-protected **test-only** retry action, with recipient details redacted appropriately.
- Implement provider-unavailable behavior: queued/pending status, no false 'sent' success, meaningful operational warnings and recoverable failures.
- Prepare `.env.example` and `docs/NOTIFICATIONS_RUNBOOK.md` with approved SMTP/transactional-email provider options, sender-domain DNS verification (SPF/DKIM/DMARC), rate limits, quotas, provider credentials **by name only**, webhook handling if needed, and deployment/scheduling steps.
- **No phone OTP and no SMS-based guest-tracking challenges.** For guest tracking, prepare email-based challenges only if the existing flow requires them; otherwise retain the existing secure tracking flow. Checkout contact phone numbers remain unverified contact data.
- Add unit/integration tests for template rendering, recipient privacy, outbox enqueueing, retries, deduplication, worker races, dead letters, provider failure, and authorization. Use mocks; never send messages to real customers.

## Phase N — Durable auth, privacy and security hardening

- Verify Supabase Auth identity/session integration is complete and no demo identities can authorize production routes.
- Test customer registration, email verification, Google OAuth callback, logout, password recovery, revocation, session expiration, and server-side customer ownership; clearly separate mocked from live-verified behavior.
- Implement or prepare secure admin role assignment and MFA enrollment without creating privileged hosted accounts; ensure protected APIs enforce permissions on the server.
- Add abuse controls for auth, contact forms, checkout demo, guest tracking, media upload and notification triggers; enforce origin/CSRF protection and secure cookies where applicable.
- Audit personal-data encryption, key rotation plan, retention/deletion request handling and secrets management; document any owner/legal decisions needed before activating retention jobs.
- Test cross-customer access, admin privilege escalation, object-level access, guest tracking challenge enumeration, and information leakage in errors/logs.

## Priority and execution order for newly added phases

After the existing **Phase A database audit** and **Phase B authentication foundations**, prioritize **Phase M notifications**, then complete **Phase C/D customer/admin access**, **Phase I storefront**, **Phase J catalog/inventory**, **Phase K R2**, **Phase L checkout readiness**, and **Phase N security**, followed by Phase G tests and Phase H deployment documentation. Revisit the original phases as necessary; do not run all tests only at the end. Prefer finishing one functional vertical slice with tests before moving on.

For every checklist item, classify it in `docs/OVERNIGHT_PROGRESS.md` as **Already implemented and verified**, **Implemented tonight**, **Partially implemented**, **Blocked by external approval/config**, or **Not started**. Never mark an item done just because code exists; verify behavior and tests. When blocked, proceed to another safe item.

## Acceptance criteria

- Existing working storefront, R2 adapter and demo commerce paths remain intact.
- Supabase Auth integration is implemented in code and covered by appropriate tests, with live provider steps clearly documented if unavailable.
- Migration plan is validated locally and **no hosted Supabase schema/data changes** are made.
- No public admin registration or authentication bypass.
- No phone/SMS OTP, no paid-service activation, no production checkout.
- Notification templates, outbox workflows, and mock-provider delivery paths are implemented/tested where feasible; no real emails are sent without approval.
- Expanded storefront, catalog, inventory, admin, media, and checkout checklists are audited against real code and tracked with verified statuses.
- All executed tests and limitations are reported accurately.
- `docs/OVERNIGHT_PROGRESS.md` is current and includes a prioritized resume checklist.

## Final handoff format

1. **Implemented tonight** — grouped by phase, with key file paths.
2. **Verification** — exact commands and pass/fail/skip results.
3. **Hosted services touched** — explicitly confirm read-only Supabase MCP and no external writes, or disclose any deviation.
4. **Blocked/manual actions** — migration approval, SMTP, Google OAuth callback, R2 credentials/testing, admin bootstrap, hosting decisions.
5. **Next safe commands** — precise commands with environment safety checks, **not** destructive shortcuts.
6. **Remaining backlog** — prioritized for the next Codex session.

**Begin now. Inspect the repository and work through the safe backlog autonomously. Do not stop after producing a plan.**
