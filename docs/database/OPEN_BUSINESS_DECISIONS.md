# Open business decisions affecting the database

No migration or schema default in this project should be interpreted as business approval.

| Decision | Current safe behavior | Owner input needed before activation |
|---|---|---|
| Payment launch scope | Schema can represent COD/Easypaisa/JazzCash/cards; no online method activates | Resolve conflict: `02_SRS.md` says COD only, new addendum names four methods; merchant ownership, provider, KYC, fees, settlement, refund/callback details. |
| Shipping | No live quote/checkout | Pakistan coverage, courier, service zones, fees, handling, delivery/return-to-origin. |
| Tax/invoices | No live total | Registration/tax treatment, inclusion, invoice/rounding; qualified local adviser. |
| Inventory location | Schema supports locations; local `MAIN` backfill is not a production warehouse assertion | Physical warehouse, stocktake, SKU conventions and adjustment approvals. |
| Reservation lifecycle | Ready stock and active reservation model only | COD confirmation/commit timing; pending online reservation duration, expiry and late payment behavior. |
| Order lifecycle | No production transition API | Allowed transitions, cancellation cutoffs, shipment/delivery evidence and return/refund behavior. |
| Identity and guest claim | No production authority; guest tracking remains unavailable | Supabase Auth or alternative, email verification/reset, guest-to-account ownership claim. |
| Notifications | Outbox schema only; no provider sends | Email sender/provider, SMS necessity/cost, templates, retention and transactional consent. |
| Privacy/retention | No automatic purge of customer/order history | Legal review and retention/deletion periods, audit policy and backup deletion behavior. |
| Hosting/availability | Production database runtime disabled | Supabase plan/region, pooling, HA, secrets, backups, RPO/RTO, runtime and budgets. |
| Analytics | Canonical definitions documented; no dashboard | Gross/net, COD outstanding, refunds, shipping/tax metrics and timezone/reporting requirements. |
