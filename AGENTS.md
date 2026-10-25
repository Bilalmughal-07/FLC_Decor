# Codex Instructions — FLC Decor

You are developing **Fahad Laser**, the storefront for **FLC Decor**. Read all documents in this folder before implementing. Prefer small, tested increments; explain assumptions and record new decisions in `12_DECISIONS.md`.

## Priority and change control
1. Explicitly confirmed business decisions in `12_DECISIONS.md` and requirements in `02_SRS.md` outrank suggested architecture or UI choices.
2. `01_PRD.md` defines product scope; `03_UI_UX.md` defines visual/interaction intent; architecture and API docs are provisional technical blueprints.
3. Do not silently invent business policy. Add TODO/configuration or a clearly labeled mock when courier pricing, returns, order cancellation, order statuses, retention periods, or phone/email providers are undecided.
4. Never hardcode secrets, store plaintext passwords, fake payment success, or weaken stock transactions for demo convenience.
5. No affiliates, no marketplace, no onsite custom-order builder. Custom requests link to configured WhatsApp.

## Build approach
- TypeScript strict mode; Next.js frontend and NestJS backend are recommended candidates, PostgreSQL is recommended for relational integrity.
- Modular monolith first. Use a database transaction for order + inventory + idempotency result; never call third-party services within that transaction.
- Use deterministic tests for concurrent checkout, idempotency, guest tracking privacy, MFA, and image-reference cleanup.
- Prefer accessible semantic components, mobile-first responsive UI, server-rendered catalog where suitable, and motion with `prefers-reduced-motion` support.
- 3D is a progressive enhancement: never block purchase flows, never compromise LCP, and provide a static fallback.
- Create seed data and images with appropriate rights; clearly mark samples. Do not scrape or copy reference-store assets.
- No actual production credentials, real customer records, or live COD orders during development.

## Delivery expectations
At each milestone provide working code, migrations, tests, setup instructions, and a short report: what works, what remains, and how to verify. Ask before resolving business-critical TBDs.

## Autonomous end-to-end execution mandate (owner instruction)
The owner authorizes you to **continue implementing the complete website without waiting for additional chat replies, routine confirmations, or intermediate approvals**. They may be away/asleep. Treat this as a standing instruction for the current development run: work through `10_ROADMAP.md` from foundation through storefront, cart, accounts, COD checkout, admin panel, tests, documentation, and a runnable development/demo build. Do not stop after scaffolding, a single page, or one milestone merely to ask whether to proceed. At the end of each milestone, record progress in `IMPLEMENTATION_STATUS.md` and immediately proceed to the next feasible task. If context is interrupted, use that status file to resume.

### Decision protocol (no waiting)
1. Read `12_DECISIONS.md` and the relevant PRD/SRS/UI/architecture/API/security documents first. Follow confirmed owner decisions and explicit exclusions.
2. For unresolved **technical/visual/implementation** choices, select the safest maintainable recommendation consistent with the documents, implement it, and append a dated entry to `12_DECISIONS.md` under **Autonomous implementation decisions**, recording: decision, alternatives, reason, affected files, reversibility, and whether owner review is needed later.
3. For unresolved **business/legal/operational** policy (shipping prices, courier, tax, refunds, cancellation, returns, legal retention, actual contact/WhatsApp details, real product pricing), do **not** fabricate a real-world rule. Build a configurable, clearly labeled `NOT_CONFIGURED` or demo-only flow, document the precise outstanding setting in `12_DECISIONS.md`, and continue all independent work. Demo fixtures must be unmistakably fake and never masquerade as real business facts.
4. If an external dependency or credential is missing, implement a local adapter/mock with documented interface and environment variable placeholders, and keep building. Prefer a locally runnable Docker Compose/dev configuration where available; never put secrets in code or logs.
5. If a test fails, debug and fix it before proceeding; if blocked by an external service, log the issue and complete other independent tasks. Do not mark a feature done when its critical acceptance tests fail.
6. Do not request permission for ordinary code edits, new files, refactoring, dependency installation, test runs, or local development setup within the working repository. Use tools available in your environment and keep progressing.

### Safety and authority boundaries
- This instruction does **not** authorize purchases, paid subscriptions, production deployments, changing external account settings, connecting real customer data, sending real messages, or taking other consequential external actions. Prepare scripts and clear setup instructions for those steps, but do not execute them without the necessary authorization.
- Never bypass tool-level approvals or security restrictions. If an operation genuinely requires an external approval, skip that operation, document the blocker, and continue independent development rather than repeatedly asking.
- Never represent a free-tier demo as production-grade. Enforce safe fail-closed behavior where production requirements are not met. Real COD checkout must remain disabled until shipping/tax and production readiness are configured; test checkout with explicitly labeled demo mode and synthetic data.
- Preserve all prior confirmed requirements, including admin TOTP, secure guest tracking, variant inventory integrity, idempotent order creation, and image safety.

### Definition of done for autonomous run
Complete a coherent, locally runnable end-to-end website with responsive premium FLC Decor UI, tasteful performant 3D effects with fallbacks, catalog/search/filter, cart, secure guest/customer flows, transactional demo COD ordering, order tracking, admin catalog/media/inventory/order management, database migrations/seed fixtures, automated tests, lint/typecheck/build checks, example environment configuration, and setup instructions. Document what is implemented vs demo-only vs production-blocked. Run available checks and fix failures. Produce `IMPLEMENTATION_STATUS.md` and a final handoff report with commands, test results, known issues, and exact production blockers. Keep going until this definition is met or all remaining work is genuinely blocked by unavailable external access.
