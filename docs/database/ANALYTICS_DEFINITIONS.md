# Analytics definitions

Analytics are derived from canonical order, payment, refund, shipment and inventory records; they are not a second source of truth. Migration creates a starter SQL view only if it can be defined without assuming business meanings. No dashboard metric is claimed verified.

| Metric | Definition | Exclusions/notes |
|---|---|---|
| Placed order count/value | Count and sum of accepted orders by `placedAt` and currency | Not revenue collected; canceled treatment requires policy definition. |
| Online collected | Sum of verified successful captured payment transactions less successful refunds | Reconcile by provider/currency and prevent duplicate webhook event effects. |
| COD outstanding | Accepted COD value less authorized collection/remittance events | COD collection and adjustments require owner-approved reconciliation semantics. |
| Net collected | Online captured plus COD collected less successful refunds | Does not include uncollected placed value; fees/tax/shipping semantics pending. |
| Units ordered/shipped/returned | Sum immutable item quantities by order/shipment/inspected return events | Return counts only after receipt/inspection. |
| Available inventory | `on_hand - reserved` per variant/location | Must reconcile against immutable movement ledger. |
| Average order value | Placed order value divided by count of selected qualifying orders | Must label period and cancellation/refund treatment; not implemented. |

Day boundaries use `Asia/Karachi` in reporting queries while stored timestamps remain UTC. PII is not used as a grouping key in dashboards. Add `EXPLAIN (ANALYZE, BUFFERS)` evidence at representative volumes before materializing summaries. No invented query timing or p95 is reported.
