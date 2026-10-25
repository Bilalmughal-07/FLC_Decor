# FLC Decor Remediation Tracker

Updated: 2026-10-26 (Asia/Karachi)

Statuses: `NOT STARTED`, `IN PROGRESS`, `PARTIAL`, `VERIFIED`, `BLOCKED`, `FAIL`. A status is not `VERIFIED` until a command or manual/browser evidence is recorded in `docs/VERIFICATION_EVIDENCE.md`.

## Phase tracker

| Phase | Scope | Status | Evidence/blocker |
|---|---|---|---|
| 0 | Baseline, dependencies, scripts, local Git/CI | VERIFIED LOCALLY | Docs, scripts and CI prepared; Docker unavailable; GitHub execution unverified |
| 1 | PostgreSQL persistence and durable checkout | PARTIAL | Prisma repository/migrations/unit guards implemented; real PostgreSQL concurrency/restart evidence blocked |
| 2 | Auth, sessions, MFA, private tracking | PARTIAL | Local demo customer sessions, admin MFA boundary, recovery-code hashing and fail-closed tracking implemented; durable identity/email provider remains open |
| 3 | Admin CRUD, inventory, media | PARTIAL | Admin preview is protected in production, media validation/quarantine utility and endpoint exist; durable CRUD/storage/audit lifecycle remains open |
| 4 | Fraud controls and observability | NOT STARTED | Shared durable rate-limit/metrics provider pending |
| 5 | Storefront/accessibility/media/3D gaps | PARTIAL | URL-synced filters, OS theme bootstrap, reduced motion and responsive browser evidence verified; final media gallery and interactive 3D remain open |
| 6 | Operations, backup, deployment | BLOCKED | No provider credentials/remote deployment/restore target |
| 7 | E2E, performance, CI/release gates | PARTIAL | Playwright customer/accessibility matrix passes 6/6; lint/typecheck/unit/build/audit pass; Postgres, Lighthouse/load and hosted CI remain unverified |

## Requirement ledger

| Range | Status at baseline | Tracking rule |
|---|---|---|
| FR-001..FR-027 | See `REMEDIATION_BASELINE.md` | Update each item with evidence before marking verified |
| BUG-001..BUG-012 | See `REMEDIATION_BASELINE.md` | Every open bug needs test/reproduction and residual risk |
| SEC-001..SEC-007 | See `REMEDIATION_BASELINE.md` | Critical/high findings block production checkout |

## Per-phase update template

- Completed IDs:
- Changed files/migrations:
- Commands and result:
- Browser/screenshots/logs:
- Open vulnerabilities:
- Owner decisions required:
- Rollback plan:
- Production checkout: **BLOCKED** until explicit launch gates pass.
