# Development, Deployment and Operations — FLC Decor

## Build-first plan
Local dev: Next.js web + NestJS API + PostgreSQL via Docker Compose (local only); object storage emulator or separate development bucket; seed synthetic products and test orders. Keep `.env.example` without secrets and document required values.

## Candidate free-tier demo services (verify current terms/quotas)
- Frontend: Cloudflare Pages for compatible Next.js deployment mode, or other commercial-use-permitted free host.
- API: Render free web service or equivalent; expect cold starts and free-tier limitations.
- PostgreSQL: Neon free database or equivalent; **not** HA/durable production commitment.
- Images: Supabase Storage free or equivalent with proper access policy.
- CI: GitHub Actions within plan quotas.
- Use provider free subdomains until brand domain purchased. Verify terms before public commercial operation.

## Environments
`development` → `staging` → `production`, distinct secrets, databases, media, OAuth/email settings and identities. Free staging/demo may share budget constraints but **must not share production secrets**.

## CI/CD
PR: lint, typecheck, unit/integration tests, security scanning, build, migration checks. Protected branch review; deployment via least-privilege identities; no secrets in untrusted PR jobs. Staging smoke tests and rollback plan. Use expand/migrate/contract database changes.

## Monitoring and jobs
Log structured request IDs, API latency, checkout success, outbox backlog, image processing errors, DB health, auth abuse, stock failures; redact PII. Jobs must be idempotent with bounded retry/backoff and dead-letter review.

## Production gap (not optional)
Free demo does not meet confirmed 99.9% uptime, automatic app/DB failover, strong acknowledged-order durability, <=2m checkout recovery, RTO 1h/RPO 15m. Before live orders: price and validate managed HA PostgreSQL, redundant app instances, shared sessions/limits, encrypted PITR backups, restored-key recovery, real alerting, operational coverage and failover drills.

## Secrets and migration
Keep database and storage behind abstractions where reasonable. Export data with verified consistency, preserve order/idempotency history, migrate media with reference mapping, validate checksums, cut over only after tests and rollback planning. Never use real customer data in demos.
