# FLC Decor Security Threat Model

| Surface | Threat | Required mitigation | Current status |
|---|---|---|---|
| Customer auth | Credential stuffing/session theft | scrypt/Argon2id-equivalent hashing, secure revocable cookies, reset, rate limits | Partial; local in-memory demo only, no durable provider/email delivery |
| Admin | IDOR/MFA bypass | server RBAC, mandatory TOTP, recovery-code hashes, audit events | Partial boundary; admin login/MFA code exists, CRUD/audit/runtime provider remain open |
| Checkout | price tampering/oversell/replay | server quote, PostgreSQL conditional stock transaction, scoped durable idempotency | Partial; PostgreSQL code/schema present but integration unverified and totals synthetic |
| Guest tracking | order enumeration | non-enumerating email challenge and scoped short-lived capability | Fail-closed but incomplete |
| Uploads | polyglot, decompression bomb, path traversal, XSS | byte sniffing, bounds, safe decode/re-encode, quarantine, safe object keys | Partial validation/quarantine; storage/reference cleanup open |
| Browser | CSRF/XSS/clickjacking | CSRF, origin checks, CSP review, security headers, output escaping | Partial; origin checks, CSP/security headers and axe pass, production review remains |
| Abuse | bots/COD fraud | distributed rate limits, progressive review signals, redacted audit logs | Partial in-process endpoint limits; durable controls/audit open |
| Operations | secret/data loss | managed secrets, least privilege, encrypted backups, restore drill, alerts | Open |

No real production data or credentials are present in the local demo. This document is a risk model, not a security certification.
