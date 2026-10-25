# QA and Testing Plan — FLC Decor

## Test pyramid
- **Unit:** pricing, valid variant combinations, discount logic, category depth, image-reference counts, validation, authorization policies.
- **Integration:** Postgres transactions, stock updates, idempotency, order snapshots, sessions, MFA, media lifecycle, outbox retries.
- **E2E:** browse → filter → select variant → cart → COD checkout → confirmation; guest email-verified tracking; account flows; admin product upload/edit/stock adjustment.
- **Security:** CSRF/XSS/IDOR, brute force, rate limiting, malicious media, secrets leakage, MFA bypass.
- **Accessibility:** keyboard, focus, screen reader labels, reduced motion, contrast, mobile zoom.
- **Visual:** screenshots at 375px/768px/1440px, light/dark, loading/error/empty states, 3D fallback.
- **Performance:** mobile LCP p75 <=2.5s, search p95 <=500ms, checkout p95 <=2s at defined healthy load, 1,000 concurrent mixed visitors, p99 monitoring.
- **Resilience:** app crash, DB failover, lost checkout response, network partition/split-brain safeguards, backup restore, credential rotation, 30-day orphan cleanup.

## Critical test cases
| ID | Scenario | Pass condition |
|---|---|---|
| T01 | Two buyers, last unit | Exactly one stock reservation/order succeeds |
| T02 | Same idempotency key retried | One order and one stock decrement |
| T03 | Same key different body | Controlled conflict, no duplicate |
| T04 | Price changed since cart | Checkout shows authoritative price before confirmation |
| T05 | Invalid color/size combination | Rejected server-side |
| T06 | Guest tracking without email verification | No order details |
| T07 | Admin password correct, MFA absent | Admin access denied |
| T08 | Shared image variant removed | Asset remains while referenced |
| T09 | Image orphaned 20 days | Recoverable, not deleted |
| T10 | DB durability unsafe | Checkout fails closed |
| T11 | Reduced-motion enabled | No auto 3D/parallax; shopping works |
| T12 | Shipping policy absent in live mode | Live checkout blocked with clear explanation |

## Release gates
Development demo: all core E2E flows pass with synthetic data, no high-severity security bugs, visible demo-only checkout if shipping rules incomplete.
Production: actual infrastructure tested against 99.9%, single-instance acknowledged-order durability, <=2m DB checkout recovery, 1h RTO/15m RPO, legal/business policy approvals, real notification provider, backup/key restore and incident response.
