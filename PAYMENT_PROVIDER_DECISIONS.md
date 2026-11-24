# Payment provider decisions

Status: not selected; no payment method is activated for production.

The current `02_SRS.md` specifies COD as the only initial payment option. The newer production database and checkout addenda name COD, Easypaisa, JazzCash, and cards as launch methods, but each online method requires an approved merchant integration and end-to-end validation. This scope conflict is recorded for owner resolution; schema support does not resolve it.

The database can represent COD/EASYPAISA/JAZZCASH/CARD intents and append-only
attempts, transactions, webhook deduplication and refunds. A deliberately
non-production mock webhook verifies raw-body signatures, amount/currency
matching, event and transaction deduplication, and idempotent state updates; it
is not a merchant integration and is forbidden in production. No real provider
endpoint, merchant credential or SDK is configured. COD starts PENDING and
must only become collected through an authorized reconciliation event.

Before activation, owner must select legal merchant/account ownership, gateway/aggregator, supported methods, PKR settlement/refund behavior, fees, callback signature method, sandbox credentials, reconciliation source, and operational support. Card handling must use a compliant hosted/tokenized provider; PAN/CVV are not stored. Shipping/tax and reservation/late-payment policies are separate blockers.
