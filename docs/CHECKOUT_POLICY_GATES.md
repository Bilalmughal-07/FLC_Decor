# Checkout policy and activation gates

Updated: 2026-10-27 (Asia/Karachi)

Production checkout is disabled. `lib/checkout-pricing.ts` is the single
server-side pricing-policy boundary. Its only implemented mode,
`synthetic-zero`, is a labeled non-production fixture; it is rejected whenever
`NODE_ENV=production`.

## Unconfigured owner policies

The following settings deliberately have no live default:

- delivery areas and address eligibility;
- courier/service selection, shipping rates and return-to-origin charges;
- tax applicability, invoice treatment and rounding;
- COD eligibility, order confirmation and collection reconciliation;
- cancellation cutoffs and inventory effects after dispatch;
- return eligibility, inspection, restocking, refunds and rejected returns;
- promotions, discount stacking and free-delivery thresholds.

These need owner/operations/legal approval. Zero shipping or tax must never be
inferred from missing configuration. Future rules should implement the pricing
interface, return integer PKR minor units, include a policy version in each
order snapshot, and be tested independently from the checkout transaction.

## Implemented test-safe flow

- The browser submits variant IDs and quantities only; the server reloads
  publication, price and stock state.
- Quote and order creation aggregate duplicate lines and reject invalid or
  unavailable variants.
- Order, items, address snapshot, inventory reservation/movement, payment
  intent, notification, outbox event, audit event and idempotency result commit
  in one serializable PostgreSQL transaction.
- Genuine serialization/deadlock conflicts retry the complete transaction with
  bounded randomized backoff. Stock is revalidated on every attempt.
- No payment, email, SMS, courier or other network provider runs inside that
  transaction.
- Demo COD transitions are permission- and MFA-gated, transactional and
  unavailable in production. Cancellation releases an active reservation;
  dispatch commits it exactly once. Return restocking is intentionally absent
  until physical inspection policy is approved.

## Payment provider contract

Future online providers must implement a server-only adapter and a verified
webhook contract. Required controls include signed raw-body verification,
constant-time signature comparison where applicable, amount/currency/order
matching, provider event and transaction uniqueness, replay resistance,
append-only attempts, idempotent state transitions, bounded retry, and an
audited reconciliation path. Card PAN/CVV must never enter this application.

The repository mock webhook is a deterministic integrity test only. It is
forbidden in production and is not evidence of a merchant integration.

## Activation approval

Enabling checkout requires all of the following: approved policies above,
staging database migration and restore evidence, configured identity/email,
real product/pricing/media approval, load and concurrency results, monitoring
and alerting, administrator MFA/recovery, legal pages, and a recorded owner
go/no-go decision. A deployment must not set a production checkout flag before
that review.
