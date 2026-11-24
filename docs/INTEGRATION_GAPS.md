# Integration gaps and launch blockers

Audit date: 2026-11-11

## Local implementation status

- Next.js storefront, catalog/search/filter, cart, demo COD checkout, guest tracking, customer flows, protected admin modules, catalog/media/inventory/order APIs, and local PostgreSQL adapters are implemented in the repository.
- Automated local checks are green: typecheck, lint (no errors), unit tests 46/46, production build, and Playwright 17 passed/9 skipped.
- Demo and test-only paths are clearly bounded in the current runtime configuration.
- `npm audit` currently reports 8 moderate `minimatch` advisories in the ESLint/TypeScript lint toolchain. The available forced fix would change the Next ESLint config across a major version, so it was not applied without a compatibility review.

## External or owner-controlled gaps

1. Production checkout is blocked until shipping zones/prices, tax treatment, courier, COD eligibility, cancellation, returns/refunds, and order-status policy are approved and configured.
2. Licensed product photography and production R2 credentials are not configured. The current visible catalog uses documented `FLC / SAMPLE` CSS art.
3. Customer email verification, password recovery delivery, and external notification delivery need approved SMTP/provider credentials, sender identity, templates, consent, retries, webhooks, monitoring, and retention policy.
4. Google OAuth requires the production provider client, redirect allowlist, and callback configuration.
5. Hosted Supabase staging remains blocked pending project-scoped read-only access, target validation, role/TLS/pooler checks, backup/recovery evidence, and explicit migration approval. The protected production database was not modified.
6. Production admin identity, MFA recovery, session policy, rate limiting, key custody/rotation, and role administration require owner/security approval.
7. Hosting and commercial budget/terms remain unresolved; no deployment was performed.
8. BrowserAct is installed but unavailable for validation without its API key. Playwright remains the executed browser evidence.

## Safety posture

No secret was added to source, no production credential was used, no hosted write was sent, no real order was created, and no demo fixture is presented as a production business fact.
# Integration Gaps

## UI tooling and verification — 2026-11-12

- Mobbin and Watermelon UI MCP endpoints were not present in the configured plugin/MCP discovery, so no integration was fabricated.
- Hallmark’s optional screenshot render verifier is blocked by the missing local `puppeteer-core` package. Playwright screenshots and end-to-end tests were used instead.
- Production photography, final brand font licensing, and any paid animation/component licenses remain owner-supplied configuration items.
- The screenshot capture path can report a non-failing hydration mismatch for temporary client-applied `caret-color` styles on form inputs. A normal local Playwright browser diagnostic did not reproduce it; no application source injection was found.

## Post-transformation QA security notes — 2026-11-12

- The previously pasted database password must be treated as compromised. It was not used by this audit, and no hosted database was contacted. Rotate the password in the provider dashboard, revoke/replace any pooler/direct connection strings, update only the intended untracked local/staging secret store, then run local-only validation before any staging migration.
- Search found no tracked `.env.local` or tracked OAuth client-secret JSON. An untracked `client_secret_*.json` file is present in the workspace and contains a `client_secret` field; it was not opened for its secret value, added to `.gitignore`, or used by this audit. Revoke/rotate that Google OAuth client if it is real, remove the file from the workspace after preserving only approved metadata, and issue a new client through the secret manager.
- `.env.local` currently names `DIRECT_URL`, while the Prisma CLI contract requires `DIRECT_DATABASE_URL`; this explains why Prisma CLI/bootstrap configuration can fail and must be corrected in a local-only environment after the intended loopback database is running. Do not replace it with a hosted production URL for bootstrap.
- `.env.local` also has server-only R2 settings configured. No R2 request was made during this audit; confirm those credentials are scoped to a disposable bucket and rotate them if they were shared outside the intended secret store.
