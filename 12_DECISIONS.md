# Decision Register — FLC Decor

## Confirmed by owner
- Public business contact confirmed in the Stitch integration prompt: FLC Decor; Fahad Ali; 0309 8663816; fahadaliali712@gmail.com; Mughal Pura, Prince Road, Gujranwala, Pakistan. The confirmed WhatsApp, mailto and tel URLs are centralized in `lib/business-contact.ts`.
- Storefront name: **Fahad Laser**; company/brand: **FLC Decor**.
- Single-vendor laser-cut decorative products website in Pakistan.
- Build and test first on free services; production infrastructure later.
- COD at launch; online payments later. Custom-order requests go to WhatsApp at launch.
- Guest checkout and optional customer accounts; guest tracking by order number + verified email.
- One admin at launch; admin TOTP mandatory; customer TOTP optional; server-managed sessions.
- Two-level categories; one primary and optional additional placements.
- Variant-specific size/color combinations, stock and pricing; images reusable.
- No cart reservation; reserve only after successful order; no blanket COD unpaid expiry.
- Transactional idempotent checkout, no overselling, strong acknowledged-order durability for supported single DB failure; fail closed if unsafe.
- 1,000 concurrent visitors, 99.9% monthly uptime, RTO 1h, RPO 15m, automatic app/DB failover, DB checkout recovery target <=2m.
- Balanced performance, maintainability, observability, data retention, secrets and privileged access, media security; enhanced stored-data protection.
- Recoverable media cleanup (Option B).
- No affiliate accounts, no marketplace.

## Recommended engineering defaults (not owner-approved business facts)
- 30-day orphaned-media recovery; JPEG/PNG/WebP, tentative 10 MB upload cap.
- Next.js + NestJS + PostgreSQL + Prisma; modular monolith; free demo hosting candidates.
- Original premium warm-neutral design with restrained brass accents and 3D progressive enhancement.
- Brand motto/store lines/mission/vision in `11_BRAND_CONTENT.md` are proposed copy awaiting approval.
- Draft API paths, schema fields and internal status names are implementation proposals.

## Explicitly deferred or blocked
- Courier vendor, shipping charges, packaging, returns and cancellation policy.
- Exact operational order-state transitions, refund rules and tax treatment.
- Exact legal retention periods, live business address/contact, WhatsApp number, final brand copy.
- Hosting provider, region, production HA topology, backup provider and paid budget.
- Online payments, onsite custom configurator, advanced admin roles.

## Critical build gates
- Do not invent zero shipping cost or accept live COD orders before a valid total and courier policy exist.
- Do not claim free-tier services meet production uptime/failover/durability targets.
- Do not fabricate testimonials, product images, discounts or business credentials.
- Do not clone pyariwalls.pk; use it only as a category/catalog UX reference.

## Owner authorization — autonomous build
- **Decision:** Codex should implement the complete website continuously, without waiting for the owner/assistant between routine phases or for ordinary technical decisions.
- **Decision authority:** Resolve unspecified technical/UI implementation details using documented recommendations and record them below. Do not invent shipping fees, legal rules, courier arrangements, real business contact information, or other owner-dependent facts.
- **Progress:** Record milestones and blockers in `IMPLEMENTATION_STATUS.md`; continue to the next feasible task automatically.
- **Limits:** No paid purchases, external account changes, live production deployment, real messages, or live customer-order acceptance without separate authorization and necessary configuration.

## Autonomous implementation decisions

### 2026-11-12 — Adopt the existing editorial UI world and add a tokenized refinement layer

- Decision: Install the project-local Hallmark and retain Impeccable guidance, then improve the current FLC Decor storefront through shared design tokens, accessible inline icons, responsive media stability, and restrained motion instead of replacing the component architecture.
- Alternatives considered: add Skiper, Vengeance UI, or Animmaster as runtime dependencies; rebuild the storefront around a new component system; invent unavailable Mobbin or Watermelon UI MCP connections.
- Reason: the existing application already has a coherent editorial catalogue direction and working commerce/admin wiring. New libraries would add bundle, license, accessibility, and maintenance risk without being required for the requested visual outcome. The MCP discovery did not expose the named services.
- Affected files: `PRODUCT.md`, `DESIGN.md`, `AGENTS.md`, `app/page.tsx`, `app/globals.css`, `components/icon.tsx`, `docs/UI_RESOURCE_EVALUATION.md`, and review documentation.
- Reversibility: yes; the design-token layer and icon usage are isolated and can be adjusted or reverted without changing persistence or order logic.
- Owner review later: yes, for licensed production photography, final brand fonts, and any paid animation/component licenses.

### 2026-10-27 — Private R2 staging with explicit media approval
- **Decision:** Use the existing `MediaAsset`, `ProductMedia`, and `VariantMedia` models. Store deterministic main/thumbnail pairs under random private `staging/` keys, promote to `public/` only after an MFA-authorized approval, and proxy approved delivery through the app unless a prefix-scoped public Worker/CDN URL is configured.
- **Alternatives considered:** Make the entire R2 bucket public; upload directly from the browser with long-lived credentials; add duplicate media tables; call R2 inside database transactions.
- **Reason and tradeoffs:** This keeps credentials server-only, prevents pending images from appearing in the catalog, preserves shared references, and records recoverable partial failures. App-proxied delivery uses application bandwidth unless a safely scoped public delivery origin is configured.
- **Affected files:** `lib/r2-storage.ts`, `lib/media.ts`, `lib/media-store.ts`, `app/api/admin/media/**`, `app/api/media/**`, `app/admin/admin-media-manager.tsx`, catalog/gallery components, tests and `docs/R2_MEDIA_RUNBOOK.md`.
- **Reversible:** Yes; runtime activation is environment controlled and no schema migration was required.
- **Owner review before production:** Yes; bucket, token scope, public delivery boundary, retention, monitoring and credential rotation require approval.
Codex: append entries using this template for each significant choice:

### 2026-10-26 — Add encrypted saved-address payload without weakening length constraints
- **Decision:** Add one nullable ciphertext payload column to the existing CustomerAddress table. New local saved-address writes place AES-256-GCM encrypted details there and non-sensitive placeholders in required legacy columns; customer ownership is checked server-side. Use the existing configured local checkout field key. Preserve all original length and country checks.
- **Alternatives considered:** Store customer PII in plaintext; remove length constraints to fit ciphertext in legacy fields; add a duplicate address table; leave the clear account API absent.
- **Reason and tradeoffs:** The legacy required fields were designed for short plaintext and rejected encrypted values. A separate payload is the smallest additive change that avoids weakening constraints or leaking new PII. Existing rows have no payload and need a reviewed backfill; key rotation and production identity remain blockers.
- **Affected files:** `prisma/schema.prisma`, `prisma/migrations/0005_customer_address_private_payload/migration.sql`, `lib/private-fields.ts`, `lib/account-store.ts`, `lib/account-api.ts`, `app/api/account/profile/**`, `app/api/account/addresses/**`, `tests/integration/account-store.test.ts`.
- **Reversible:** Application behavior can be disabled; database column is additive and should not be dropped until data migration/retention is reviewed.
- **Owner review before production:** Yes; encryption/key lifecycle, legacy rows, legal retention and production identity.

### 2026-10-26 — Opt-in PostgreSQL catalog and guarded admin business services
- **Decision:** Add database-backed catalog, category, product, variant, inventory, order-read and dashboard services behind the existing Next.js route handlers. Enable storefront database reads only with `CATALOG_RUNTIME=database`; keep demo admin MFA and production fail-closed behavior. Link signed-in demo checkout orders to customer profiles inside the existing serializable transaction.
- **Alternatives considered:** Replace all sample UI data immediately; create separate backend service or duplicate tables; expose generic model CRUD; enable live checkout before policy configuration.
- **Reason and tradeoffs:** Existing Prisma models and checkout transaction already provide the needed foundation. Explicit validation, scoped writes and audit rows make the local database path usable without introducing provider/policy assumptions. Application-memory catalog filtering is suitable for local scale only and must be pushed into indexed queries before larger catalogs.
- **Affected files:** `lib/backend-validation.ts`, `lib/admin-api.ts`, `lib/catalog-store.ts`, `lib/admin-store.ts`, `lib/database-store.ts`, `app/api/admin/**`, `app/api/catalog/**`, `app/shop/**`, `app/products/**`, `app/cart/**`, `app/admin/page.tsx`, `tests/integration/**`, `.env.example`, `BACKEND_IMPLEMENTATION_AUDIT.md`.
- **Reversible:** Yes; these are additive routes/services and an opt-in runtime switch, with no new migration.
- **Owner review before production:** Yes; production identity/RBAC, shipping/tax, status transitions, customer data retention, R2 storage and real providers remain separate gates.

### YYYY-MM-DD — Decision title
- **Decision:**
- **Alternatives considered:**
- **Reason and tradeoffs:**
- **Affected files:**
- **Reversible:** Yes/No, with migration notes if relevant
- **Owner review before production:** Yes/No

### 2026-10-26 — Local-first Next.js modular monolith
- **Decision:** Build the runnable demo as a single Next.js App Router application with TypeScript, route handlers, and a small domain layer; include Prisma/PostgreSQL schema and Docker Compose as the production-shaped persistence path.
- **Alternatives considered:** Separate Next.js and NestJS packages immediately; static-only prototype; hosted Site deployment.
- **Reason and tradeoffs:** The repository is empty and the requested outcome is a locally runnable end-to-end build. A single app reduces setup friction while preserving clear module boundaries and API contracts. The demo adapter is intentionally not presented as production durability.
- **Affected files:** `package.json`, `app/**`, `components/**`, `lib/**`, `prisma/**`, `docker-compose.yml`.
- **Reversible:** Yes; route handlers can be moved into NestJS modules without changing the public domain contracts.
- **Owner review before production:** Yes.

### 2026-10-26 — Synthetic CSS product imagery for demo catalog
- **Decision:** Use original CSS-rendered product artwork with clearly labeled sample catalog fixtures instead of downloading third-party or reference-store imagery.
- **Alternatives considered:** Scraping reference imagery; adding generic stock photography; blocking the build until owner-supplied assets arrive.
- **Reason and tradeoffs:** The documentation prohibits copied assets and requires appropriate rights. CSS artwork keeps the demo visually coherent, fast, and safe; owner-provided media can replace it through the media model later.
- **Affected files:** `lib/catalog.ts`, `components/product-art.tsx`, `app/globals.css`.
- **Reversible:** Yes; product media references can replace the artwork layer without changing checkout behavior.
- **Owner review before production:** Yes for final catalog media.

### 2026-10-26 — Fail-closed demo checkout policy
- **Decision:** Expose a synthetic COD demo flow only when `DEMO_CHECKOUT_ENABLED` is true (default local development), show a persistent demo banner, and keep live shipping/tax/order-status policy unconfigured.
- **Alternatives considered:** Assume free shipping; accept live-like orders without policy configuration; disable checkout entirely.
- **Reason and tradeoffs:** The local demo must exercise the core order and inventory flow, but the requirements prohibit inventing shipping, tax, courier, returns, or cancellation rules. The environment flag makes the boundary explicit.
- **Affected files:** `.env.example`, `lib/demo-store.ts`, `app/api/checkout/**`, `app/checkout/**`, `app/order/**`.
- **Reversible:** Yes; replace the quote adapter and enable production readiness gates once policies and infrastructure are approved.
- **Owner review before production:** Yes.

### 2026-10-26 — Audit hardening for production fail-closed behavior and scoped idempotency
- **Decision:** Disable the in-memory checkout adapter whenever `NODE_ENV=production`, scope demo idempotency records by normalized checkout email/phone plus key, and return a generic 503 from guest order lookup until email-verified capabilities are implemented.
- **Alternatives considered:** Trust the environment flag in production; use a globally unique client key; allow order lookup by public number during the demo.
- **Reason and tradeoffs:** A copied demo flag must not accidentally enable production-like writes, idempotency must not collide across checkout identities, and guest order status must not be enumerable without verified email control. This makes the demo less complete but safer and honest.
- **Affected files:** `lib/demo-store.ts`, `app/api/orders/[number]/route.ts`, `tests/domain.test.ts`.
- **Reversible:** Yes; replace the scope adapter and verification gate with the PostgreSQL/email capability implementation before launch.
- **Owner review before production:** Yes.

### 2026-10-26 — Baseline security headers and non-sensitive SEO routes
- **Decision:** Add conservative response headers, a no-index robots policy for the synthetic demo, an explicit public sitemap for non-sensitive catalog/policy pages, and global loading/error states.
- **Alternatives considered:** Add a permissive production indexing policy; expose checkout/order routes in the sitemap; defer error/loading states until the production host is selected.
- **Reason and tradeoffs:** The demo must not be indexed as a live store or expose private/order routes. The headers reduce common browser-side risk without claiming TLS/CSP/auth completion. Production SEO and CSP should be reviewed once the real domain and runtime are approved.
- **Affected files:** `next.config.ts`, `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`, `app/loading.tsx`, `app/error.tsx`.
- **Reversible:** Yes.
- **Owner review before production:** Yes.

### 2026-10-26 - Retry PostgreSQL serialization and deadlock conflicts at the transaction boundary
- **Decision:** Retry the complete serializable checkout transaction up to four attempts with 10-100 ms exponential backoff plus up to 20 ms jitter when Prisma reports `P2034`, or when the PostgreSQL adapter exposes `40001` serialization / `40P01` deadlock codes (currently wrapped as `P2010` for raw queries). Re-run all idempotency, product, balance and conditional reservation checks on every attempt; return a controlled stock-domain result if the competing checkout has consumed the final unit.
- **Alternatives considered:** Lower isolation; remove the conditional stock predicate; retry only the raw `UPDATE`; expose the Prisma exception; call payment/notification providers during retry.
- **Reason and tradeoffs:** Under Prisma 7's `@prisma/adapter-pg`, the failing raw update surfaced as `P2010` with `meta.driverAdapterError.cause.originalCode = 40001`, while other Prisma transaction paths use `P2034`. Only a whole-transaction retry preserves atomicity and lets the losing request observe the committed reservation. The short bounded retry improves transient contention handling without allowing unbounded work or external side effects inside the transaction.
- **Affected files:** `lib/database-store.ts`, `tests/database-store.test.ts`, `tests/integration/postgres.test.ts`, `IMPLEMENTATION_STATUS.md`, `docs/VERIFICATION_EVIDENCE.md`.
- **Reversible:** Yes; retry count/backoff are local policy constants and the serializable isolation and database constraints remain unchanged.
- **Owner review before production:** Yes; validate retry budgets, observability, pool sizing and production load characteristics.

### 2026-10-26 - Secure local runtime boundaries for identity, tracking, payments and notifications
- **Decision:** Keep production identity, payment providers, messaging and admin RBAC fail-closed while adding reusable local runtime boundaries: server session ownership checks, a PostgreSQL guest challenge/capability flow with mock delivery, a provider-neutral test webhook verifier, and a SKIP LOCKED outbox worker with bounded retry/dead-letter handling.
- **Alternatives considered:** Expose existing demo pages/routes; return order details by order number; invent provider APIs/signatures; call notification services inside checkout; mark schema-only tables as production-ready.
- **Reason and tradeoffs:** The schema already contains the required primitives, but external authorities and credentials are not configured. These adapters make security properties executable and testable without fabricating production integrations or weakening fail-closed behavior. Durable identity-to-role mapping and real provider adapters remain owner/infrastructure work.
- **Affected files:** `lib/auth.ts`, `app/admin/page.tsx`, `app/api/account/orders/route.ts`, `lib/guest-tracking.ts`, `app/api/guest-orders/**`, `app/api/orders/[number]/route.ts`, `lib/payment-integrity.ts`, `lib/outbox-worker.ts`, `tests/auth.test.ts`, `tests/integration/postgres.test.ts`.
- **Reversible:** Yes; local adapters can be replaced behind the same boundaries before production activation.
- **Owner review before production:** Yes; identity authority, role mapping, provider signatures, notification credentials and operational policies must be approved.

### 2026-10-26 — Frontend integration of approved media references
- **Decision:** Render only `APPROVED` product and variant media through a configured HTTPS `MEDIA_PUBLIC_BASE_URL`; prefer selected variant images, fall back to shared images, then labeled original CSS artwork.
- **Alternatives considered:** Use Stitch mock photography as product inventory; require R2 credentials before any gallery can render.
- **Reason and tradeoffs:** The export has no licensed local product image set, while the database has approved media references. This preserves honest catalog content and leaves upload/delivery infrastructure configurable.
- **Affected files:** `lib/catalog-store.ts`, `components/product-gallery.tsx`, `components/product-card.tsx`, `app/page.tsx`, `.env.example`.
- **Reversible:** Yes.
- **Owner review before production:** Yes, for actual image rights, delivery host and media lifecycle.

### 2026-10-26 — Short-lived browser receipt after demo checkout
- **Decision:** Issue a signed 15-minute HTTP-only receipt cookie scoped to the confirmation route and load the matching server order for immediate confirmation.
- **Alternatives considered:** Make an order number alone disclose order details; rely on browser-only order data.
- **Reason and tradeoffs:** The buyer sees a real order result after checkout while later guest tracking still requires verified email control. Receipt signing needs a stable configured key in any multi-instance deployment.
- **Affected files:** `lib/order-receipt.ts`, `app/api/checkout/orders/route.ts`, `app/order/success/[token]/page.tsx`, `tests/order-receipt.test.ts`.
- **Reversible:** Yes.
- **Owner review before production:** Yes, along with durable identity and tracking delivery.

### 2026-10-26 — Local loopback origin alias for development
- **Decision:** Treat localhost and 127.0.0.1 on the same scheme and port as equivalent for same-origin checks only outside production.
- **Alternatives considered:** Require a single exact loopback hostname for all development tests.
- **Reason and tradeoffs:** Next's local browser fetch can use the alternate loopback spelling. Production origin comparison remains exact.
- **Affected files:** `lib/auth.ts`, `tests/auth.test.ts`.
- **Reversible:** Yes.
- **Owner review before production:** No; production behavior remains exact-origin.

### 2026-10-26 - Guarded disposable backup helpers
- **Decision:** Add PowerShell `pg_dump`/`pg_restore` helpers that allow only local disposable database names, refuse overwrite, require an explicit restore flag and never run automatically.
- **Alternatives considered:** Run a destructive reset/restore during development; embed credentials; claim a provider backup guarantee without a restore drill.
- **Reason and tradeoffs:** The repository needs a reproducible recovery procedure while preserving safety boundaries. The helpers are useful for local verification but intentionally do not represent production backup durability.
- **Affected files:** `scripts/backup-postgres.ps1`, `scripts/restore-postgres.ps1`, `docs/BACKUP_RESTORE_RUNBOOK.md`, `SECURITY_INTEGRATION_AUDIT.md`.
- **Reversible:** Yes.
- **Owner review before production:** Yes; select provider, retention, encryption, PITR and recovery objectives.

## Open business and production decisions
Keep a running list of settings requiring owner input before live launch. Their absence must not block local/demo implementation.

### 2026-10-26 — Controlled patched toolchain upgrade
- **Decision:** Upgrade Next.js/eslint-config-next to 16.4.3, Vitest to 5.0.5, and Prisma/@prisma-client to 7.10.1; migrate ESLint to the supported flat config and Prisma CLI URL to `prisma.config.ts`.
- **Alternatives considered:** Leave known advisories open; apply `npm audit fix --force` without compatibility review; downgrade to avoid framework changes.
- **Reason and tradeoffs:** The audit identified exploitable advisory chains. Official upgrade guidance shows Next 16 and Prisma 7 require configuration changes; controlled changes preserve Node 22/TypeScript compatibility and all local checks passed. Major upgrades add review surface and are not proof of production compatibility.
- **Affected files:** `package.json`, `package-lock.json`, `eslint.config.mjs`, `prisma.config.ts`, `prisma/schema.prisma`, `tsconfig.json`.
- **Reversible:** Yes, with a reviewed package/lockfile rollback and corresponding config rollback.
- **Owner review before production:** Yes.

### 2026-10-26 — Strict PostgreSQL checkout adapter boundary
- **Decision:** Add a Prisma/PostgreSQL repository selected only by `CHECKOUT_RUNTIME=database`; keep the process-local adapter only for non-production synthetic demo mode and reject production regardless of copied demo flags.
- **Alternatives considered:** Replace the demo immediately without a runnable DB; silently fall back to in-memory state when DB access fails; keep only schema placeholders.
- **Reason and tradeoffs:** This preserves the existing demo while creating a real transaction path. The adapter uses serializable transactions, conditional stock updates, encrypted fields, durable idempotency, inventory ledger and order/status rows. Docker is unavailable, so real DB concurrency/restart evidence remains open.
- **Affected files:** `lib/prisma.ts`, `lib/database-store.ts`, `app/api/checkout/orders/route.ts`, `app/api/checkout/quote/route.ts`, `prisma/schema.prisma`, `prisma/migrations/0002_checkout_totals/migration.sql`.
- **Reversible:** Yes; runtime selection is environment-configured and migration is forward-only.
- **Owner review before production:** Yes.

### 2026-10-26 — Accessibility landmark and accessible-name correction
- **Decision:** Keep one site-header banner landmark, place the announcement inside that landmark, and make visible cart text part of the cart link accessible name.
- **Alternatives considered:** Suppress axe findings in tests; retain duplicate banner roles; use an aria label unrelated to visible control text.
- **Reason and tradeoffs:** The actual axe audit found WCAG landmark and label-content-name violations. Correcting semantic structure improves keyboard/screen-reader behavior without changing the visual design. The announcement remains a presentational bar and the header remains the single banner landmark.
- **Affected files:** `components/site-header.tsx`, `tests/e2e/accessibility.spec.ts`, `tests/e2e/customer-journey.spec.ts`.
- **Reversible:** Yes.
- **Owner review before production:** No, except normal accessibility review.

### 2026-10-26 — Exclude generated browser artifacts from source lint
- **Decision:** Exclude generated `.next-e2e/**`, `playwright-report/**` and `test-results/**` artifacts from ESLint and Git tracking while continuing to lint all application, library and test source.
- **Alternatives considered:** Delete reports before every lint run; disable ESLint rules globally; lint generated trace bundles as source.
- **Reason and tradeoffs:** Browser traces are generated third-party/minified bundles and produced false hook-rule errors after E2E runs. A narrow ignore boundary keeps source lint meaningful and makes verification repeatable.
- **Affected files:** `eslint.config.mjs`, `.gitignore`.
- **Reversible:** Yes.
- **Owner review before production:** No.

### 2026-10-26 — Additive ready-stock production database foundation
- **Decision:** Extend the existing Prisma schema with an additive PostgreSQL foundation: per-location on-hand/reserved balances, reservations and immutable movements; independent fulfillment/payment state; customer profiles referencing an external auth UUID; RBAC, order snapshots, payment/outbox/tracking primitives, and category depth/cycle enforcement. Preserve legacy tables/columns and copy old order states into history rather than rewriting them.
- **Alternatives considered:** Replace the schema wholesale; rename/drop existing status/stock columns now; keep only the prior process-local checkout; couple production profiles directly to a Supabase-private schema.
- **Reason and tradeoffs:** The database spec requires relational integrity and ready-stock reservations, while the existing app must remain runnable and existing data preserved. Migration 0004 leaves `Variant.availableQty` as a compatibility mirror and keeps old payment status unknown when it cannot be inferred. The database checkout path uses the new balances but remains non-production and totals remain synthetic-zero.
- **Affected files:** `prisma/schema.prisma`, `prisma/migrations/0004_production_database_foundation/migration.sql`, `lib/database-store.ts`, `prisma/seed.ts`, `tests/integration/postgres.test.ts`, `docs/database/**`, payment/state/tracking/notification runbooks.
- **Reversible:** Forward-only/additive; application selection can be switched off. Any eventual column removal requires a separately reviewed migration after reconciliation and backup.
- **Owner review before production:** Yes, including payment scope conflict, warehouse, COD/reservation behavior, shipping/tax, state transitions, retention, and provider decisions.

### 2026-10-26 — Separate migration and pooled runtime URLs
- **Decision:** Use `DIRECT_DATABASE_URL` for Prisma migrations when configured and `DATABASE_URL` for the bounded `pg` runtime pool; validate `DATABASE_POOL_MAX` and cap it to 50.
- **Alternatives considered:** Reuse a transaction pooler for migrations; hardcode pool size; add provider-specific Supabase dependencies before the provider is selected.
- **Reason and tradeoffs:** Managed providers may require a direct migration connection while the app uses pooling. The generic adapter keeps provider coupling low; actual pooling limits and credentials require deployment verification.
- **Affected files:** `prisma.config.ts`, `.env.example`, `lib/prisma.ts`, database documentation.
- **Reversible:** Yes.
- **Owner review before production:** Yes; confirm managed provider settings.

### 2026-10-27 — One-time local PostgreSQL administrator bootstrap
- **Decision:** Replace the process-local demo administrator with a local-only, one-time PostgreSQL bootstrap, durable hashed sessions, encrypted TOTP enrollment, hashed one-time recovery codes, and database-backed least-privilege RBAC. The initial role grants catalog read/write, inventory read/adjust, order read, audit read and analytics read; payment reconciliation, settings management and order transitions are excluded.
- **Alternatives considered:** Public admin signup; hardcoded default credentials; keeping environment-only demo identity; granting every defined permission; weakening MFA or server authorization for local access.
- **Reason and tradeoffs:** The implemented dashboard and R2 manager were unreachable without a real principal. A guarded CLI creates exactly one auditable administrator without adding a public elevation path. The fixed bootstrap marker deliberately requires a separately reviewed recovery process if the initial administrator is lost.
- **Affected files:** `lib/admin-auth.ts`, `lib/auth-crypto.ts`, `lib/admin-api.ts`, `app/api/admin/auth/**`, `app/admin/**`, `prisma/migrations/0006_persistent_admin_auth/migration.sql`, `scripts/bootstrap-admin.ts`, `scripts/bootstrap-admin-local.ps1`, `tests/integration/admin-auth.test.ts`, `tests/e2e/admin-onboarding.spec.ts`, `docs/ADMIN_BOOTSTRAP_RUNBOOK.md`.
- **Reversible:** Runtime selection is reversible; migration and bootstrap audit/marker records are forward-only operational evidence.
- **Owner review before production:** Yes; approve identity provider strategy, admin recovery and role administration, key custody/rotation, distributed rate limiting, session policy and production database controls.

### 2026-10-27 — Supabase Auth for customer identity with server-owned application data
- **Decision:** Add Supabase Auth as the production-capable customer identity authority using `@supabase/ssr`, PKCE cookies, verified server user lookup, email verification/recovery, and Google OAuth initiation. Keep application profiles, addresses, orders, admin identity, and authorization in the existing server-side Prisma/PostgreSQL boundary. Preserve the in-memory customer identity only behind explicit non-production `AUTH_RUNTIME=demo`.
- **Alternatives considered:** Expose public registration through the local `User` table; trust browser `getSession()` data; use email matching to claim existing profiles; move all Prisma data to hosted Supabase immediately; replace the already working PostgreSQL admin MFA system in the same change.
- **Reason and tradeoffs:** Supabase provides durable customer identity and SSR session handling without giving browsers database credentials. `getUser()` is used for protected account APIs, proxy refresh uses verified claims, redirects are constrained to the configured application origin, and profile linkage is by immutable Auth UUID. SMTP, OAuth provider configuration, hosted schema migration, and admin federation remain separate approval-gated work.
- **Affected files:** `lib/supabase/**`, `proxy.ts`, `app/api/auth/**`, `app/auth/**`, `app/account/**`, `lib/account-api.ts`, `lib/account-store.ts`, `.env.example`, `tests/supabase-auth.test.ts`, `docs/SUPABASE_MIGRATION_PLAN.md`.
- **Reversible:** Yes; disable `AUTH_RUNTIME=supabase`. Existing local demo tests can continue with explicit `AUTH_RUNTIME=demo`; no hosted schema or records were changed.
- **Owner review before production:** Yes; approve SMTP, Google OAuth, redirect allowlist, hosted database migration, account-link recovery, and production admin identity strategy.

### 2026-10-27 — Typed transactional notification outbox with non-networked development delivery
- **Decision:** Preserve the existing transactional order/outbox write and add a typed, escaped template catalog, a provider interface, an explicitly non-production in-memory provider, delivery-attempt persistence, filtered `SKIP LOCKED` processing, bounded retry/dead-letter behavior, and MFA/RBAC-protected queue visibility/manual retry.
- **Alternatives considered:** Call email/SMS during checkout; put recipient PII or rendered HTML in outbox payloads; fabricate provider success; mark provider acceptance as end-recipient delivery; let every outbox event be consumed by the notification worker.
- **Reason and tradeoffs:** Orders stay atomic and independent from provider availability. Stable deduplication keys support at-least-once processing without duplicate development delivery, while separate `ACCEPTED` and `DELIVERED` states avoid false delivery claims. A real provider adapter, webhooks, distributed scheduling, retention, and alerting remain production work.
- **Affected files:** `lib/notification-catalog.ts`, `lib/notification-provider.ts`, `lib/notification-service.ts`, `lib/outbox-worker.ts`, `app/api/admin/notifications/**`, `app/admin/notifications/**`, `prisma/migrations/0007_notification_permissions/migration.sql`, `tests/notifications.test.ts`, `tests/integration/postgres.test.ts`, `docs/NOTIFICATIONS_RUNBOOK.md`.
- **Reversible:** Runtime selection and UI/routes are reversible; the additive permission rows and delivery audit history should be retained.
- **Owner review before production:** Yes; approve providers, sender identity, template content, consent/retention, worker infrastructure, alerting, and webhook verification.

### 2026-10-27 - Test-only COD order lifecycle and minimized administration
- **Decision:** Implement legal order transitions only for non-production `COD_DEMO` orders, guarded by durable administrator MFA and `orders.transition`. Release active reservations on cancellation and commit them on dispatch inside a serializable transaction; write status, inventory, notification, outbox and audit records atomically. Add minimized customer listing and honest paid-versus-placed analytics rather than exposing decrypted contact/address data or labeling placed value as revenue.
- **Alternatives considered:** Enable transitions for production orders; couple payment and fulfillment state; restock returns automatically; expose full customer PII; show every order total as revenue.
- **Reason and tradeoffs:** The implementation makes the operational workflow testable without inventing COD collection, return inspection or legal policy. Production remains blocked and returned goods require an approved physical-inspection rule before stock changes.
- **Affected files:** `lib/order-lifecycle.ts`, `lib/admin-store.ts`, `app/api/admin/orders/**`, `app/api/admin/customers/**`, `app/api/admin/analytics/**`, `app/admin/**`, migrations `0008` and `0009`, and PostgreSQL integration tests.
- **Reversible:** Yes for runtime/UI behavior; additive permissions and audit history should be retained.
- **Owner review before production:** Yes; approve transition rules, cancellation/return policy, COD collection and customer-data access.

### 2026-10-27 - Database-native catalog filtering and explicit checkout pricing policy
- **Decision:** Push catalog search, filters, sort, stock predicates and pagination into parameterized PostgreSQL queries while retaining same-variant filter semantics. Centralize checkout totals behind a fail-closed policy interface whose only current implementation is the non-production `synthetic-zero` fixture.
- **Alternatives considered:** Continue loading the full catalog into application memory; interpolate filter SQL; assume free shipping or no tax; enable synthetic totals in production.
- **Reason and tradeoffs:** Database pagination scales and keeps query values parameterized. A single explicit pricing boundary prevents missing shipping/tax decisions from silently becoming zero-value production promises.
- **Affected files:** `lib/catalog-store.ts`, `lib/checkout-pricing.ts`, `lib/database-store.ts`, catalog/checkout tests, and `docs/CHECKOUT_POLICY_GATES.md`.
- **Reversible:** Yes; an approved policy can implement the same interface and catalog queries can be tuned without changing API contracts.
- **Owner review before production:** Yes; approve delivery areas, courier, tax, discounts, cancellation, returns and COD eligibility.

### 2026-10-27 - Commercial hosting is not approved on a personal free tier
- **Decision:** Treat Vercel Hobby as preview-only because its terms restrict it to personal/non-commercial use. Do not migrate the working Next.js application to Cloudflare Workers solely for free hosting while the recommended Next.js adapter is beta and Prisma, Sharp and route compatibility remain unproved. Prepare staging steps but do not deploy.
- **Alternatives considered:** Present a free personal tier as a production commerce host; rewrite immediately for an edge runtime; select a paid host without owner approval.
- **Reason and tradeoffs:** Preserving the verified Node runtime is lower risk than an untested platform migration. This leaves hosting and budget selection as an explicit launch blocker.
- **Affected files:** `docs/FREE_TIER_DEPLOYMENT_PLAN.md`, `docs/GO_LIVE_CHECKLIST.md`.
- **Reversible:** Yes after target-runtime compatibility and commercial terms are verified.
- **Owner review before production:** Yes; hosting, budget, region, quotas and support posture require approval.

### 2026-10-27 - Server-only Supabase public schema boundary
- **Decision:** The owner approved migrations 0001-0009 as the existing baseline and approved additive remediation migrations. Keep FLC application objects in `public`, but expose none of them to Supabase browser API roles. Run a mandatory default-privilege guard before the first Prisma migration, revoke `anon`, `authenticated`, `service_role` and `PUBLIC` object access, enable RLS without browser policies, and grant application DML only through the dedicated non-owner `flc_app_server` PostgreSQL login and server-only policies. Keep Prisma migration history accessible only to the direct migration owner.
- **Alternatives considered:** Move all application objects to a private schema; rely only on a final hardening migration; use Supabase `service_role` or the `postgres` owner for application traffic; add customer-facing RLS policies; edit migrations already applied locally.
- **Reason and tradeoffs:** The owner selected the server-only `public` approach. The pre-migration guard closes the exposure window that would exist while older migrations run. A dedicated runtime role allows RLS to remain effective without giving the application database-owner privileges. The role password must be assigned and rotated out-of-band, and every future table must receive explicit grants and a reviewed server-only policy.
- **Affected files:** `prisma/schema.prisma`, migrations `0010` and `0011`, `prisma.config.ts`, `lib/prisma.ts`, `.env.example`, local migration/security verification scripts and Supabase migration documentation.
- **Reversible:** Runtime connection selection is reversible. RLS, grants, policies and role creation are forward-only database controls and should be changed only by reviewed migrations.
- **Owner review before production:** Hosted execution, Data API state, runtime-role password provisioning, staging backup/recovery evidence, and final migration approval remain separately gated.

### 2026-10-27 - Fail-closed Supabase staging target validation
- **Decision:** Require a non-connecting validator before any staging database command. It pins project `ltcgiquvrplfrbojbbbb`, rejects the original project and query-parameter routing overrides, separates Prisma and psql direct URLs, pins the Supavisor runtime role/project username and port, requires `verify-full` plus one readable project CA, and fixes serverless pool size to one. Keep staging secrets in process scope or an explicitly selected untracked file.
- **Alternatives considered:** Trust copied dashboard URLs; reuse `.env.local`; infer staging from a pooler hostname; allow psql to consume the Prisma URL; connect to the currently configured original-project MCP for comparison.
- **Reason and tradeoffs:** The active MCP and `.env.local` both identify the protected original project. A local validator prevents accidental cross-project writes before any client opens a socket. Pinning query parameters is intentionally strict and future legitimate parameters require a reviewed allowlist update.
- **Affected files:** `lib/supabase/staging-target.ts`, `scripts/validate-supabase-staging-target.ts`, `.env.staging.example`, `.gitignore`, `package.json`, `tests/supabase-staging-target.test.ts`, and `docs/SUPABASE_STAGING_PREFLIGHT.md`.
- **Reversible:** Yes; the validator/template can be replaced after a reviewed deployment architecture change. No hosted state was changed.
- **Owner review before production:** Yes. Staging MCP scope, secrets, direct-network path, Data API window, custom-role creation, Supavisor authentication, and all hosted migrations remain approval-gated.

### 2026-11-11 - Stable storefront media frames and failure fallbacks
- **Decision:** Give collection cards a fixed responsive 4:5 media frame, use a source-keyed fallback when approved media fails, and apply the same fallback behavior to the product gallery. Keep the existing labelled CSS sample artwork as the local fallback.
- **Alternatives considered:** Let absolutely positioned media determine card height; hide failed media; fabricate replacement photography; block the product surface until R2 is configured.
- **Reason and tradeoffs:** A stable frame prevents the reproduced desktop collapse and keeps titles/prices readable across viewports. The fallback preserves a usable local demo without claiming unapproved product imagery. Real photography remains an owner/licensing and media-pipeline task.
- **Affected files:** `app/globals.css`, `components/product-card.tsx`, `components/product-gallery.tsx`, `docs/UI_AUDIT.md`, and `docs/OVERNIGHT_IMPLEMENTATION_LOG.md`.
- **Reversible:** Yes; the frame ratio and fallback presentation can be adjusted without changing catalog or order contracts.
- **Owner review before production:** Yes; approve licensed media, art direction, and final crop/aspect ratio.

### 2026-11-12 - Post-transformation QA fixes remain narrowly scoped
- **Decision:** Treat Hallmark’s large static result as a triage report, not a score to optimize. Fix only verified customer-impacting defects; retain intentional editorial labels, sample-art literals and fluid spacing. Fix the verified 360/390px mobile purchase-bar overflow with a two-pixel CSS margin correction and add a reusable local visual-audit script.
- **Alternatives considered:** Rewrite all 388 findings; suppress gates; change business copy and visual language to satisfy heuristics; skip the visual matrix because the existing Playwright suite was green.
- **Reason and tradeoffs:** Most findings overlap around the legacy one-line stylesheet and deliberate FLC Decor visual conventions. Wholesale changes would risk the approved design and working business flows. The local matrix found one concrete overflow, which was safe to correct without changing behavior.
- **Affected files:** `app/globals.css`, `scripts/qa-visual-audit.mjs`, `.gitignore`, `docs/UI_AUDIT.md`, and `docs/INTEGRATION_GAPS.md`.
- **Reversible:** Yes; the CSS correction and audit script are isolated and do not touch persistence, auth, orders, or external services.
- **Owner review before production:** Yes; final brand contrast, licensed fonts/photography, OAuth credential rotation, and production environment configuration remain owner/security decisions.

### 2026-11-12 - Ink bleed theme integration stays within the existing theme contract
- **Decision:** Keep `data-theme` and `flc-theme` as the only theme state, move the accessible toggle to the shared header, and adapt the reference interaction into a single global `InkThemeTransition` client component. Use `html2canvas` for the outgoing page texture, WebGL2 for the organic reveal, and an image/mask CSS fallback with immediate reduced-motion behavior.
- **Alternatives considered:** Create a separate demo route; add a second theme provider; replace the effect with a simple opacity fade; copy the reference Vite app wholesale.
- **Reason and tradeoffs:** The existing bootstrap already prevents a theme flash and the existing event contract is used by the toggle. Centralizing the transition avoids divergent state and keeps catalog, cart, auth, checkout, and admin logic untouched. The adapted shader is smaller than the reference’s full snapshot compositor, while preserving the click-origin organic reveal and safe fallback behavior.
- **Affected files:** `components/ink-theme-transition.tsx`, `components/theme-toggle.tsx`, `components/site-header.tsx`, `components/page-shell.tsx`, `components/footer.tsx`, `components/icon.tsx`, `app/globals.css`, `DESIGN.md`, `package.json`, and `package-lock.json`.
- **Reversible:** Yes; the transition component is isolated and the CSS tokens remain the existing document-level contract.
- **Owner review before production:** Yes; confirm final brand palette, licensed fonts, and the production browser performance budget after testing on representative low-end mobile hardware.

### 2026-11-12 - Ink bleed motion is a slower upper-right diagonal spread
- **Decision:** Tune the theme transition to an approximately 1.18-second spread, anchor it 30px from the right and 28px from the top, bias the fluid current toward the lower-left, and layer three time-evolving noise fronts. Keep the clicked toggle coordinate recorded for diagnostics, but use the consistent upper-right visual origin requested for the storefront.
- **Alternatives considered:** Keep the 520ms radial spread; use a geometric diagonal wipe; add a perpetual fluid animation outside the theme transition.
- **Reason and tradeoffs:** The original timing was hard to perceive and the radial front did not convey liquid movement. A longer, bounded shader sequence makes the state change legible without adding idle GPU work or changing page interaction. The fixed anchor matches the header toggle’s location and gives the transition a repeatable editorial gesture.
- **Affected files:** `components/ink-theme-transition.tsx`, `tests/e2e/theme-transition.spec.ts`, and `DESIGN.md`.
- **Reversible:** Yes; duration, anchor, directional bias, and layer strengths are isolated in the transition component.
- **Owner review before production:** Yes; confirm the motion budget on lower-end mobile hardware and keep reduced-motion behavior enabled.

### 2026-11-13 - Commit theme state only after the ink reveal completes
- **Decision:** Keep the current document theme as the visible base, capture a destination-theme clone, reveal that capture from the actual pointer coordinates, and commit `data-theme`/`flc-theme` only after the full reveal completion callback. Use the same two-layer contract for WebGL2 and CSS fallback paths.
- **Alternatives considered:** Switch the global theme before the animation; reveal an outgoing current-theme snapshot over the new DOM; use a fixed upper-right origin; duplicate the full application tree for both themes.
- **Reason and tradeoffs:** The previous early commit caused the destination to render immediately and the outgoing overlay to mask the wrong layer, producing a visible flash/reversal. The destination capture preserves the old theme outside the ink while keeping one live application tree. A clone capture costs a temporary bitmap, but avoids duplicate React trees and preserves existing state.
- **Affected files:** `components/ink-theme-transition.tsx`, `components/theme-toggle.tsx`, `app/globals.css`, `tests/e2e/theme-transition.spec.ts`, `DESIGN.md`, `IMPLEMENTATION_STATUS.md`, `docs/OVERNIGHT_IMPLEMENTATION_LOG.md`.
- **Reversible:** Yes; the lifecycle is isolated to the transition controller and can be reverted without changing theme tokens, persistence, catalog, authentication, checkout, inventory, or database behavior.
- **Owner review before production:** Yes, for final motion preference and testing on production-target mobile hardware; no business policy is changed.
