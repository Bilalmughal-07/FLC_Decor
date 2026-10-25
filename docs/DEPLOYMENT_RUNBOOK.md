# Deployment Runbook

1. Build from a reviewed local commit with a clean working tree and no secrets.
2. Run lint, typecheck, unit/integration/E2E/accessibility/security checks, Prisma validation and production build.
3. Apply reviewed migrations using a separate least-privilege migration connection.
4. Verify environment separation, secret manager bindings, readiness, health, logs and alert routing.
5. Run staging journey, admin MFA, inventory race, idempotency, media and restore checks.
6. Obtain owner go/no-go approval; production checkout remains disabled until then.
7. Deploy with a known rollback or forward-fix target and monitor critical journeys.

No remote repository or deployment target exists in this local run. The CI workflow is prepared locally only.
