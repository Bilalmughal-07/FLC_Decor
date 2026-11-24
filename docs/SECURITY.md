# FLC Decor Security Model

## Required controls

- Supabase Auth or another approved identity provider; no public admin registration.
- Server-side role checks for every admin operation; UI hiding is not authorization.
- Secure HttpOnly/SameSite/Secure session handling, CSRF protection for state-changing browser requests, rotation and revocation.
- Admin mandatory TOTP; optional customer TOTP with replay protection and hashed single-use recovery codes.
- Rate limits for login, checkout, guest verification and uploads, with proxy-aware IP handling and account/session/destination dimensions.
- Server-authoritative prices, totals, status transitions and stock; integer money and transactional idempotency.
- R2 upload authorization, actual MIME sniffing, pixel/byte/decompression limits, decode/re-encode, EXIF stripping, quarantine and non-executable delivery.
- Redacted structured logs, request IDs, audit events, secret management, encrypted backups and restore/key-recovery tests.

## Current implementation posture

The repository contains synthetic fixtures only. Checkout and demo order
transitions are disabled whenever `NODE_ENV=production`; guest lookup requires
an expiring verified-email capability; no external provider credential is
stored. Customer identity supports Supabase Auth through SSR PKCE cookies and
authoritative server `getUser()` checks, while the local demo identity is
explicitly non-production. Admin identity is a separate durable PostgreSQL
session/TOTP/RBAC path with a guarded one-time local bootstrap. Hosted Auth,
SMTP, OAuth, migrations and production admin federation are not live-verified.

## Open security findings

The remaining launch blockers are hosted identity/provider verification,
distributed rate limiting, production secrets/key rotation, legal retention,
approved checkout policy, staging migration/restore evidence, monitoring and
external-provider setup. Process-local limits are useful defense in depth for
development but do not protect a horizontally scaled deployment.
