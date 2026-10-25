# FLC Decor — Codex Implementation Instructions

**Purpose:** Build and verify a production-ready e-commerce website for Fahad Laser & Company (FLC), a small laser-cut decorative products business in Pakistan.

**Important starting condition:** The project has **no GitHub repository yet**. Do not assume a remote repository exists. Inspect the local project first; if none exists, scaffold it only after confirming the directory. Initialize local Git, add `.gitignore`, and make an initial commit. Provide instructions for creating a private GitHub repository and connecting it; do not claim a remote was created unless actually authenticated and completed. Never push secrets.

## Operating rules for Codex

1. Begin with a repository/filesystem audit and a concise plan. Preserve any existing code and UI.
2. Implement in small phases with tests and verification after each phase; report completed, pending, and blocked items.
3. Ask for approval before destructive operations, provisioning paid services, creating external accounts, changing major architecture, or deploying publicly.
4. Do not fabricate test results, provider compatibility, security guarantees, or deployment success.
5. Use up-to-date official documentation to verify service limitations, pricing, runtime support, and SDK compatibility before finalizing deployment decisions.
6. Keep an updated `PRODUCTION_READINESS.md` with checkboxes, evidence, blockers, and launch gates. A checked item must have verification evidence.
7. Do not treat this instruction file as permission to access production credentials or commit them.

## Confirmed product scope

- Responsive, mobile-first storefront for laser-cut decorative products.
- Admin-managed two-level category hierarchy (parent and subcategory only).
- Each product has one primary category and optionally additional categories.
- Catalog search, filters, and sorting; default featured-first then newest ordering. Confirm how featured status/priority is administered before implementing special controls.
- Product detail pages, images, availability, and cart.
- Guest checkout and **Cash on Delivery (COD)** at launch.
- Admin management for products, categories, inventory, and orders.
- Custom-order requests **redirect to WhatsApp** at launch; do not build a custom-order workflow.
- JazzCash, bank transfer, and card payments are **future integrations**, not launch features.
- Do not invent shipping charges, return rules, inventory policy, customer messaging, or other unresolved business requirements. Record decisions needed and ask focused questions.

## Architecture decisions and validation gates

**Preferred baseline (verify compatibility before committing):**

- Next.js + TypeScript + Tailwind CSS.
- PostgreSQL hosted by Supabase.
- Prisma ORM **only if** verified compatible with the selected runtime, driver, pooling, and migration workflows. If not, propose a minimal alternative with tradeoffs.
- Supabase Auth for admin identity; guest checkout does not require accounts.
- Cloudflare R2 for product images, with server-side upload authorization.
- Cloudflare Workers for deployment **only if** the chosen Next.js features and packages are compatible. Otherwise propose a commercially permitted alternative.
- Single deployable application unless evidence justifies splitting services.

Document trust boundaries, server-only secrets, external dependencies, data flow, and how migrations run separately from application traffic. Never expose privileged Supabase or database keys in client bundles.

## Phase 0 — Local setup and Git/GitHub

- [ ] Inspect current files, package manager, environment, dependencies, and existing routes.
- [ ] Identify whether the app already exists; do not overwrite working code.
- [ ] If needed, scaffold the Next.js TypeScript project with Tailwind CSS and linting.
- [ ] Initialize local Git (`git init`) if not already initialized.
- [ ] Create `.gitignore` covering `.env*` except safe examples, dependencies, builds, logs, local dumps, and generated secrets.
- [ ] Add `.env.example` with variable names and safe placeholders only.
- [ ] Run secret scanning/checks before the first commit.
- [ ] Make the initial local commit after verifying ignored files.
- [ ] Explain how to create a **private** GitHub repository, add `origin`, and push the initial branch after user approval/authentication.
- [ ] Configure branch protection, pull-request checks, and CI after the remote exists.
- [ ] Add README with setup commands, environment requirements, and architecture summary.

## Phase 1 — Requirements and architecture audit

- [ ] Inventory implemented pages, APIs, data models, and admin workflows.
- [ ] Identify missing functional requirements and unresolved decisions.
- [ ] Document the preferred hosting runtime and validate compatibility with official docs.
- [ ] Draw or describe architecture, data flow, authentication boundary, and failure modes.
- [ ] Define separate local, staging, and production environments.
- [ ] Produce an implementation plan with dependencies and explicit approval gates.

## Phase 2 — PostgreSQL schema and migrations

Design a normalized schema with justified entities; do not create tables without a business purpose.

- [ ] Admin profiles/roles mapped securely to authentication identities.
- [ ] Categories with parent/subcategory maximum depth enforced reliably.
- [ ] Products with unique SKU/slug, status (draft/active/archived), primary category.
- [ ] Product-category join table for optional additional categories; enforce consistency.
- [ ] Product images with object keys, ordering, alt text, and ownership.
- [ ] Variants only if catalog requirements warrant them.
- [ ] Inventory records and auditable stock movements.
- [ ] Guest customer/contact and shipping address snapshots.
- [ ] Orders, immutable order-item snapshots, status history, and audit logs.
- [ ] Checkout idempotency keys with uniqueness and safe retry semantics.
- [ ] Primary keys, foreign keys, unique, NOT NULL, and CHECK constraints.
- [ ] Explicit ON DELETE rules; prevent accidental loss of historical orders.
- [ ] Store PKR money in integer paisa or precise NUMERIC; **never floating point**.
- [ ] Store item unit price, quantity, discount, shipping, subtotal, total, and currency snapshots.
- [ ] Index status, category joins, slug/SKU, order dates, and common filters where justified.
- [ ] Implement suitable PostgreSQL search and pagination; avoid premature external search services.
- [ ] Create version-controlled forward migrations and a tested rollback/recovery strategy.
- [ ] Create deterministic **development-only** seed data.
- [ ] Document schema and entity relationships.

## Phase 3 — Backend, orders, and inventory correctness

- [ ] Implement typed services/APIs for catalog, categories, products, cart validation, checkout, orders, and admin operations.
- [ ] Validate and normalize inputs on the server (including Pakistani phone/address fields as appropriate).
- [ ] Recalculate all cart prices and totals server-side; reject client-supplied prices.
- [ ] Use database transactions for checkout, order items, stock changes, and status history.
- [ ] Define stock reservation/deduction/release policy **with user approval** before implementing.
- [ ] Prevent overselling using atomic conditional updates or row locks; test simultaneous last-unit purchases.
- [ ] Prevent duplicate orders using idempotency keys, unique constraints, and documented retry behavior.
- [ ] Ensure rollback on any checkout failure; never leave partial orders.
- [ ] Define allowed order-status transitions and admin override/audit policy.
- [ ] Avoid external network calls inside open database transactions.
- [ ] Preserve historical orders when products or prices change.
- [ ] Implement WhatsApp redirect for customization without storing an on-site custom-order workflow.
- [ ] Keep future payment methods out of the initial checkout implementation; document extensibility only.

## Phase 4 — Authentication, authorization, and application security

- [ ] Provision admin identities explicitly; no public admin registration.
- [ ] Use Supabase Auth or another approved secure identity provider for admin login.
- [ ] Enforce server-side RBAC for **every** privileged action; never rely on UI hiding.
- [ ] Enforce least-privilege database and storage access.
- [ ] Configure RLS for any tables reachable through client-side Supabase APIs; document backend-only boundaries otherwise.
- [ ] Use secure sessions/cookies and CSRF protection where applicable.
- [ ] Add rate limits to login, checkout, uploads, and sensitive endpoints; document bypass limitations.
- [ ] Validate file type, size, object key, authorization, and image processing before accepting uploads.
- [ ] Apply parameterized queries/ORM-safe access, output escaping, and safe error handling.
- [ ] Restrict CORS as appropriate; configure security headers and HTTPS.
- [ ] Prevent secrets and PII from appearing in logs, client bundles, and source control.
- [ ] Record admin changes in audit logs without logging unnecessary personal information.
- [ ] Document retention and access controls for customer contact/address data.

## Phase 5 — Storefront and admin functionality

- [ ] Responsive, accessible product listing and detail pages.
- [ ] Category navigation, search, filters, and sorting.
- [ ] Featured-first/newest ordering implemented consistently and deterministically.
- [ ] Product image optimization, descriptive alt text, and appropriate loading behavior.
- [ ] Cart state and quantity validation.
- [ ] Guest COD checkout with explicit confirmation and useful error states.
- [ ] WhatsApp custom-order link and clear customer journey.
- [ ] Admin CRUD for products/categories/images, with validation and audit trail.
- [ ] Inventory and order management interfaces with safe status changes.
- [ ] Loading, empty, error, and not-found states.
- [ ] SEO basics: metadata, canonical URLs, sitemap, robots directives, structured data where valid.
- [ ] Legal/customer-facing pages based on approved policies, not invented promises.

## Phase 6 — Operations, backups, and reliability

- [ ] Verify the actual Supabase plan's uptime, inactivity, backup, and restoration limitations; do not assume free-tier production suitability.
- [ ] Use runtime-compatible connection pooling; separate migration/admin connections from request traffic.
- [ ] Configure monitoring, structured logs, alerts for checkout failures and database errors.
- [ ] Set reasonable request timeouts and failure handling.
- [ ] Define RPO/RTO targets with the owner before declaring readiness.
- [ ] Configure automated encrypted database backups and protected off-site retention.
- [ ] Perform a **real restoration test** into an isolated database and document results.
- [ ] Back up or provide recovery for R2 product images separately from PostgreSQL.
- [ ] Document credential rotation, incident response, and service outage procedures.
- [ ] Use safe caching; never serve private customer data from public caches or stale stock as authoritative.
- [ ] Establish resource usage and cost monitoring; scale based on measurements.

## Phase 7 — Automated testing and CI

- [ ] Unit tests for validation, pricing, and status transitions.
- [ ] Integration tests against **real PostgreSQL** for constraints and transactions.
- [ ] Reject third-level categories and invalid category relationships.
- [ ] Reject duplicate SKU/slug and malformed input.
- [ ] Reject manipulated prices and invalid shipping totals.
- [ ] Verify simultaneous checkout of the last unit cannot oversell.
- [ ] Verify duplicate checkout/retry does not create duplicate orders.
- [ ] Verify cancellation stock handling follows the approved policy.
- [ ] Verify transaction rollback on injected failures.
- [ ] Verify admin authorization and privilege boundaries.
- [ ] Verify connection failure handling and migration compatibility.
- [ ] Verify backup restoration procedure.
- [ ] Run lint, TypeScript type checks, tests, and production build.
- [ ] Add GitHub Actions CI **after** repository creation; prevent secret exposure in untrusted PRs.
- [ ] Run basic load tests against staging and report p95 latency, error rate, and bottlenecks; do not invent concurrency capacity.
- [ ] Test mobile UX, accessibility, and checkout end-to-end.

## Phase 8 — Staging, deployment, and launch gates

- [ ] Deploy staging using separate database, storage, and credentials.
- [ ] Verify hosting supports all required Next.js server functionality.
- [ ] Configure production domain, DNS, HTTPS, and redirects after domain purchase.
- [ ] Verify production environment variables are set securely.
- [ ] Run reviewed migrations using a controlled release process, not automatic destructive startup sync.
- [ ] Verify real order creation, cancellation, inventory changes, and admin login in staging.
- [ ] Verify backup restore and operational alerts.
- [ ] Confirm shipping, COD verification, returns, privacy, and customer notification policies with owner.
- [ ] Publish only after owner approval and all critical launch gates pass.
- [ ] Prepare rollback and incident-response runbooks.

## Required project deliverables

- [ ] `README.md` — local setup, scripts, architecture, environment setup.
- [ ] `docs/ARCHITECTURE.md` — architecture and deployment rationale.
- [ ] `docs/DATABASE.md` — schema, relations, constraints, money/stock policies.
- [ ] `docs/SECURITY.md` — trust boundaries, roles, threat mitigations.
- [ ] `docs/OPERATIONS.md` — backups, restore, monitoring, incidents, migration rollout.
- [ ] `docs/DECISIONS.md` — unresolved business decisions and approved choices.
- [ ] `PRODUCTION_READINESS.md` — checklist with evidence and blockers.
- [ ] `.env.example` — placeholders only.
- [ ] Migration files and development-only seed data.
- [ ] Automated test suite and CI configuration (once GitHub exists).
- [ ] Deployment instructions and final verified test report.

## Required response format after each phase

1. **What changed:** paths/files and behavior.
2. **Why:** important architecture or security choices.
3. **Verification:** exact commands run and pass/fail results.
4. **Risks/blockers:** anything unresolved or untested.
5. **Next phase:** concise steps and approval requests where necessary.

## Start here

First inspect the local project directory and tell me whether a Next.js project already exists. **There is no GitHub repository yet.** Do not claim one exists. Show the proposed architecture, database schema, and unresolved business decisions. Then implement Phase 0 safely. Continue phase-by-phase without skipping tests or marking unverified work complete.
