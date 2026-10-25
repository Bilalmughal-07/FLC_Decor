# FLC Decor — Codex Master Audit Remediation & Production Launch Prompt

**Source of truth:** `FINAL_AUDIT_REPORT.md` (audit dated 2026-10-26). Also read `FLC_Decor_Codex_Implementation_Instructions.md`, current PRD/SRS, `12_DECISIONS.md`, schema, migration, tests and actual repository code. **Audit claims are hypotheses to verify against current code; do not claim they are already fixed.** If documents disagree, log the conflict and ask for a business decision; preserve the stricter safety constraint until resolved.

## Your mandate

You are the lead engineer responsible for bringing this existing Next.js 15.5.28 FLC Decor laser-cut decorative-products store from **synthetic development demo** to **secure, operable production**. Do not rewrite the app from scratch, delete working features, invent business rules, or launch without sign-off. The audit reports 35 routes, 6 passing tests, lint/typecheck/build passing, and a Prisma schema, but **no persistent runtime checkout**, no real identity/admin protection, no admin CRUD, no secure media, and inadequate E2E/operational testing. Production checkout currently fails closed with 503; **keep that guard until all launch gates pass**.

Business scope: Pakistan, PKR, guest checkout and COD at launch; two-level admin-managed categories, one primary category per product plus optional additional categories; variant-level pricing and inventory; featured-first then newest ordering; product search/filter/sort; custom requests redirect to configured WhatsApp; online payments deferred. Follow actual approved SRS if it specifies additional mandatory capabilities (e.g., customer MFA). Do not silently remove those requirements to simplify implementation.

## Working agreement / workflow

1. Inspect repository, `package.json`/lockfile, `app/`, `lib/`, `prisma/`, test scripts, env files, `FINAL_AUDIT_REPORT.md`, PRD/SRS and prior decisions. Produce `docs/REMEDIATION_BASELINE.md` mapping **FR-001 through FR-027**, **BUG-001 through BUG-012**, **SEC-001 through SEC-007**, and production blockers to actual files and test evidence. Preserve audit terminology and statuses (Verified/Partial/Not implemented/Blocked).
2. Establish `docs/DECISION_REGISTER.md` listing all missing owner approvals. Do not guess shipping zones/fees, courier, tax applicability, returns/refunds/cancellations, order-status transitions, reservation release rules, contact email, WhatsApp number, privacy retention, required RPO/RTO, authentication requirements or paid provider plan. Safe, configurable defaults may be implemented only if they **fail closed** and are documented.
3. Work in phases below, committing coherent, reversible changes. After each phase run lint, typecheck, relevant tests, production build, and migration checks. Record command, environment, exit status, date, and logs in `docs/VERIFICATION_EVIDENCE.md`. Do not report a pass unless executed. Stop on blockers and state exactly what input/access is needed.
4. No GitHub repository exists yet. Initialize Git locally only if needed and safe; create `.gitignore` and `.env.example`, ensure no secrets are committed. Do **not** claim CI is active or create a remote repository without owner authorization. Prepare GitHub Actions workflows for later activation; local equivalent checks must run meanwhile.
5. Do not use real customer data or enable production checkout during development. Separate development, staging, production and their credentials. Prefer PostgreSQL on Supabase, R2 for media, and Cloudflare Workers only after checking actual Next.js/Prisma/runtime compatibility. If incompatible, propose a documented minimal alternative for approval rather than forcing an untested migration. Use official current documentation and note verified versions.
6. For every finding, maintain a remediation ledger: ID, severity, existing evidence, code change, migration, automated test, manual verification, residual risk, status, commit. Never mark 'fixed' merely because a file was created.

## Phase 0 — Environment, dependencies and baseline (SEC-005, BUG-007, BUG-011)

- Reproduce existing clean build and six tests; identify what they actually test. Confirm only one Next server uses each `.next` directory; isolate dev/prod/CI builds.
- Run `npm audit --json`, record dependency tree, patch advisories including audit-noted vitest/tinypool, PostCSS, Prisma/deepmerge-ts and Next chains. Upgrade major versions in controlled steps with compatibility review, lockfile and regression tests; do not assume reported version numbers remain current.
- Verify Docker daemon; start a disposable PostgreSQL test instance using Docker Compose when available. If Docker cannot run, use an approved external disposable PostgreSQL database and explicitly mark any missing integration evidence. Never substitute SQLite or mocks for PostgreSQL concurrency tests.
- Add reproducible scripts for lint, typecheck, unit, integration, E2E, audit, migration check and build. Set up pre-commit or CI checks without requiring a remote repo.

**Exit gate:** baseline commands documented; high/critical exploitable production dependency advisories resolved or explicitly blocked; real PostgreSQL available for integration testing; no secret leakage in Git.

## Phase 1 — Production database and durable commerce (SEC-002, BUG-002; FR-002/006/007/011/012/013/014/015)

- Review existing Prisma schema and migration; normalize products, two-level categories, product-category join (exactly one valid primary), variants/SKUs, media references, customers/guest identities, addresses/order delivery snapshots, orders/items, status history, inventory balances and immutable movement ledger, idempotency keys, admin audit and transactional outbox. Add constraints, foreign keys, indexes, monetary integer-minor-unit or precise NUMERIC PKR representation, immutable order-item price snapshots. Enforce category depth and primary membership reliably, including concurrent edits.
- Create versioned forward migrations with safe deployment and rollback/forward-fix notes. Keep seed fixtures dev-only. Set up pooled runtime connections and separate migration connection appropriate to chosen deployment; never expose privileged credentials client-side.
- Replace `lib/demo-store.ts` process-global Maps for production paths with real repository/services. Demo adapter may remain isolated behind a strict dev-only flag; never let production silently fall back to demo.
- Implement authoritative server-side quote and checkout: aggregate duplicate variant lines, validate product/variant active status, recalculate unit prices/shipping/tax only from approved server rules, and perform atomic order + items + inventory movement + status event + durable idempotency + outbox in a PostgreSQL transaction. Prevent overselling via conditional updates/row locks. Scope idempotency to verified identity or safely derived guest checkout identity; same key + same payload returns same committed order, same key + different payload returns 409. Handle unknown-commit retries and process restarts without duplicate orders. No network calls inside transaction.
- Define stock reservation/deduction and cancellation release according to owner-approved policy; make changes idempotent and audited. Preserve fail-closed behavior for unconfigured shipping/tax and production checkout.
- Integrate read models for catalog, product details, stock and success pages with database records. Ensure order confirmation is durable and cannot be read by arbitrary order number.

**Exit gate:** real PostgreSQL tests prove 2+ concurrent requests for last unit result in exactly one accepted order; restart/redeploy preserves order and idempotency; replay/conflict behavior works across separate app processes; injected transaction failure leaves no partial order/stock mutation; prices cannot be manipulated; invalid categories rejected; migrations work on clean and populated staging databases.

## Phase 2 — Authentication, authorization and private order tracking (SEC-001/003/004; BUG-001/003/004; FR-016/017/018/019)

- Implement SRS-required customer registration/login/logout/reset, email verification, revocable sessions, secure httpOnly/SameSite/Secure cookies, rotation, account ownership checks and CSRF protections as appropriate. Choose **one** coherent identity architecture (Supabase Auth or custom auth) after reviewing SRS; do not combine incompatible session models. If custom passwords are required, use vetted memory-hard hashing and safe recovery flows.
- Implement mandatory admin MFA (TOTP with replay protection and hashed recovery codes), required customer TOTP and enrollment/recovery as specified in SRS. Provision admin accounts through a secure controlled process, not public registration. Require server-side RBAC for every admin API and page, not just navigation visibility. Log privileged actions with actor and request IDs, without sensitive secrets.
- Remove the unauthenticated `/admin` exposure for real data; redirect unauthenticated users to login or show a separate synthetic public preview with no production queries.
- Implement guest tracking using rate-limited, non-enumerating email verification challenge; hash single-use expiring challenge tokens; issue narrowly scoped, short-lived capability; do not reveal customer/order data for guessed numbers. Implement secure customer-owned order lookup.

**Exit gate:** unauthenticated requests cannot retrieve real `/admin` or any admin API; authenticated non-admin gets 403; admin without completed MFA is denied; revoked/expired sessions fail; CSRF attempts fail; brute-force protections exercised; guest tracking cannot enumerate orders; password-reset and MFA recovery tests pass.

## Phase 3 — Admin CRUD, stock, orders and media (SEC-006; BUG-005/006; FR-002/007/020/021/023/024)

- Build accessible admin interfaces and APIs for categories (two levels), products, variants, prices, stock, featured settings/ordering as actually approved, draft/active/archive, image management, order lists/details and audited status transitions. Validate payloads server-side; use pagination and concurrency-safe updates. Avoid hard deletion of entities referenced by historical orders.
- Add audited inventory adjustments with reason, actor, timestamp and movement ledger; no direct unsafe stock overwrite. Document and enforce legal status transitions and cancellation restock policy once owner-approved.
- Build secure R2 upload pipeline: authenticated intent, size/type limits, MIME sniffing, pixel/decompression bounds, safe decode/re-encode, EXIF stripping, quarantine/scanning policy, private upload permissions, non-executable public delivery, stable references, archive snapshots, and reference-safe orphan cleanup after the specified 30-day period. Do not permit path traversal or arbitrary external URLs.

**Exit gate:** admin CRUD persists across restart; unauthorized mutations rejected; category-depth and SKU constraints enforced; inventory ledger balances reconcile; forbidden order transitions rejected; image abuse tests (wrong MIME, oversized, decompression bomb, EXIF, malicious filename, unreferenced cleanup) pass; historic order snapshots unchanged after catalog edits.

## Phase 4 — Fraud, security controls and observability (SEC-007, FR-022)

- Apply durable/distributed rate limiting to login, register, reset, guest lookup, quote, checkout and upload; account for proxy headers only from trusted infrastructure. Add COD abuse controls (progressive limits, review flags, duplicate contact/address signals) without silently rejecting legitimate buyers or exposing sensitive data. Define manual review process.
- Add request IDs, structured privacy-redacted logs, audit trail, operational metrics, exception reporting and alert thresholds for checkout failures, database outages, queue/outbox backlog and repeated fraud attempts. Do not log full addresses, tokens, passwords or sensitive verification details.
- Threat-model authentication, authorization, checkout, price tampering, inventory race, replay, SSRF, uploads, CSRF, XSS, injection, and secret exposure. Set security headers, input limits, appropriate CORS and CSP; verify real middleware and endpoint enforcement.

**Exit gate:** rate limits work across instances/restarts; high-risk routes cannot bypass checks; privacy review of sample logs passes; alerts are test-triggered; threat-model mitigations mapped to tests.

## Phase 5 — Complete customer features and visual/accessibility gaps (FR-001/003/004/005/008/009/010/025/026/027; BUG-008/009/010/012)

- Replace placeholder CSS product art with owner-provided/licensed product media, gallery/thumbnails/zoom and responsive optimized image variants. No fake reviews or unlicensed assets.
- Implement product search/filter/sort with server-side querying, same-variant matching, arbitrary min/max where required, URL-synced state, deterministic stable-ID tie breaks, pagination/load more and responsive mobile filter drawer. Featured-first then newest default must be deterministic. Make sure price/stock shown matches chosen variant.
- Preserve guest localStorage cart; add SRS-required logged-in/server cart and safe cart merging with server-side revalidation. Provide accessible sticky mobile add-to-cart, usable checkout errors, confirmed COD choice, and unconfigured shipping/tax fail-closed messaging.
- Add OS-preference theme initialization before hydration, persistent toggle, accessible focus traps, keyboard navigation, contrast, 200% zoom, reduced motion, and screen-reader checks. Implement approved 3D/tilt/scroll enhancement with lazy loading and non-WebGL/reduced-motion fallback; do not compromise LCP/INP. Add specified new-arrivals carousel, FAQ/trust merchandising without unsupported claims.
- Configure WhatsApp redirect only with approved contact number; no in-site custom order workflow at launch.

**Exit gate:** browser E2E passes key customer journeys on 320/375/390/768/1024/1440px and 200% zoom; keyboard-only and axe checks pass with reviewed exceptions; URL filter state is shareable and stable; product gallery accessible; mobile cart/checkout usable; reduced-motion/OS theme verified.

## Phase 6 — Reliability, backup, deployment and operations (production blockers)

- Obtain approved provider plan and production architecture. Validate Cloudflare Workers compatibility with actual Next.js runtime/Prisma and image libraries. If incompatible, document alternative and await approval. Keep secrets in provider secret manager; distinct dev/staging/prod environments and databases; secure migrations and least-privilege roles.
- Set up encrypted, access-controlled, automated off-site PostgreSQL backups, separate R2 asset backups/versioning or recoverability, restore drill to isolated database, retention and key-recovery procedure. Measure and document owner-approved RPO/RTO; don't assume a provider free tier guarantees availability or backups.
- Implement health checks, deployment rollback/forward-fix, incident response/runbook, alert ownership, outbox retry and reconciliation, graceful failure for DB/email/R2 outages. Never acknowledge a successful order before durable commit.
- Create staging and production release checklist; configure domain/HTTPS, mail DNS if needed, privacy/terms/contact, analytics consent if applicable. Production checkout remains disabled until the owner approves policies and all technical launch gates are evidenced.

**Exit gate:** staging deployment and real service integration proven; restore drill produces matching order/ledger data and recoverable images; failover/unknown commit tests documented; secrets scanning passes; alert and rollback drills demonstrated; written go/no-go approval recorded.

## Phase 7 — E2E, performance, CI and release gates (BUG-012)

- Add Playwright browser E2E (cart, guest COD, registered customer, admin MFA, catalog, media, order tracking), axe accessibility, screenshot/visual review, Lighthouse/Web Vitals, and realistic load/resilience tests against staging. Run tests on supported desktop/mobile viewport sizes.
- Measure and report audit-stated targets: LCP p75 <= 2.5s, search p95 <= 500ms, checkout p95 <= 2s and 1,000-concurrent mixed visitors **only if still approved in SRS**; if budget/platform cannot meet them, do not fake a pass—report evidence, cost, bottleneck and seek target revision. Measure CLS/INP, query plans and p99 under representative workload.
- Prepare GitHub Actions workflows for dependency audit, lint, typecheck, unit, PostgreSQL integration, E2E, migration checks and build, with branch protection instructions. Without a remote repository, report workflows as **prepared, not verified on GitHub**. Do not require public access or commit secrets.

**Exit gate:** all required tests executed in reproducible staging, no unresolved critical/high security findings, evidence for load targets or explicitly approved exception, deploy/rollback and backup drill verified.

## Traceability checklist — do not skip any audit item

- **FR-001** Home/catalog and real media — Phase 5
- **FR-002** Category depth and admin placement — Phases 1, 3
- **FR-003** Product detail/variants/gallery — Phases 1, 5
- **FR-004** Search/filter same variant/URL/pagination — Phase 5
- **FR-005** Sorting/determinism — Phase 5
- **FR-006** Authoritative variant pricing/inventory — Phase 1
- **FR-007** Shared media/archive snapshots — Phases 1, 3
- **FR-008** Guest/customer cart — Phase 5
- **FR-009** Checkout fields/shipping gate — Phases 1, 5, owner decision
- **FR-010** Live COD — Phase 1, launch gate
- **FR-011** Atomic order/stock/idempotency — Phase 1
- **FR-012** Durable idempotency — Phase 1
- **FR-013** Acknowledged durability/fail closed — Phases 1, 6
- **FR-014** COD stock release policy — Phase 1, owner decision
- **FR-015** Snapshots/totals — Phase 1
- **FR-016** Customer auth/sessions/reset — Phase 2
- **FR-017** Customer TOTP — Phase 2
- **FR-018** Admin TOTP/authorization/audit — Phase 2
- **FR-019** Private guest tracking — Phase 2
- **FR-020** Admin catalog/inventory/orders — Phase 3
- **FR-021** Order transitions — Phase 3, owner decision
- **FR-022** COD fraud/rate limits — Phase 4
- **FR-023** Secure uploads — Phase 3
- **FR-024** Shared media cleanup — Phase 3
- **FR-025** WhatsApp custom requests — Phase 5, owner contact
- **FR-026** Theme/accessibility/reduced motion — Phase 5
- **FR-027** 3D/scroll enhancement — Phase 5
- **BUG-001** Unprotected admin — Phase 2
- **BUG-002** Ephemeral order/stock — Phase 1
- **BUG-003** Guest lookup 503 — Phase 2
- **BUG-004** Fake customer login — Phase 2
- **BUG-005** Missing media management — Phase 3
- **BUG-006** Missing inventory/order actions — Phase 3
- **BUG-007** Dependency advisories — Phase 0
- **BUG-008** OS theme default — Phase 5
- **BUG-009** Missing gallery — Phase 5
- **BUG-010** Mobile/URL/pagination — Phase 5
- **BUG-011** Docker daemon unavailable — Phase 0
- **BUG-012** Missing browser/performance harness — Phases 5, 7
- **SEC-001** Identity/admin controls — Phase 2
- **SEC-002** Persistence/durability — Phase 1
- **SEC-003** Guest email verification — Phase 2
- **SEC-004** Admin preview boundary — Phase 2
- **SEC-005** Dependency advisories — Phase 0
- **SEC-006** Media security — Phase 3
- **SEC-007** Abuse/observability — Phase 4

## Required output artifacts

Create and maintain:
- `docs/REMEDIATION_BASELINE.md` — exact audit mapping to source files.
- `docs/REMEDIATION_TRACKER.md` — every FR/BUG/SEC item with owner, status, tests and evidence.
- `docs/DECISION_REGISTER.md` — unresolved business decisions and safe defaults.
- `docs/ARCHITECTURE.md` and `docs/ERD.md` — deployed data and trust boundaries.
- `docs/SECURITY_THREAT_MODEL.md` — risks and mitigations.
- `docs/VERIFICATION_EVIDENCE.md` — actual commands, outputs, environment, screenshots/links.
- `docs/BACKUP_RESTORE_RUNBOOK.md`, `docs/DEPLOYMENT_RUNBOOK.md`, `docs/INCIDENT_RUNBOOK.md`.
- `PRODUCTION_READINESS.md` — binary go/no-go criteria with links to evidence.
- `.env.example`, reviewed migrations, integration/E2E tests, and prepared CI workflows.

## Final reporting contract

At the end of **each phase**, report: completed IDs; exact changed files; migrations; executed test commands and results; screenshots/logs if relevant; open vulnerabilities; owner decisions required; rollback plan; and whether production checkout is still blocked.

At the end of **all phases**, provide a table with each of the 27 FRs, 12 BUGs and 7 SECs and status **PASS / FAIL / BLOCKED / NOT TESTED** with a specific evidence link. Do not conflate 'implemented' with 'verified'. Report real provider costs and tradeoffs separately from measured technical readiness. If a test cannot run because Docker, credentials, external providers or GitHub are unavailable, mark it BLOCKED, never PASS.

**Absolute release rule:** Do not enable live COD checkout, customer accounts handling real personal data, or production admin actions until required owner decisions, security controls, durable order processing, restore tests, and go/no-go sign-off are complete. Do not call the website production-ready based on a successful build or synthetic tests alone.

## First action now

**Do not start broad code changes immediately.** First read the audit and existing repo, produce the baseline traceability ledger and decision register, verify environment/dependencies, and present the proposed Phase 0–1 change plan with exact file/migration impacts. Then proceed with safe, testable implementation increments; pause for explicit approval only for destructive operations, unapproved business policies, paid service provisioning, or major architecture changes.
