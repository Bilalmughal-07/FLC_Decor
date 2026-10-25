# Software Requirements Specification — FLC Decor

## Functional requirements (MUST unless noted)

### Catalog and discovery
- **FR-001** Home shows brand hero, featured products, categories, editorial sections, and WhatsApp custom-inquiry CTA.
- **FR-002** Admin manages parent/subcategories, max depth two; a product has one primary and optional additional category placements without duplicating inventory.
- **FR-003** Product pages show images, description, available size/color combinations, variant price and availability.
- **FR-004** Search by product name; filter by category, price, size, color, stock; combined variant filters match the **same existing variant**.
- **FR-005** Sort by newest, price low/high, alphabetical and featured; default featured-first then newest. Stable tie-breaking required.
- **FR-006** Products have independent per-variant stock and regular/optional sale prices; backend is price authority.
- **FR-007** Products and variants can share images; product archival preserves historical order snapshots.

### Cart and checkout
- **FR-008** Guest and logged-in customers can add, remove and update valid variant quantities; cart is not a stock reservation.
- **FR-009** Checkout collects required delivery/contact details; exact shipping fee logic remains TBD and must be visibly configured before live use.
- **FR-010** COD is the only initial payment option; online payments are future scope.
- **FR-011** Checkout atomically creates order, reserves exact variant stock, and records idempotency outcome. Reject insufficient stock; no partial order.
- **FR-012** Same valid idempotency key and request identity returns original result; conflicting payload returns controlled conflict. Retried unknown outcomes are resolved by original key.
- **FR-013** Acknowledged order must meet single-database-instance failure durability guarantees in production; if unavailable, fail closed on new critical writes.
- **FR-014** COD stock is not automatically released by generic unpaid-payment expiry. Future prepaid unpaid expiry release must be idempotent and policy-bound.
- **FR-015** Unique order number; store purchase-time product name, variant labels, unit price, discount, quantity and totals.

### Accounts and admin
- **FR-016** Customer email/password registration, login, logout, secure reset and server-managed revocable sessions.
- **FR-017** Optional customer TOTP MFA, secure enrollment, replay prevention and hashed recovery codes.
- **FR-018** Admin login requires TOTP MFA; secure recovery; every privileged endpoint checks authorization and logs sensitive actions.
- **FR-019** Registered customers see own orders only; guest tracking requires order identifier **and verified control of associated email** (e.g. expiring one-time email link/code), not mere entry of address.
- **FR-020** Admin manages products, categories, images, variants, stock adjustments, orders and dashboard summary; inventory adjustments are audited.
- **FR-021** Status transitions must be validated server-side; transition map TBD and must be finalized before operational use.
- **FR-022** COD fraud protections: baseline validation, progressive rate limits, risk-based challenge/review, not blanket phone OTP.

### Media and UX
- **FR-023** Only authorized admin uploads; validate actual JPEG/PNG/WebP content, size/pixel caps, decode/re-encode, strip EXIF, isolate pending media.
- **FR-024** Shared image cannot be deleted while referenced; orphaned media recoverable for 30 days before eligible cleanup; deletion jobs recheck references.
- **FR-025** Custom requests redirect to configurable WhatsApp contact; no onsite custom workflow.
- **FR-026** Light/dark themes; OS default; keyboard navigation, accessible forms, reduced-motion fallback.
- **FR-027** 3D/scroll effects enhance storytelling but never gate shopping, checkout, product information, or accessibility.

## Nonfunctional requirements — production target, not free demo guarantee
- **NFR-001** Design/test for 1,000 concurrent visitors under representative traffic mix; not 1,000 checkouts/sec.
- **NFR-002** Product-page LCP <= 2.5s p75 on representative mobile.
- **NFR-003** Search/filter p95 <= 500ms; add-to-cart p95 <= 500ms where server-based; COD checkout p95 <= 2s under healthy defined load, excluding external verification delays.
- **NFR-004** Unexpected HTTP 5xx < 1% at defined peak; zero oversell and duplicate same-key orders.
- **NFR-005** 99.9% monthly availability for defined critical journeys.
- **NFR-006** Broad disaster RTO 1h / RPO 15m; stronger acknowledged-order durability applies to supported single DB instance failure.
- **NFR-007** Automatic app and DB failover; DB failure-to-new-successful-durable-checkout target <= 2m, including detection/reconnection; fail closed if durability unsafe.
- **NFR-008** TLS, secure HttpOnly/Secure/SameSite session cookies, CSRF protection, Argon2id or comparable password hash, encryption of selected sensitive fields, encrypted backups, managed secrets.
- **NFR-009** Least privilege; separated dev/staging/prod; coding agents without production secrets by default.
- **NFR-010** CI checks, rolling deployment, backward-compatible migrations, rollback, structured logs, metrics, traces, actionable alerts, tested restores.
- **NFR-011** Category-specific retention; durations and legal obligations TBD; deletion must handle restored backups.

## Core acceptance scenarios
1. Two buyers compete for last unit: only one succeeds.
2. Repeated checkout key: exactly one order and one stock decrement.
3. Same key different payload: conflict, no new order.
4. DB becomes unsafe: no success confirmation; ambiguous commit resolved by original key.
5. Guest knows order ID but cannot verify email: no order details.
6. Customer without TOTP can checkout; admin without valid TOTP cannot access admin.
7. Image shared by two variants survives deletion of one reference.
8. Unreferenced image remains recoverable for 30 days.
9. Invalid size/color combination cannot be purchased.
10. Client-forged price ignored; server validates and presents changed total before confirmation.
