# Final Audit Report — Fahad Laser / FLC Decor

**Audit date:** 2026-10-26 (Asia/Karachi)  
**Scope:** Repository documentation, Next.js application, route handlers, Prisma schema/migration, tests, local runtime smoke checks, dependency audit.  
**Assessment:** **Development demo verified; production readiness not achieved.**

## Executive assessment

The local synthetic storefront is runnable and the core demo checkout path is functional. The clean production build exposes 35 routes, the main customer pages render successfully, server pricing and stock validation work, and the demo checkout has deterministic idempotency and concurrency tests.

The project is not a complete implementation of the PRD/SRS launch scope. Customer authentication, sessions, MFA, email verification, admin authorization/MFA, admin CRUD, inventory adjustments, order management, media uploads/processing, persistent runtime storage, real guest tracking, rate limiting, CSRF, production observability and the required durability/failover controls are absent or represented only by schema/placeholders. Live checkout remains correctly blocked.

## Verification commands and evidence

Passed:

- `npm run lint`
- `npm run typecheck`
- `npm test` — 6 tests passed
- `npm run build` — clean Next.js 15.5.28 build, 35 routes
- `prisma validate` with `DATABASE_URL` supplied
- `prisma generate`
- HTTP smoke checks on a clean single server process

Not completed:

- Docker/PostgreSQL execution: Docker CLI exists, but the Docker daemon was unavailable (`docker_engine` pipe not found).
- Browser automation, screenshots, accessibility scans, mobile device emulation, visual regression, LCP/INP measurement and load/resilience testing: no browser/E2E/performance harness is declared or installed.

## Feature completion checklist

Status meanings: **Verified** means exercised or statically proven; **Partial** means demo/UI/schema support exists but the required production or full feature path is missing; **Not implemented** means no functional implementation was found; **Blocked** means intentionally fail-closed pending business/infrastructure decisions.

| Requirement | Status | Evidence / gap |
|---|---|---|
| FR-001 home/catalog discovery | Partial | Home, categories, featured pieces, editorial content and custom CTA render. WhatsApp remains unconfigured and sample CSS art is not final product media. |
| FR-002 two-level categories/admin placement | Partial | Prisma relations and category pages exist. No admin category/product CRUD or depth enforcement endpoint. |
| FR-003 product details/variants | Partial | Variant price, size, color and stock selection work. Gallery, thumbnails, zoom and real media are absent. |
| FR-004 search/filter same variant | Partial | Client filters now cover category, price bands, size, color and stock; same-variant matching is implemented. No server/API filters, arbitrary min/max fields, URL syncing or pagination. |
| FR-005 sorting | Partial | Featured, newest, price low/high and alphabetical controls exist. No server-side sorting or cursor pagination; full stable-ID tie breaking is not proven. |
| FR-006 variant pricing/inventory authority | Partial | Quote/order routes recalculate prices and validate stock against demo fixtures. No persistent database authority. |
| FR-007 shared media/archive snapshots | Not implemented | Schema models exist; no media reference management, archive flow or runtime snapshot persistence. |
| FR-008 guest/customer cart | Partial | Guest cart works in browser `localStorage`. No logged-in/server cart or server cart API. |
| FR-009 checkout fields/shipping gate | Verified for demo | Required contact/address fields render; shipping/tax remain visibly unconfigured. |
| FR-010 COD | Partial | COD demo option and demo order route work. Live COD is intentionally disabled. |
| FR-011 atomic order + stock + idempotency | Partial | In-memory lock validates all lines before mutation and tests concurrency. No PostgreSQL transaction, ledger, outbox or durable commit. |
| FR-012 idempotency | Partial | Replay/conflict and identity-scoped demo behavior tested. Map state is process-local and not failover/durable. |
| FR-013 acknowledged durability/fail closed | Blocked | Production checkout returns 503; no durable production adapter exists. |
| FR-014 COD stock release policy | Partial | No generic expiry release is implemented. Persistent reservation/ledger lifecycle is absent. |
| FR-015 order snapshots/totals | Partial | Demo order stores product/variant/unit price/quantity/subtotals. Shipping/tax total is null and persistence is absent. |
| FR-016 customer auth/sessions/reset | Not implemented | Login/register are demo forms with `alert()`; no auth API, cookies, reset flow or revocable sessions. |
| FR-017 customer TOTP | Not implemented | No enrollment, replay protection, recovery codes or MFA endpoints. |
| FR-018 admin TOTP/authorization/audit | Not implemented | `/admin` is an unauthenticated preview; no admin login, MFA, authorization middleware or audit writes. |
| FR-019 private guest tracking | Blocked/fail closed | Unverified lookup returns 503. No email challenge, confirmation endpoint or scoped capability issuance. |
| FR-020 admin catalog/inventory/orders | Not implemented | Dashboard preview is read-only; no CRUD, stock adjustment, order inspection workflow or audit ledger. |
| FR-021 order status transitions | Not implemented | Demo orders remain `RECEIVED`; no transition map or admin endpoint. |
| FR-022 COD fraud/rate limits | Not implemented | No progressive rate limiting, risk scoring or review challenge. |
| FR-023 secure image uploads | Not implemented | No upload intents, content sniffing, decode/re-encode, EXIF stripping, quarantine or storage adapter. |
| FR-024 shared media cleanup | Not implemented | `MediaAsset` lifecycle fields exist only in schema; no reference-safe deletion job. |
| FR-025 WhatsApp custom requests | Blocked/configurable | Contact is read from `WHATSAPP_CONTACT`; `NOT_CONFIGURED` correctly renders no outbound link. |
| FR-026 theme/accessibility/reduced motion | Partial | Light/dark toggle, semantic forms and reduced-motion CSS exist. OS-default theme, automated WCAG checks, focus-trap testing and full mobile validation are absent. |
| FR-027 3D/scroll enhancement | Partial | Static CSS showcase and reduced-motion fallback exist. No actual interactive 3D, mouse/touch tilt, lazy WebGL or scroll reveal implementation. |

## Customer journey audit

Verified on a clean single `next dev` process:

1. `/` → 200
2. `/categories/wall-accents` → 200
3. `/shop` → 200
4. `/products/sunline-arch` → 200
5. `/cart` → 200
6. `/checkout` → 200
7. `POST /api/checkout/orders` → 201 with synthetic order
8. `/order/success/{publicOrderNumber}` → 200
9. Same idempotency key → replay response 200
10. Same key with changed body → 409
11. `/track-order` → 200, but actual verification is not configured
12. `GET /api/orders/{number}` without a verified capability → 503, fail closed

The browser-side `localStorage` cart interaction was not automated because no browser/E2E runner is installed. The server-side order path and page routes were tested independently.

## Administrator audit

| Surface | Result |
|---|---|
| Dashboard | Preview page renders 200 and displays synthetic order summaries. |
| Product management | Not implemented; no `/admin/products` routes or mutation handlers. |
| Category management | Not implemented; only Prisma schema and public category pages exist. |
| Variant/inventory management | Not implemented; no adjustment endpoint or audit ledger writes. |
| Order management | Not implemented; no list/detail/transition API. |
| Image uploads | Not implemented; no upload UI or processing/storage adapter. |
| Admin authentication/MFA | Not implemented; `/admin` is accessible without a session. |

Reproduction: request `GET /admin` with no cookie/session; it returns 200 because the page is a labeled synthetic preview, not a protected admin surface. This is a production blocker if the route is ever connected to real data.

## Authentication, authorization and privacy

Not passing:

- No customer registration/login/logout/password reset API.
- No server-managed session cookies, rotation, revocation, CSRF protection or account authorization.
- No customer or administrator TOTP implementation.
- No recovery-code hashing or MFA replay prevention.
- No email provider or guest verification challenge.
- No authorization middleware for privileged routes.
- No rate limiting or fraud controls.

The audit fix changed guest order lookup to a generic 503 until a real email-verified capability exists. That prevents the previous enumeration risk but does not satisfy the feature requirement.

## Checkout, concurrency and idempotency

Verified:

- Server ignores client totals and looks up authoritative variant prices.
- Invalid/out-of-stock variants return controlled errors.
- Duplicate variant lines are aggregated before quote/stock checks.
- In-memory mutation lock prevents two concurrent demo requests from reserving the same last unit.
- Same identity/key/body replays the original result.
- Same identity/key with changed payload returns 409.
- Same key across different checkout identities is scoped separately.
- Production `POST /api/checkout/orders` returns 503 even when the demo flag is present.

Not passing for production:

- No PostgreSQL transaction or conditional row update.
- No durable idempotency record or unknown-commit recovery.
- No inventory ledger/outbox write.
- No acknowledged durability or failover validation.
- Order data and stock reset when the server process restarts.

## Security findings

### SEC-001 — Critical — Production identity/admin controls absent

**Status:** Open / production blocker.  
**Reproduction:** `GET /admin` without authentication returns 200; `/account/login` and `/account/register` only show demo forms; no auth routes exist under `app/api`.  
**Impact:** No real user ownership, admin MFA, session revocation, CSRF protection or privileged authorization.  
**Recommended fix:** Implement the documented auth modules against PostgreSQL with memory-hard password hashing, secure session cookies, CSRF, mandatory admin TOTP, optional customer TOTP, recovery codes, authorization checks and audit events.

### SEC-002 — High — Runtime persistence and durable checkout absent

**Status:** Open / production blocker.  
**Reproduction:** `lib/demo-store.ts` stores orders, idempotency and inventory in process-global Maps; restart the server and the success/order state is gone.  
**Impact:** Data loss, duplicate risk across instances, no RPO/RTO or acknowledged-order durability.  
**Recommended fix:** Replace the demo adapter with Prisma/PostgreSQL transactions, conditional stock updates, durable idempotency rows, inventory ledger and outbox, then test failover/restore.

### SEC-003 — High — Guest email verification is missing

**Status:** Fail-closed but incomplete.  
**Reproduction:** `GET /api/orders/{number}` returns `503 GUEST_TRACKING_NOT_CONFIGURED` for both valid and invalid numbers.  
**Impact:** Privacy is protected now, but the required tracking feature is unavailable.  
**Recommended fix:** Add rate-limited request/confirm endpoints, non-enumerating email delivery, expiring single-use verifier hashes and scoped capability tokens.

### SEC-004 — High — Admin preview is not an authorization boundary

**Status:** Open for production use; synthetic data only today.  
**Reproduction:** Load `/admin` without MFA/session.  
**Impact:** Safe only while it contains no real data; unsafe if connected to production data.  
**Recommended fix:** Gate the route and every admin API behind session + mandatory TOTP + authorization checks; keep a separate non-sensitive demo preview if desired.

### SEC-005 — High/Critical dependency advisories

`npm audit --json` reported 8 advisories: 2 moderate, 4 high and 2 critical. Notable chains include `vitest`/`tinypool` critical prototype-pollution/RCE advisories, `postcss` high path-traversal/source-map advisories, Prisma 6.x/`deepmerge-ts` high advisories, and Next 15.x transitively affected through PostCSS. The registry reports major-version fixes for some packages (`vitest@5.0.5`, `prisma@7.10.1`, `next@16.4.3`).

**Recommended fix:** Review upgrade compatibility, update to patched versions, rerun tests/build/audit, and pin a reviewed lockfile. Do not apply major upgrades blindly during production preparation.

### SEC-006 — High — Upload/media security controls absent

**Status:** Open / production blocker.  
**Reproduction:** No media upload route or processing code exists; only Prisma media models are present.  
**Recommended fix:** Implement authenticated upload intents, MIME sniffing, size/pixel/decompression limits, decode/re-encode, EXIF stripping, quarantine, non-executable delivery and reference-safe 30-day orphan cleanup.

### SEC-007 — Medium — Abuse controls and observability absent

No rate limiting, request IDs, structured redacted logs, metrics, traces, audit events, alerting or incident hooks were found. Add these before exposing checkout or auth publicly.

## UI/UX findings

Verified from source/build/runtime:

- Warm ivory/charcoal/brass design tokens and responsive CSS exist.
- Light/dark toggle exists.
- Reduced-motion media query disables transforms/transition effects.
- Semantic links, labels, buttons, fieldsets and error/status regions are used in key flows.
- No copied reference-store assets or fake reviews were found; sample artwork is explicitly labeled.

Not verified or incomplete:

- No screenshot review at 320/375/390/768/1024/1440px or 200% zoom.
- No automated contrast, keyboard, screen-reader or WCAG scan.
- Theme initializes to light rather than OS preference; persisted theme is not applied before hydration.
- Product detail has one CSS artwork panel, not an image gallery with thumbnails/zoom.
- Mobile filter drawer, sticky mobile add-to-cart, URL-synced filters and pagination are absent.
- 3D showcase is a static CSS composition, not an interactive 3D/tilt implementation.
- New-arrivals carousel and trust/FAQ merchandising section are not fully implemented as specified.
- Account/admin flows are intentionally motion-light but are placeholders.

## Performance findings

Verified:

- Production build completes cleanly.
- First-load shared JS is approximately 103 kB in the Next build output.
- CSS sample artwork avoids image transfer cost in the demo.
- No external font import remains in the final CSS.

Not verified:

- LCP p75 <= 2.5s, search p95 <= 500ms, checkout p95 <= 2s.
- 1,000-concurrent mixed visitor load or p99 behavior.
- CLS/INP/long-task measurements.
- Database query plans, CDN behavior or image processing performance.

Operational note: running multiple Next dev/start processes concurrently against the same `.next` directory caused React client-manifest 500s during the audit. Reproduction is to run dev and production servers simultaneously in the same checkout. Recommended fix is procedural isolation: one process per checkout/build directory, or separate build directories in CI.

## Remaining bugs and incomplete features

| ID | Severity | Reproduction | Recommended fix |
|---|---|---|---|
| BUG-001 | Critical | Open `/admin` without a session; it renders. | Implement admin auth/MFA/authorization or keep the route permanently demo-only and isolated. |
| BUG-002 | High | Restart the app after a demo order; success/order state disappears. | Persist orders, stock and idempotency in PostgreSQL transactionally. |
| BUG-003 | High | Submit `/api/orders/{number}` without a capability; receives 503 because email verification is absent. | Implement verified guest email challenge/capability flow. |
| BUG-004 | High | Attempt customer login/register; button shows a demo alert and no account is created. | Implement customer auth, sessions, reset and MFA. |
| BUG-005 | High | Attempt to upload/manage product media; no route/UI exists. | Implement secure media lifecycle and admin UI. |
| BUG-006 | High | Attempt inventory adjustment/order status transition; no endpoint exists. | Implement audited admin operations and approved transition map. |
| BUG-007 | High | Run `npm audit`; 8 advisories are reported. | Patch/upgrade dependencies and rerun the audit. |
| BUG-008 | Medium | Open with OS dark mode and no stored preference; page starts light. | Resolve OS preference before hydration and persist safely. |
| BUG-009 | Medium | Compare product detail to UI spec; no gallery/zoom/thumbnail set exists. | Add owner-provided/licensed media and accessible gallery controls. |
| BUG-010 | Medium | Compare catalog to UI spec; no URL sync/mobile drawer/pagination. | Add responsive filter drawer, query-state sync and pagination/load-more. |
| BUG-011 | Medium | Run Docker Compose with Docker daemon stopped. | Start Docker daemon; then run migration/seed integration checks. |
| BUG-012 | Low | Run visual/performance/a11y checks; no harness/scripts are present. | Add Playwright/browser, axe, screenshot and Lighthouse/load CI jobs. |

## Production-readiness blockers

Before live orders, all of the following remain mandatory:

- Approved shipping, courier, tax, returns, cancellation, refund, order-status, retention and public-contact policies.
- Real PostgreSQL persistence with transaction durability, HA/failover, backups, restore drills, RTO/RPO evidence and key recovery.
- Customer auth, admin auth, mandatory admin TOTP, optional customer MFA, secure sessions, CSRF and authorization.
- Email provider and verified guest tracking/password reset flows.
- Secure media storage and processing with reference-safe cleanup.
- Rate limiting, COD fraud controls, structured privacy-safe observability and audit logs.
- Patched dependencies and security scanning in CI.
- Browser E2E, accessibility, visual, mobile, performance and resilience tests.
- Separate dev/staging/production configuration and managed secrets; no real customer data in the demo.

## Final development-readiness assessment

**Local demo:** Ready for continued development and synthetic journey demonstration.  
**Feature-complete against the full SRS:** No.  
**Secure for real customer data or live COD:** No.  
**Production launch:** Blocked by the findings above.

The prior implementation status has been updated to reflect this audit. Safe fixes made during the audit are recorded in `12_DECISIONS.md`, including production fail-closed checkout, scoped idempotency, fail-closed guest lookup, same-variant catalog filters, category routes and a complete Prisma migration model.

## Post-audit instruction pass

The follow-up implementation instruction added and verified `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/SECURITY.md`, `docs/OPERATIONS.md`, `docs/DECISIONS.md`, `PRODUCTION_READINESS.md`, local Git initialization, baseline security headers, no-index demo robots, non-sensitive sitemap routes, and global loading/error states. The final build remains green at 37 routes. No GitHub remote, external account, production credential, deployment or push was created.
