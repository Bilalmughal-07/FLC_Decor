# Product Requirements Document — Fahad Laser / FLC Decor

**Version:** 1.0 development baseline. **Market:** Pakistan. **Model:** single vendor.

## Vision and positioning
Build a premium, visually expressive yet usable online destination for laser-cut decorative products. FLC Decor should feel more curated and design-led than a crowded marketplace, with refined 3D moments and an exceptionally clear shopping experience.

**Proposed motto:** Crafted with Precision. Designed to Inspire.  
**Store line:** Turn Your Walls Into a Statement.

## Audience and outcomes
- Guests discover decor, choose valid variants, and place COD orders without registration.
- Registered customers manage accounts, optional MFA, and order history.
- One administrator maintains categories, products, variants, media, stock, and orders.
- Customers can send custom-design inquiries through WhatsApp.

## MVP / launch scope
- Home, category and search pages, product details, image gallery, variant selection, cart, checkout, confirmation, guest order tracking.
- Email/password customer accounts, secure sessions, optional TOTP; admin mandatory TOTP.
- Two-level admin-managed categories; one primary category per product and optional extra placements.
- Name/category/price/size/color/availability filters; featured, newest, price, alphabetical sorting; default featured then newest.
- Per-variant price, optional sale price, independent inventory, shared images.
- COD only; guest checkout; transactional order placement, inventory reservation at success, idempotent retry.
- Admin dashboard, catalog, inventory, order inspection and controlled status management.
- Light/dark themes, premium mobile-first UI, accessible motion and 3D enhancements.
- Third-party courier fulfillment; exact charges, integration, packaging and returns are not defined.

## Not in launch
Affiliate accounts, marketplace sellers, onsite custom-order configurator, online payments, mandatory phone OTP for all COD orders, advanced multi-admin RBAC.

## Success and release gates
- No overselling or duplicate orders for the same valid idempotency identity.
- Accurate purchase-time price snapshots; server-calculated totals.
- Secure admin MFA and private guest tracking.
- Responsive, usable checkout even with motion disabled.
- Development demo runs on free-tier services with synthetic data; production launch blocked until durability, recovery, and policy gaps are resolved.

## Business rules pending approval
Shipping fees, courier choice/integration, return/refund/cancellation policy, exact order transitions, taxes, retention periods, public business contact details, final brand motto and claims. Do not infer policies from pyariwalls.pk.
