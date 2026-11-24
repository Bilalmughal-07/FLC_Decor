# FLC Decor — Codex Production Implementation Addendum

**Status:** Approved scope, implementation pending. **Initial launch payment methods:** COD, Easypaisa, JazzCash, debit/credit cards. **Source of existing gaps:** `FINAL_AUDIT_REPORT.md`. This addendum supplements `FLC_Decor_Codex_Audit_Remediation_Prompt.md` and does not imply those findings have been fixed.

## Instructions to Codex

Read the audit report and prior remediation prompt before editing. Inspect actual code, migrations, dependencies, route handlers, tests, and deployment target. Preserve working UI and use incremental migrations. Create `IMPLEMENTATION_TRACKER.md` mapping each requirement below to files, tests, status (not started / implemented / verified / blocked), and evidence. Never mark a feature verified without an executed test. Do not enable live checkout or advertise unavailable payment methods until real credentials, policies, and end-to-end production validation are approved. Stop for owner approval at each business-policy gate and before destructive changes.

## 1. Checkout modes

- Support **guest checkout** without creating an account; support **authenticated checkout** with customer-owned cart, saved addresses, order history, and secure profile management.
- Checkout contact fields: email and Pakistani phone number (both required, verified as needed for sensitive actions). Delivery fields: country fixed to Pakistan initially, first name, last name, street address, optional apartment/suite, city, optional postal code; require province/region if shipping/courier policy needs it. Validate and normalize phone in E.164 format; avoid excluding legitimate Pakistani addresses. Provide clear field labels, validation, keyboard accessibility, and mobile layouts.
- For authenticated checkout, allow selection/editing of saved addresses and an explicit 'save address' choice; for guests, do not imply account-based address saving. Snapshot contact, address, line items, SKU/variant, unit prices, shipping, discounts, taxes, and totals into each order, independent of future catalog edits.
- Prices, inventory, delivery eligibility, shipping and tax are server authoritative. Reject unconfigured shipping/tax with a clear fail-closed message. Do not trust cart totals or customer-supplied payment status.
- Prevent double submissions with durable idempotency scoped to checkout identity and request fingerprint. Protect against concurrent overselling with PostgreSQL transactions, conditional stock writes/locks, inventory ledger, and rollback tests.

**Acceptance:** Automated guest and authenticated checkout E2E; field validation and mobile tests; concurrent last-item test results in exactly one successful reservation; same key+payload replays safely; same key+different payload conflicts; server rejects price tampering; restart preserves orders and stock.

## 2. Orders, lifecycle and ownership

- Model separate **order status**, **payment status**, and **fulfillment status**; do not conflate them. Example order statuses: PLACED, CONFIRMED, PREPARING, SHIPPED, DELIVERED, CANCELLED, RETURNED; define allowed transitions, permissions, timestamps, and reason codes. Payment statuses should cover PENDING, AUTHORIZED (if gateway supports it), PAID, FAILED, REFUND_PENDING, PARTIALLY_REFUNDED, REFUNDED; include expiry/cancel paths for abandoned attempts. Actual status timeline must reflect persisted events, never a hardcoded demo progression.
- Order number format such as `FLC-2026-000142` must be unique, non-guessability must not be the sole access control, and internal IDs should remain distinct.
- Persist order events and immutable financial snapshots. Guest orders can later be linked to an account **only after verifying ownership**, without exposing another customer's history. Customers may view only their own orders; administrators require role checks and mandatory admin MFA.
- Establish inventory reservation policy for pending online payments, expiry/release, successful payment, COD confirmation, cancellation, and refunds; use idempotent transitions and outbox events for external effects.

**Acceptance:** State transition matrix tested; unauthorized user cannot access or link others' orders; cancel/retry/webhook races do not duplicate stock release; timeline timestamps match database; old order totals remain unchanged after price edits.

## 3. Secure guest order tracking

- Tracking page requests order number and matching email **or** phone; these alone must not grant access to private details. Send short-lived single-use email link/code or SMS OTP to the order's recorded contact. Use constant/generic responses to avoid order enumeration. Hash verification secrets, limit attempts, rate limit by IP/contact/order, log abuse safely, expire challenges, and invalidate after use.
- On successful verification issue a narrowly scoped, expiring server-validated tracking capability/session for that order only. Do not place sensitive order data in URLs or logs. Show real order timeline, current status, and permitted delivery details. Allow resend with cooldown. Email/SMS provider failures should produce safe actionable UX.
- Signed-in customers access their own orders via account session; guests use verification. Do not silently disclose orders based on a matching unverified email.

**Acceptance:** Correct OTP grants access to one order; wrong/expired/reused OTP fails; guessed order+email cannot disclose details; generic responses do not reveal existence; rate limits enforced; capabilities expire and cannot access another order.

## 4. Notifications

- After **durable** order creation, enqueue transactional confirmation containing order number, item summary, amount, payment method/status, and tracking instructions. Notify on meaningful status changes, payment success/failure and refund events where applicable. Use a transactional outbox and idempotent background delivery; notification failure must never roll back an already committed order or cause duplicate orders.
- Email is required for launch; SMS confirmation is required **if the business commits to phone delivery** and a compliant SMS provider is configured. Collect both contact channels, but do not promise SMS until provider and costs are approved. No raw OTP or sensitive personal data in logs. Record delivery attempt/result without storing unnecessary message contents.
- Verify sender domain, SPF/DKIM/DMARC as applicable, templates, retry policy, dead-letter handling, and opt-out rules for marketing (transactional messaging is separate).

**Acceptance:** Provider sandbox shows email sent with accurate order number; duplicate events produce no duplicate notifications; transient provider outage retries; order persists despite delivery failure; test templates contain no secrets.

## 5. Four launch payment methods

### Common payment architecture
- Implement provider-agnostic `PaymentProvider` adapter interface and persistent `PaymentAttempt`, `PaymentTransaction`, `PaymentWebhookEvent`, `Refund`, and reconciliation records with unique provider IDs, amount/currency, timestamps and idempotency keys. Keep gateway secrets server-side and encrypted/configured through deployment secret management.
- **COD:** create a pending-payment COD order with the approved COD collection policy; never label COD as prepaid.
- **Easypaisa and JazzCash:** use only officially approved merchant integration or an approved payment aggregator supporting those methods. Verify actual onboarding, merchant eligibility, API contracts, callback signatures, settlement and refunds before selecting SDK/endpoints. Do not invent endpoints or credentials.
- **Cards:** use an approved PCI-compliant hosted checkout/redirect or tokenized provider. Never store or proxy raw PAN/CVV; avoid collecting card data in FLC-controlled forms. Verify 3-D Secure/SCA where supported/required by provider.
- Generate checkout sessions server-side with exact order amount and PKR currency. Verify gateway webhook authenticity, amount, currency, merchant/order mapping and event IDs; support duplicate/out-of-order events and provider status reconciliation. Browser redirect is informational only, not proof of payment.
- Use durable inventory reservation while payment is pending, with explicit timeout and recovery for unknown payment outcomes. Prevent double charge and double fulfillment on retries. Refunds must follow provider capabilities and approved policy, with audit logs and reconciliation.
- Expose only configured and operational payment methods. If any of the four cannot be integrated, **block the declared all-method launch** or seek explicit owner approval to change scope; never fake a successful payment.

**Acceptance:** For each of four methods, run provider sandbox end-to-end tests (or COD order lifecycle); payment-success webhook transitions exactly once; forged webhook fails; duplicate and out-of-order webhooks safe; browser success without provider confirmation stays pending; failed/expired payment releases inventory according to policy; refund and settlement reconciliation demonstrated where supported. Real production micro-transaction and settlement evidence required before launch.

## 6. Customer account

- Implement signup, email verification, login, logout, password reset, secure sessions with rotation/revocation, customer ownership checks, and optional customer MFA if required by the existing SRS. Use Supabase Auth if consistent with existing implementation and deployment; do not create competing password stores. Admin MFA is mandatory as specified in the audit.
- Account dashboard: paginated orders, order detail and status history, saved addresses, profile/contact preferences, password/session controls. No cross-account data leaks. Guest-to-account order claiming requires independent proof of order ownership.

**Acceptance:** New account can order and see only its own orders; reset and revocation work; admin preview is inaccessible to unauthorized users; account A cannot fetch account B's orders via API or direct URL; guest linking cannot steal an order.

## 7. Security, deployment, and quality gates

- Resolve all existing critical/high security findings in `FINAL_AUDIT_REPORT.md`, including vulnerable dependencies, admin protection, media upload processing, CSRF, rate limiting, observability and audit trails. Keep previous remediation tasks in scope.
- Run migrations on real PostgreSQL; never treat Prisma validation as transaction proof. Separate staging and production; configure backup + tested restore, secrets, health monitoring and error alerts. Add Playwright E2E, accessibility checks, responsive screenshots, and load/concurrency tests. Verify runtime compatibility with Cloudflare Workers or document and approve a different hosting choice.
- Create `PAYMENT_PROVIDER_DECISIONS.md`, `ORDER_STATE_MACHINE.md`, `GUEST_TRACKING_SECURITY.md`, `NOTIFICATION_RUNBOOK.md`, and update `PRODUCTION_READINESS.md`.
- Run lint, typecheck, unit/integration/E2E, dependency audit and clean production build; capture commands, results, environment and unresolved blockers. Tests using mocks alone cannot satisfy gateway or durable database criteria.

**Final acceptance:** All launch features are implemented; all P0/P1 findings closed with evidence; approved policies configured; real merchant integrations and settlement validated; no unauthorized data access; PostgreSQL restore drill passed; staging and production smoke tests passed. Until then keep live checkout disabled and report `NOT PRODUCTION READY`.

## 8. Business decisions requiring owner approval (do not invent defaults)

1. **Merchant onboarding:** Which legally registered business/person will own Easypaisa, JazzCash and card merchant accounts? Which gateway/aggregator, fees, settlement bank, KYC and supported payment/refund flows?
2. **Shipping:** Pakistan-wide or selected cities? Courier(s), serviceable areas, shipping fee rules, COD handling fee, minimum order, failed delivery and return-to-origin charges?
3. **Tax and invoices:** Applicable tax registration/treatment, whether prices include tax, invoices/receipts and rounding; obtain qualified local tax advice.
4. **Inventory:** Ready stock versus made-to-order; reservation duration for pending online payments; lead times and stock release triggers.
5. **Order acceptance:** Are COD orders automatically confirmed or manually reviewed? What triggers PREPARING/SHIPPED/DELIVERED? Courier tracking availability?
6. **Returns/refunds:** Eligibility, damaged/customized goods policy, cancellation cutoffs, refund destination, time limits and dispute handling.
7. **Notification channel:** Transactional email provider and verified sender domain; whether paid SMS is mandatory, SMS gateway and cost per message; WhatsApp notification opt-in if later desired.
8. **Account rules:** Mandatory email verification? Optional customer TOTP? Guest order claiming/linking policy and retention of saved addresses.
9. **Privacy:** Data retention/deletion windows, customer support contact, privacy/terms and consent for marketing.
10. **Infrastructure:** Paid Supabase tier/backup method, R2 bucket, deployment runtime, domain, secrets, budget, restore targets and production credentials.

**Codex execution order:** Audit/reconcile existing implementation → identify owner decisions and external gateway blockers → schema/migrations → auth and authorization → durable orders/inventory → guest tracking → payment adapters/sandbox → notifications → account UI/admin UI → security/hardening → E2E and performance → restore drill → staging → launch readiness report. Stop for explicit approval before turning on production payment collection or COD.
