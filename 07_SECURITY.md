# Security, Privacy and Threat Model — FLC Decor

## Assets and threats
Assets: admin credentials, sessions, customer contacts/delivery addresses, inventory, orders, payment-method records, media, encryption keys, backups. Threats: credential stuffing, session theft, CSRF, XSS, SQL injection, mass assignment, IDOR, bot checkout abuse, overselling, malicious images, leaked secrets, misconfigured storage, failover split-brain, data loss.

## Controls
- Server-managed revocable sessions; HttpOnly/Secure/SameSite cookies, session rotation, expiry, CSRF tokens, strict authorization on every resource.
- Passwords: Argon2id or comparable memory-hard salted hash; MFA: admin TOTP required, customer TOTP optional, replay protection, encrypted TOTP secrets, hashed single-use recovery codes.
- Data: TLS, database/backup encryption, targeted authenticated field encryption for addresses/MFA, managed keys and versioning, privacy-safe logs, protected backup key recovery.
- Secrets: centralized manager or equivalent, runtime least-privilege identity, separate environments, CI protected deployments, no secrets in Git, frontend, logs, prompts or coding agents by default; test rotation and revocation.
- Uploads: allowlisted real image formats, safe decoding, re-encoding, metadata stripping, processing limits, quarantined staging, non-executable public delivery, no unsafe SVG.
- Fraud/rate limiting: progressive thresholds and hard endpoint caps, account/IP/session/destination dimensions, fair shared-IP handling, risk-based COD checks without blanket OTP.
- Checkout: SQL constraints, transactional inventory, idempotency, immutable order snapshots, fail-closed unsafe DB state, no success on ambiguous commit.
- Guest tracking: verified email ownership, scoped short-lived capabilities, enumeration resistance and throttling.
- Audit: admin stock changes, order transitions, privileged access, secret access/rotation, login anomalies; no raw personal data or secrets.

## Threat-based acceptance tests
- Stolen session revoked; CSRF request denied; non-admin cannot access admin endpoints; admin cannot bypass MFA.
- Guessing order numbers reveals no order details; invalid tracking challenge does not reveal account existence.
- Malformed image, decompression bomb, fake extension, oversized file rejected.
- Two simultaneous final-unit orders cannot both succeed; replay same idempotency key cannot duplicate order.
- Rotating DB credentials does not cause uncontrolled downtime; old encryption keys remain available for legitimate restore.

## Production gates
Review Pakistani legal/data retention obligations with appropriate counsel; document exact periods. No public production launch until backup restoration, HA failover, key recovery, secrets management, incident runbooks, and live-order policy approvals are tested.
