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

## Current demo posture

The demo contains synthetic fixtures only. Checkout is disabled whenever `NODE_ENV=production`, guest order lookup fails closed without a verified capability, and no external provider credentials are stored. A local-only auth adapter now provides scrypt password hashing, revocable HttpOnly sessions, TOTP/recovery-code helpers and an admin MFA boundary; it is intentionally unavailable in production and is not a durable identity provider. The admin page is a synthetic preview and must not be connected to real data without the complete authorization, CRUD and audit boundary.

## Open security findings

See [`FINAL_AUDIT_REPORT.md`](../FINAL_AUDIT_REPORT.md) for severity, reproduction and remediation details. The most important blockers are missing identity/MFA, missing persistent transactions, missing secure media processing, missing rate limiting/CSRF and eight dependency advisories reported by `npm audit`.
