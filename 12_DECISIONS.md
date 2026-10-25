# Decision Register — FLC Decor

## Confirmed by owner
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
Codex: append entries using this template for each significant choice:

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

## Open business and production decisions
Keep a running list of settings requiring owner input before live launch. Their absence must not block local/demo implementation.
