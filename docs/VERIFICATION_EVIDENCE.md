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

## Production database foundation verification

| 2026-10-26 | `npm run db:validate` / Prisma 7.10.1 | PASS | Expanded schema validates and client generation succeeds; does not apply migrations |
| 2026-10-26 | `npm run typecheck` | PASS | Database reservation path and PostgreSQL integration test source type-check |
| 2026-10-26 | `npm run lint` | PASS | Source lint after database changes |
| 2026-10-26 | `npm test` | PASS: 12 passed, 1 integration file skipped | Unit tests; actual PostgreSQL tests gated by `RUN_POSTGRES_INTEGRATION=true` |
| 2026-10-26 | Read-only PostgreSQL probe using documented local demo URL | BLOCKED: `28P01` | Local listener rejected demo password; no migration, seed or write was executed against it |
| 2026-10-26 | Docker PostgreSQL | BLOCKED | Docker Engine named pipe unavailable |
| 2026-10-26 | `prisma migrate deploy` for migration 0004 | NOT RUN | No identified disposable database credentials; preserve unknown listener data |

## PostgreSQL concurrency remediation evidence

| Date | Command/environment | Result | Scope |
|---|---|---|---|
| 2026-10-26 | `npm run db:deploy` with `DATABASE_URL` from `.env.local`, target asserted as `127.0.0.1:5433/flcdecor_test` | PASS: no pending migrations | Isolated PostgreSQL test database only |
| 2026-10-26 | Pre-fix synthetic concurrent probe against `flcdecor_test` | FAIL reproduced: Prisma `P2010`, nested adapter `originalCode=40001`, `could not serialize access due to concurrent update` | Raw inventory reservation update under `Serializable` |
| 2026-10-26 | `npm run typecheck` | PASS | Retry classifier and transaction changes |
| 2026-10-26 | `npm test -- --reporter=verbose` | PASS: 13 passed, 1 skipped | Unit/domain/auth/media coverage and error classification |
| 2026-10-26 | `npm run test:integration -- --reporter=verbose` with `RUN_POSTGRES_INTEGRATION=true` | PASS: 6/6 | Real PostgreSQL transaction, inventory, idempotency, rollback and concurrency assertions |
| 2026-10-26 | Same integration command repeated 5 times with target assertion | PASS: 30/30 | Repeated 2-request and 8-request last-unit concurrency load; no negative/over-reserved stock or orphan side effects |

## Security and integration readiness evidence

| Date | Command/environment | Result | Scope |
|---|---|---|---|
| 2026-10-26 | `npm run typecheck` | PASS | Auth ownership, guest tracking, payment boundary and outbox worker |
| 2026-10-26 | `npm run lint` | PASS | Application, library and test source; generated `.next-e2e` ignored |
| 2026-10-26 | `npm test -- --reporter=dot` | PASS: 16 passed, 1 skipped | Auth isolation, payment transition/signature, checkout and media/domain tests |
| 2026-10-26 | `npm run test:integration -- --reporter=dot` with target assertion `127.0.0.1:5433/flcdecor_test` | PASS: 8/8 | Checkout, guest challenge/capability, webhook dedupe, outbox retry/dead-letter, rollback and invariants |
| 2026-10-26 | `npm run db:deploy` with isolated target | PASS: no pending migrations | Existing migration history preserved; no new migration required |
| 2026-10-26 | Guarded backup/restore scripts | NOT RUN | `pg_dump`/`pg_restore` restore drill requires a separate disposable restore database and installed PostgreSQL client tools |
| 2026-10-26 | Real payment/email/SMS provider integration | NOT RUN | Provider credentials, merchant approvals and sender configuration are not available; production remains disabled |
| 2026-10-26 | `npm run build` / Next 16.4.3 | PASS: 52 routes | Production compilation after security/runtime additions |
| 2026-10-26 | `npm run test:e2e -- --reporter=line` | PASS: 6/6 | Storefront journey, guest tracking privacy and desktop/mobile accessibility |
| 2026-10-26 | `npm run db:deploy` with target assertion | PASS: 4 migrations, no pending | `127.0.0.1:5433/flcdecor_test` only |
| 2026-10-26 | Read-only `EXPLAIN (FORMAT JSON)` inventory/order lookups | PASS / informational | Small synthetic database chose sequential scans; existing unique/index paths remain available and no index was added without representative load evidence |
| 2026-10-26 | Redacted secret scan | PASS | Only `.env.example` tracked; four detected URL patterns were documentation placeholders; no secret values printed |
| 2026-10-26 | Expanded integration suite repeated 3 times | PASS: 24/24 | Checkout concurrency, guest tracking, webhook dedupe and outbox processing |

## Overnight implementation evidence - 2026-10-27

| Date | Command/environment | Result | Scope |
|---|---|---|---|
| 2026-10-27 | `npm run typecheck` | PASS | Strict TypeScript after Auth, notification, checkout, admin and health changes |
| 2026-10-27 | `npm run lint` | PASS | Application/library/test source |
| 2026-10-27 | `npm run test:unit` | PASS: 38/38, 12 files | Supabase mocks, pricing, notification, health, media, payment and domain boundaries |
| 2026-10-27 | `npm run test:integration` with exact local target assertion | PASS: 23/23, 5 files | `127.0.0.1:5433/flcdecor_test` only |
| 2026-10-27 | Complete integration suite repeated five times | PASS: 115/115 | Concurrent final-unit checkout, idempotency, lifecycle, account/admin, media and notifications |
| 2026-10-27 | Default `npm run test:e2e` | PASS: 17/17, 9 expected skips | Desktop/mobile sample storefront, auth UI, accessibility, cart/gallery and privacy |
| 2026-10-27 | Database Playwright suite, desktop | PASS: 2/2 | PostgreSQL checkout reservation and encrypted account/address |
| 2026-10-27 | Admin onboarding Playwright, desktop | PASS: 1/1 | Bootstrap, login, MFA enrollment, protected dashboard/media and logout revocation |
| 2026-10-27 | `npm run db:validate` | PASS | Prisma 7.10.1 schema validation/client generation; nine local migrations |
| 2026-10-27 | `npm run build` | PASS: 76 routes/pages | Next.js 16.4.3 production build; checkout remains disabled |
| 2026-10-27 | `npm run security:audit` | PASS: 0 vulnerabilities | npm audit high threshold |
| 2026-10-27 | Supabase MCP list tables/migrations/advisors | PASS, read-only | Empty hosted `public`, empty migration history, no advisor findings; no hosted writes |
| 2026-10-27 | High-confidence secret-pattern scan | PASS | File-name-only scan; no matching committed secret patterns |
| 2026-10-27 | Live SMTP/OAuth/R2/provider/deployment/restore/load tests | NOT RUN | Explicit approval, credentials or external staging infrastructure required |
