# FLC Decor Verification Evidence

Updated: 2026-10-26 (Asia/Karachi)

This file records commands actually executed in the current remediation run. A documented command without an exit result is not evidence of a pass.

## Baseline evidence

| Date | Command/environment | Result | Scope |
|---|---|---|---|
| 2026-10-26 | `npm run lint` / Node 22.22.1 | PASS (prior audit evidence) | Static lint |
| 2026-10-26 | `npm run typecheck` / Node 22.22.1 | PASS (prior audit evidence) | TypeScript |
| 2026-10-26 | `npm test` | PASS, 6 tests (prior audit evidence) | Domain/idempotency/concurrency |
| 2026-10-26 | `npm run build` | PASS (prior audit evidence) | Next production build |
| 2026-10-26 | Prisma validate/generate with `DATABASE_URL` | PASS (prior audit evidence) | Schema/client |
| 2026-10-26 | Docker Compose PostgreSQL | BLOCKED | Docker daemon pipe unavailable |
| 2026-10-26 | `npm audit --json` | FAIL/OPEN | 8 advisories in prior audit |

## Current remediation evidence

New entries are appended after each phase with exact command, exit status, environment, and relevant output summary. Browser evidence includes the local URL, viewport if applicable, and screenshot path when available.

| 2026-10-26 | `npm run lint` / Node 22.22.1 | PASS | After Next 16 flat-config migration |
| 2026-10-26 | `npm run typecheck` / Node 22.22.1 | PASS | Strict TypeScript |
| 2026-10-26 | `npm test` / Vitest 5.0.5 | PASS, 8 tests | Domain + database fail-closed guards |
| 2026-10-26 | `npx prisma validate`, `npm run db:generate` / Prisma 7.10.1 | PASS | `prisma.config.ts` and schema |
| 2026-10-26 | `npm run build` / Next 16.4.3 | PASS, 36 routes | Production build |
| 2026-10-26 | `npm audit --audit-level=high` | PASS, 0 vulnerabilities | Patched dependency tree |
| 2026-10-26 | `docker compose up -d postgres` | BLOCKED | Docker Engine pipe unavailable |

## Final remediation audit evidence

| Date | Command/environment | Result | Scope |
|---|---|---|---|
| 2026-10-26 | `npm run lint` / Node 22.22.1 | PASS | Source lint; generated Playwright reports are explicitly ignored |
| 2026-10-26 | `npm run typecheck` / Node 22.22.1 | PASS | Strict TypeScript |
| 2026-10-26 | `npm test` / Vitest 5.0.5 | PASS: 12 passed, 1 skipped | Domain, auth, media and database guards; PostgreSQL file skipped without opt-in DB |
| 2026-10-26 | `npm run test:integration` | SKIPPED: 1 test | Requires `RUN_POSTGRES_INTEGRATION=true` and reachable PostgreSQL |
| 2026-10-26 | `npm run security:audit` | PASS: 0 vulnerabilities | High-severity npm audit threshold |
| 2026-10-26 | `npm run db:validate` with synthetic local `DATABASE_URL` | PASS | Prisma schema validation and client generation |
| 2026-10-26 | `npm run build` / Next 16.4.3 | PASS: 49 routes | Production compilation and static generation |
| 2026-10-26 | `npm run test:e2e -- --reporter=line` | PASS: 6/6 | Customer browse → variant → cart → demo COD → success; guest tracking privacy; desktop and 390px mobile |
| 2026-10-26 | `npx playwright test tests/e2e/accessibility.spec.ts --reporter=line` | PASS: 2/2 | Axe homepage audit, desktop and mobile |
| 2026-10-26 | BrowserAct local manual journey | PASS with evidence | `docs/evidence-home-desktop.png`, `docs/evidence-customer-journey.png`, `docs/evidence-account-session.png` |
| 2026-10-26 | Production server on `localhost:3012`, `NODE_ENV=production` | PASS fail-closed | Valid checkout-shaped request returns 503 `CHECKOUT_NOT_CONFIGURED`; `/admin` returns 307 to `/admin/login?reason=not-configured` |
| 2026-10-26 | Production response-header smoke | PASS | CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy and Permissions-Policy present |
| 2026-10-26 | Docker/PostgreSQL integration | BLOCKED | Docker Engine pipe unavailable; durable concurrency/restart/restore evidence not obtained |
| 2026-10-26 | Lighthouse/load/hosted CI/backup restore | NOT RUN | No performance runner, production host, or restore target was available |
