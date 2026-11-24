# FLC Decor Remediation Decision Register

Updated: 2026-10-26 (Asia/Karachi)

This register isolates unresolved owner approvals from technical decisions. No item below is treated as a real business policy.

## Owner decisions required before production

| Decision | Current safe default | Why it is blocked |
|---|---|---|
| Shipping zones, courier and fees | `NOT_CONFIGURED`; live quote rejects | No approved pricing or courier contract |
| Tax applicability/calculation | `NOT_CONFIGURED`; live quote rejects | Requires business/tax confirmation |
| Returns, refunds and cancellation | No live action | Legal/operational policy not supplied |
| Order status transition map | Test-only COD state machine; production rejects | Operations must define legal transitions and evidence |
| COD reservation/release policy | Stock is only deducted on accepted demo order | Owner explicitly disallows generic unpaid expiry release |
| Contact email, phone, address and WhatsApp | Owner-confirmed details centralized in `lib/business-contact.ts` | Reconfirm before public launch |
| Customer MFA requirement | Optional TOTP per SRS | Do not silently make it mandatory |
| Legal/data retention periods | Unconfigured | Requires counsel/owner approval |
| RPO/RTO and backup plan | Targets recorded in SRS only | Need provider and restore evidence |
| Production identity/storage/database providers | Local adapters and interfaces | No credentials or paid services authorized |
| Payment methods/providers | Schema supports four method codes; none active | Existing SRS says COD only; newer addendum names COD/Easypaisa/JazzCash/cards; owner and merchant decision required |
| Production PostgreSQL migration target | No hosted migration applied; all nine migrations pass in isolated local PostgreSQL | Hosted execution needs explicit approval and restore evidence |
| Final catalog media, prices and copy | Synthetic fixtures clearly labeled | Owner assets/approvals absent |

## Safe technical decisions for this run

1. Keep the existing Next.js app and preserve the storefront; add modular server services instead of a rewrite.
2. Add local-only secure demo auth and media validation utilities for deterministic tests, while production routes fail closed unless configured for a real provider/database.
3. Add a Prisma-backed checkout repository behind a strict database flag; never silently fall back to the process-local demo adapter in production.
4. Prepare local CI workflows and scripts without claiming GitHub execution or creating a remote.
5. Keep all synthetic users, orders and catalog fixtures marked as demo data.
