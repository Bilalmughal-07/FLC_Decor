# Notification operations runbook

Updated: 2026-10-27

## Safety boundary

FLC Decor currently has no approved external email, SMS, or WhatsApp delivery
provider. `NOTIFICATION_RUNTIME=development-memory` is the only implemented
provider and is forbidden in production. It accepts messages into a
process-local test inbox and never opens a network connection. Supabase Auth
continues to own signup confirmation and password-recovery email templates.

Order creation does not call a provider. It atomically writes the order,
items, inventory reservation/movement, payment intent, notification row,
outbox event, audit event, and idempotency result. A worker claims the committed
outbox row later.

## Event catalog

The typed catalog in `lib/notification-catalog.ts` defines:

- `WELCOME_CUSTOMER`
- `ORDER_PLACED`
- `ORDER_CONFIRMED`
- `ORDER_STATUS_CHANGED`
- `ORDER_DISPATCHED`
- `ORDER_CANCELLED`
- `ADMIN_NEW_ORDER`
- `ADMIN_DELIVERY_FAILURE`

All dynamic HTML is escaped. Links are generated only from
`NEXT_PUBLIC_APP_URL` and only allow HTTPS, except loopback/local HTTP outside
production. Outbox payloads contain stable identifiers and state, not message
bodies, OTPs, addresses, phone numbers, or recipient email addresses.

## Delivery flow

1. `processNotificationBatch()` claims only supported notification events in a
   short transaction with `FOR UPDATE SKIP LOCKED` and a five-minute lease.
2. The claim commits before template rendering or provider delivery.
3. The worker resolves the recipient from the protected order row, renders the
   typed template, and invokes the provider with the stable notification
   deduplication key.
4. Accepted or failed `NotificationDelivery` attempts are recorded separately.
5. The outbox worker marks the event complete, schedules exponential retry, or
   moves it to `DEAD` after five attempts.

Delivery is at-least-once. Any real provider adapter must support idempotent
submission keyed by the supplied deduplication key. A provider message ID means
accepted by the provider, not delivered to the recipient. Provider webhooks
must be authenticated before changing `ACCEPTED` to `DELIVERED`.

## Local verification

Set the following only for local development:

```dotenv
CHECKOUT_RUNTIME=database
NOTIFICATION_RUNTIME=development-memory
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Sign in to the MFA-protected administrator workspace and open
`/admin/notifications`. “Process test queue” uses the non-networked provider.
The page exposes event state and attempts but only hashed recipient references.

## Failed event review and retry

Only an administrator with `notifications.retry` may requeue a `DEAD` or
`RETRY` event. The retry action is audited as
`NOTIFICATION_RETRY_REQUESTED`. Review the last error category, provider
status, template/configuration, and recipient/source record before retrying.
Completed, pending, or processing events cannot be manually retried.

Do not reset attempt history or delete delivery records. A manual retry gets a
new attempt number. If a real provider may have accepted a timed-out request,
reconcile using the stable deduplication key and provider message ID first.

## Production activation checklist

- Approve a transactional email provider and sender/domain ownership. Candidate
  categories include Supabase custom SMTP for Auth messages and an SMTP/API
  transactional provider for application messages; no vendor is selected.
- Publish and verify provider-specific SPF and DKIM records, establish DMARC
  reporting/enforcement deliberately, and keep return-path/bounce handling
  aligned with the verified sender domain.
- Store provider credentials only in the deployment secret manager.
- Implement a provider adapter with timeout, idempotency, error categories,
  and authenticated delivery/bounce webhooks.
- Approve recipient consent and transactional/marketing separation.
- Configure distributed worker scheduling, alerting for `DEAD` events and
  queue age, retention, redacted logs, rate limits, and provider suppression
  handling.
- Verify templates in staging across supported clients and accessibility modes.
- Load-test workers against staging and test crash recovery between provider
  acceptance and database acknowledgement.
- Record provider daily/monthly quotas, per-recipient throttles, webhook limits,
  suppression rules and alert thresholds. Supabase's built-in Auth sender is
  restricted and is not acceptable for public production email.

Reserved environment variable names for a future adapter are
`NOTIFICATION_PROVIDER`, `NOTIFICATION_PROVIDER_API_KEY`,
`NOTIFICATION_FROM_EMAIL`, and `NOTIFICATION_WEBHOOK_SECRET`. They are not read
by the current implementation and setting them does not enable delivery.

Production notification delivery remains disabled until every item above is
approved and verified.
