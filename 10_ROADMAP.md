# Development Roadmap and Codex Work Plan

## Phase 0 — Foundation
- [ ] Confirm working repository, package manager, code style, env example, Docker Compose local Postgres, migrations, seed data.
- [ ] Add Next.js app, NestJS API, TypeScript strict, CI tests, lint, basic health checks.
- [ ] Write architecture decision records (ADRs) for any choices that affect portability.

## Phase 1 — Design system and storefront
- [ ] Build tokens, typography, light/dark themes, responsive header/footer, accessible components.
- [ ] Build home editorial sections, category cards, product grid, search/filter/sort, product detail/gallery.
- [ ] Add restrained scroll reveal and 3D showcase with lazy loading, reduced-motion/static fallback; measure LCP.

## Phase 2 — Catalog/admin/media
- [ ] Product/category/variant schema and migrations; admin auth with mandatory MFA.
- [ ] Product/category CRUD, image upload/validation/processing, shared references, 30-day orphan policy.
- [ ] Inventory admin operations with audit ledger.

## Phase 3 — Cart and checkout
- [ ] Guest/customer cart, variant validation, server price recalculation.
- [ ] COD checkout atomic order+stock+idempotency, immutable order snapshots, concurrency tests.
- [ ] Demo checkout only until shipping totals and operational status rules approved.

## Phase 4 — Accounts and orders
- [ ] Customer auth, reset, optional MFA, secure sessions, account order history.
- [ ] Email-verified guest tracking, admin order listing/details, controlled status operations (policy gate).

## Phase 5 — Hardening and demo
- [ ] Security review, a11y, image performance, visual regression, error states, monitoring, backups, deployment docs.
- [ ] Deploy synthetic-data demo to suitable free tiers; check cold starts and service quotas.

## Phase 6 — Production readiness (separate budget approval)
- [ ] Confirm courier charges, cancellation/returns, tax and retention requirements, verified business details.
- [ ] Select paid HA infra and validate durability/failover/RTO/RPO and load targets.
- [ ] Configure production secrets, email, DNS, backups, monitoring, runbooks; launch only after release gates.

## Definition of done
Every feature has tests, documented endpoints, accessible responsive states, no secret leakage, no fake business claims, and a reproducible local setup. Each PR references requirement IDs and includes verification steps.
