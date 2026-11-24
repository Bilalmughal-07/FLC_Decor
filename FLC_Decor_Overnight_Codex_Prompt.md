# FLC Decor --- Overnight Codex Work Prompt

**Repository:** `D:\FLCdecor`\
**Objective:** Redesign the entire customer storefront and admin UI,
complete safe backend integration, and deliver a fully tested Cash on
Delivery (COD) workflow. Work autonomously overnight, but never fake
functionality or take unsafe production actions.

## 1. Non-negotiable rules

-   Inspect the repository before editing: read `AGENTS.md`, README,
    package scripts, route structure, components, styling, Prisma
    schema/migrations, auth, order/inventory logic, tests, and
    environment variable names.
-   Preserve the existing Next.js/React/TypeScript/Prisma/PostgreSQL
    architecture. Do not replace the stack or create duplicate auth,
    API, model, or domain layers.
-   Separate visual work from business logic. Do not rewrite working
    backend code merely to make styling easier.
-   Never print, commit, or expose secrets, `.env` values, tokens, OTPs,
    database URLs, or customer data.
-   Never fake Google login, email/SMS delivery, OTP verification,
    payment, or order success.
-   Do not deploy, push, reset databases, drop tables, perform
    destructive migrations, or send real customer notifications.
-   The protected original Supabase project must never be accessed or
    changed. The only staging project previously authorized is
    `dbzzlrlorctnuucodajk`; verify project identity before any hosted
    operation. If identity is uncertain, do not connect or mutate hosted
    data. Prefer a positively identified local test database.
-   Do not claim a feature is complete unless implementation and test
    evidence support it. Record blockers and continue with independent
    tasks.
-   Do not spend the whole night auditing. Audit briefly, then implement
    in priority order.

## 2. Primary visual specification: supplied screenshots

The two attached screenshots are the **primary design target** for FLC
Decor's customer storefront. Inspect them. If they are unavailable in
the local Codex session, ask the user to copy them into
`docs/ui-reference/`; meanwhile follow this specification without
claiming you inspected inaccessible files.

Recreate this visual language: - Warm ivory/off-white page background,
charcoal/near-black typography. - Oversized, high-contrast editorial
serif headlines with deliberate line breaks. - Small uppercase eyebrow
labels and restrained letter spacing. - Minimal header/navigation, thin
subtle dividers, generous whitespace. - Restrained buttons and form
controls; elegant, quiet, editorial feel. - Carefully aligned content
widths, page gutters, section spacing and product grids. - Product
imagery must be prominent, consistently sized, correctly cropped, and
never collapse. - Subtle hover/focus transitions; respect
`prefers-reduced-motion`. - Avoid generic template styling, loud
gradients, excessive shadows, random rounded cards, decorative clutter,
and unnecessary animation.

Suggested starting tokens (inspect existing implementation before
replacing anything):

``` css
:root {
  --color-background: #F8F6F2;
  --color-surface: #FFFFFF;
  --color-foreground: #242424;
  --color-muted: #746F69;
  --color-taupe: #A79A8A;
  --color-brass: #B39B7D;
  --color-stone: #EAE6DF;
  --color-border: #E6E1DA;
  --font-display: "Cormorant Garamond", Georgia, serif;
  --font-body: "Inter", Arial, sans-serif;
  --content-max: 1440px;
  --page-gutter: clamp(20px, 7.5vw, 132px);
  --section-space: clamp(64px, 9vw, 132px);
}
```

Use the framework's supported font loading and avoid layout shift.

### Critical screenshot defect to investigate

The supplied collection screenshot visibly has product titles/prices
without properly rendered product imagery, and price labels
overlap/collide. Fix the underlying cause, not just the CSS symptom.
Investigate: - Missing/invalid image URLs or incorrect image props. -
Collapsed image containers or wrong aspect ratios. - Broken grid columns
or absolute positioning. - Duplicate selected-price / starting-price /
variant-price labels. - Inconsistent product media data shapes. -
Loading/error states that hide failed images.

Create a deliberate fallback only for products that genuinely lack
imagery. Never fabricate product images, product names, prices,
discounts, ratings, or testimonials.

### Pages in scope --- customer storefront

-   Homepage: header, hero, collections, featured products,
    story/editorial sections, brand/value content, footer.
-   Shop/collection listing: title/intro, search,
    category/finish/size/stock/price filters, sorting, result count,
    responsive grid, pagination/load-more if supported,
    empty/loading/error states.
-   Product detail: gallery, title, price, variants, stock, quantity,
    add-to-bag, product details, available shipping/returns information,
    related products.
-   Search results and collection pages.
-   Cart/bag: line items, variants, quantity, remove, subtotal, shipping
    information, checkout CTA, empty state.
-   Login, registration, email verification, forgot/reset password,
    account dashboard, profile, order history/detail/tracking.
-   Checkout and COD confirmation.
-   Contact/bespoke inquiry pages, respecting the current rule that
    custom orders may be paused or routed to WhatsApp.
-   Shared navigation, footer, dialogs, dropdowns, toasts, forms,
    skeletons and error states.

### Admin UI

Give admin a separate, restrained, functional SaaS design; do not copy
the storefront into a dashboard. Improve navigation, dashboard metrics,
orders/list/detail/status actions, product/category/variant management,
inventory, customers, media, audit logs, settings, and responsive
behavior. Metrics must use real data. Every visible action must work.

## 3. Research references and MCP tools

### Pyari Walls

Reference: https://pyariwalls.pk/

Inspect its public pages for useful e-commerce patterns: homepage
section order, collection/category merchandising, product-card
composition, product detail hierarchy, discovery, shopping flow,
trust/delivery messaging, and footer organization.

Do not clone its branding, copy, images, CSS, or exact layout. The
supplied FLC screenshots remain the visual authority. Borrow only useful
shopping patterns and adapt them to FLC Decor. If inaccessible, record
that and continue without inventing observations.

### Mobbin MCP

Check whether already configured, then configure only if absent:

``` bash
codex mcp add mobbin --url https://api.mobbin.com/mcp
```

Verify it is available and authenticated before claiming use. Research
real e-commerce screens and flows: home, collection, product detail,
cart, checkout, account/login and admin/dashboard. Record useful
patterns and why they fit. Do not copy protected assets/code. Do not
bypass authentication.

### Watermelon UI MCP

Check whether already configured, then configure only if absent:

``` bash
codex mcp add watermelon --url https://mcp.watermelon.sh/mcp
```

Verify tools are actually available. Use it to discover reusable React
components, page sections, templates and restrained animations. Inspect
dependencies, accessibility, responsive behavior, licensing/usage
constraints and maintenance before adopting anything. Do not add a large
dependency for one component.

### Impeccable

Inspect package manager and installation state first. If not installed,
run in the project root:

``` bash
npx impeccable install
```

Inspect generated changes before accepting them. Use its design/audit
skillset to improve the actual implemented UI, not just produce a
report. If interactive, asks to overwrite, or requires an unclear
choice, do not guess; record the blocker and continue.

### BrowserAct CLI

Follow this exact sequence:

``` bash
browser-act --version
```

If installed, immediately load the full core skill:

``` bash
browser-act get-skills core --skill-version 2.0.2
```

Do not truncate those instructions. Follow its workflow and
confirmation/safety gates.

If missing, check `uv --version`. If `uv` exists:

``` bash
uv tool install browser-act-cli --python 3.12
```

Then verify `browser-act --version` and load the core skill. If both
BrowserAct and `uv` are missing, do not install system tooling without
user approval; continue with Playwright and report BrowserAct as
blocked. Never use real customer accounts or perform real orders,
notifications, or payments during QA.

## 4. Phase 1 --- audit and baseline

1.  Confirm repository root.
2.  Read project instructions, README and package scripts.
3.  Map all customer/admin routes and shared components.
4.  Trace product image, variant, price, stock, cart, checkout, auth and
    order data flows.
5.  Inspect Prisma schema/migrations and identify the database target
    without printing secrets.
6.  Inspect auth providers and environment variable names only.
7.  Inspect existing tests and coverage.
8.  Run baseline lint, typecheck, unit tests, build and relevant
    Playwright tests. Record pre-existing failures.
9.  Run the app and inspect rendered desktop/mobile pages.

Create: - `docs/UI_AUDIT.md` --- route-by-route defects, severity,
evidence and fix. - `docs/OVERNIGHT_IMPLEMENTATION_LOG.md` --- stages,
files, commands, results and blockers. - `docs/INTEGRATION_GAPS.md` ---
missing provider credentials/config and unverified integrations.

Severity: Critical (broken auth/checkout, data exposure, severe mobile
failure); High (missing images, overlaps, broken navigation/forms);
Medium (hierarchy/spacing/type/states); Low (minor polish).

## 5. Phase 2 --- design system

Consolidate reusable tokens/components for colors, semantic states,
typography, line heights, spacing, max-widths, responsive breakpoints,
grids, image ratios, borders, buttons, forms, validation, focus, badges,
dialogs, drawers, dropdowns, toasts, skeletons, empty/error/success
states.

Use semantic HTML, accessible names, visible keyboard focus, keyboard
operation, sufficient contrast, and sensible touch targets. Do not
communicate status through color alone. Avoid arbitrary page-specific
overrides; fix shared primitives.

## 6. Phase 3 --- storefront implementation

Prioritize: global header/footer → homepage → collection listing →
product cards/images → product detail → search/filter/sort → cart →
auth/account → checkout/order confirmation → responsive polish.

### Listing acceptance criteria

-   Balanced, symmetrical grid at each breakpoint.
-   Consistent product image ratio and card spacing.
-   Image/category/title/price/badges align consistently.
-   No overlapping, clipped or duplicated price labels.
-   Variant pricing is accurate.
-   Filters/sorting actually affect results and can be cleared.
-   Result count matches results.
-   Empty/loading/error states are designed.
-   Mobile filters are usable in a drawer or compact layout; no
    horizontal overflow.
-   Nested buttons remain independently operable.

### Homepage acceptance criteria

-   Hero clearly explains what FLC Decor sells and has a clear shopping
    action.
-   First viewport has deliberate hierarchy.
-   Product/collection sections align consistently and respond properly.
-   No filler sections just to lengthen the page.
-   Use real catalog content; no fake testimonials, ratings, discounts
    or unsupported claims.
-   Mobile is intentionally composed, not merely compressed desktop.

## 7. Phase 4 --- authentication and verification

Audit and reuse the existing auth provider. Do not create a parallel
auth system.

### Registration/email verification

Implement or complete validated registration; secure password hashing
through the existing reputable auth approach; email verification link or
OTP; cryptographically random, single-use, expiring verification secret;
hashed token/OTP storage where applicable; resend cooldown; rate/attempt
limits; verified/pending states; and safe handling of
expired/already-used codes.

Do not allow unverified accounts to perform actions requiring verified
identity. Never hard-code OTPs or log them. Do not claim an email was
sent unless the provider confirms success.

### Login/logout/password reset

Implement correct credential verification, secure sessions/cookies,
logout invalidation, expiring single-use password-reset token, rate
limits, safe errors, and server-side protection for account/admin
routes. Apply session rotation/invalidation appropriate to the current
auth design.

### Google login

Implement Google OAuth only through the existing supported auth
library/provider: - Configure using environment variables; never invent
credentials. - Validate callback/state/CSRF protections and
account-linking rules. - Do not auto-link accounts based only on an
unverified email. - Handle cancel, provider error, existing account and
success. - If credentials are absent, do not show a fake working button
or simulate success. Hide/disable it deliberately or show a clear
unavailable state. - Document exact variable names and Google Console
setup needed, never secret values.

### Phone OTP

If existing checkout policy requires phone verification for guest
checkout/first order, implement via an SMS provider supporting Pakistani
`+92` numbers. Normalize numbers; hash OTPs; enforce expiry, attempt
limits, resend cooldown and rate limits; reverify changed phone numbers.
If provider credentials are missing, implement a safe adapter/config
check and mark real delivery blocked. Never pretend an OTP was sent.

## 8. Phase 5 --- end-to-end COD workflow (required)

**COD is in scope. Online payment gateway integration is explicitly out
of scope.** Do not integrate or activate cards, Easypaisa, JazzCash,
bank transfer or other online payments. Do not create fake
payment-success states. Keep checkout to COD unless another method is
already genuinely operational and explicitly approved. Preserve
historical records safely.

### Customer COD flow

1.  Customer reviews cart and variants.
2.  Guest or authenticated checkout follows existing policy.
3.  Collect required contact and shipping details.
4.  Verify email/phone where policy requires it.
5.  Server re-fetches product/variant data and validates
    active/purchasable product, variant ownership/status, stock, valid
    quantity, address and shipping rules.
6.  Calculate all prices/totals on the server. Never trust
    client-supplied prices, discounts, stock or totals.
7.  Show order review with items, variants, quantities, subtotal,
    configured shipping, total and COD method.
8.  Require explicit confirmation.
9.  Create order and items transactionally.
10. Reserve/decrement stock according to the existing inventory model
    with concurrency protection and rollback.
11. Generate a sufficiently unpredictable order reference.
12. Prevent duplicate orders from retries/double-clicks using
    idempotency or equivalent.
13. Show confirmation only after successful database commit.
14. Send notifications only if provider confirms; record delivery state
    and retry safely if supported.
15. Show order in account history.
16. Guest tracking must verify order number plus verified email/phone;
    guessing an order number must not expose details.

### Admin COD flow

-   New COD order appears in admin.
-   Detail includes customer/address, items, variant, quantity, total
    and payment method.
-   Payment state is clearly COD/unpaid or the existing equivalent.
-   Valid fulfillment transitions, e.g. pending/confirmed → processing →
    shipped → delivered; cancellation/failed delivery only if supported.
-   Only authorized admins can mark COD collected/paid; audit log the
    action.
-   Customers cannot change order status or mark COD paid.
-   Validate status transitions server-side.
-   Preserve history/timestamps if supported. Add only
    backward-compatible migrations after review.

### COD edge cases to test

-   Stock runs out between cart and checkout.
-   Concurrent attempts for last unit.
-   Invalid/inactive variant.
-   Client tampers with price/total.
-   Duplicate submit/network retry.
-   Invalid address.
-   Contact unverified when required.
-   Transaction failure.
-   Notification provider unavailable after order creation.
-   Guest attempts another customer's order.
-   Customer cancellation where allowed.
-   Invalid admin transition.
-   Duplicate COD collection action.

Do not integrate a shipping carrier unless already configured and in
scope. Do not invent shipping prices or policies; document missing
business decisions.

## 9. Phase 6 --- admin/backend integration

Connect all UI to real backend actions and database data. No
decorative/inert buttons.

Verify product/category/variant CRUD; image
upload/storage/optimization/deletion; inventory updates; order
search/filter/detail/status/audit; customer access controls; real
dashboard metrics; pagination; server-side authorization and validation;
sensible loading/error/success states; no N+1/unbounded queries; no
privileged database access from browser bundles.

Reuse existing server actions/API routes/domain services. Do not
duplicate Prisma models or endpoints.

## 10. Phase 7 --- Playwright and BrowserAct validation

Playwright is mandatory if already installed. BrowserAct is additional
rendered-browser QA when available.

Test at: - Desktop 1440×900. - Laptop 1280×800. - Tablet 768×1024. -
Mobile 390×844. - Narrow mobile 360×800.

Cover homepage, listing with products, empty listing, product
detail/variants, missing optional image, search/filter/sort, cart and
empty cart, registration/login/verification/reset UI, COD checkout using
local test DB/fixtures, order history/detail/tracking, admin dashboard
and management screens, navigation, dialogs, dropdowns and form
validation.

Capture screenshots for major routes/viewports. Check horizontal
overflow, broken images, console errors, failed critical requests,
overlaps, accessible names, inert actions, focus visibility, keyboard
operation, grid/card alignment.

Use stable test fixtures, not live customer data. Mask only truly
dynamic content, never hide layout defects.

If BrowserAct is available, inspect rendered homepage, listing, product
detail, account, cart, checkout and admin; capture desktop/mobile;
interact with filters, navigation, variants, cart and forms using safe
test data. Fix defects and repeat. Never submit real orders or send real
messages.

### Visual pass criteria

-   Product imagery displays at intended size or deliberate fallback.
-   No title/price overlap.
-   Product grid symmetry/alignment.
-   Consistent header/footer.
-   Consistent content width/gutters.
-   No unintended horizontal scroll.
-   Typography follows screenshot direction.
-   Controls have hover/focus/disabled/loading/error states.
-   All visible primary actions work.
-   Mobile is intentionally designed.
-   Admin is independently coherent and usable.

## 11. Phase 8 --- security/regression

Test auth and authorization, admin RBAC, IDOR on orders/accounts, CSRF
where applicable, XSS-safe rendering, safe ORM usage, rate limits,
session cookies, server-side totals/stock, transactional
concurrency/rollback, idempotent orders, admin audit logs, secret
isolation, and privacy-safe errors/logs.

Never weaken RLS, grants, database roles, auth checks or security
headers to make tests pass.

## 12. Phase 9 --- final checks and report

Run actual project scripts for formatting/lint, typecheck,
unit/integration tests, Prisma validation/migration checks appropriate
to local environment, Playwright E2E and production build.

Do not run hosted migrations unless target identity and authorization
are proven. Do not deploy.

Update the three docs created in the audit. Update README/setup docs
only if required.

Final report must state: 1. Implemented pages/features. 2. Specific
visual defects fixed. 3. COD flow implemented and tested. 4. Email
verification, password reset, Google OAuth and phone OTP status:
implemented, locally tested, provider-blocked or not implemented. 5.
Mobbin, Watermelon, Impeccable and BrowserAct status separately:
configured, available, used or blocked. 6. Exact test commands and
pass/fail/skip counts; build result. 7. Database/migration changes and
whether tested locally. State whether any hosted database was changed.
8. Exact remaining blockers/credentials/business decisions. 9. Important
files changed. 10. Commands to run locally.

Never say "everything is done" or "production ready" without evidence.

## 13. Overnight priority order

1.  Audit and baseline test results.
2.  Fix product image/card/price defects.
3.  Shared design tokens and responsive primitives.
4.  Header, homepage, collection listing, product detail.
5.  Cart, account, login/register, checkout.
6.  End-to-end COD backend and admin workflow.
7.  Safe auth/verification integrations supported by configured
    providers.
8.  Admin redesign.
9.  Playwright visual/functional QA and BrowserAct if available.
10. Fix regressions, final tests/build, completion report.

If time runs short, do not leave a half-applied migration or broken
checkout. Finish the current safe unit, test it and document remaining
work.

## Final instruction

Make the actual code changes; do not merely recommend them or create
static mockups. The customer storefront must closely follow the supplied
FLC Decor screenshots' editorial ivory/charcoal style. Pyari Walls is
only a source of useful merchandising patterns, not a design to clone.
Deliver a responsive, accessible, beautiful and genuinely interactive
store; a coherent admin; and a complete tested COD workflow. Implement
real authentication/verification only where provider setup allows. Never
fake functionality, expose secrets, touch the protected production
database, or deploy without explicit authorization.
