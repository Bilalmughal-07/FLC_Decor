# Guest tracking security design

Tracking remains fail-closed in the application. The new database challenge/capability tables are storage primitives, not proof that an email/SMS verification flow exists.

Target protocol: accept order number plus recorded email or phone, return a generic response independent of match, hash normalized destination and challenge, send through an approved provider using an outbox, enforce attempt/resend/IP/contact/order limits, and expire/consume challenges exactly once. After successful challenge, issue a random short-lived capability and store only its hash, scoped to one order and read-only timeline fields. Never place order details or PII in URLs/logs. Account history requires authenticated identity ownership at every read. Challenge/capability issuance is not enabled until provider credentials, retention and abuse controls are configured.
