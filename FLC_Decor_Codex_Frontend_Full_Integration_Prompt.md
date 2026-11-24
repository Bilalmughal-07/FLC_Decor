# FLC Decor — Complete Stitch Frontend Implementation and End-to-End Integration

You are a senior Next.js/TypeScript frontend engineer, UI/UX specialist, full-stack engineer, database engineer, and QA engineer. Work in the **existing** FLC Decor repository, not a newly scaffolded project.

## 1. Locations and source of truth

- Existing application: `D:\FLCdecor`
- Downloaded Google Stitch HTML designs: `D:\FLCdecor\stitch_flc_decor_e_commerce_platform`
- The existing repository, actual APIs, Prisma schema, migrations, tests, and environment configuration are the source of truth for implementation status. Do not assume features exist solely because they are described here.

First inspect the repository and recursively inventory every exported HTML, CSS, JavaScript, image, font, and other asset. Identify all screens, responsive variations, shared components, and interactions. Map each design to its intended Next.js route. Record missing designs rather than pretending they exist.

## 2. Objective

Convert the Stitch designs into a cohesive, beautiful, fully responsive, interactive, smoothly animated, accessible, high-performance **Next.js + TypeScript** storefront and applicable admin UI. Integrate the frontend with the existing backend, and the backend with the existing PostgreSQL database, end to end. Preserve working business logic, security, tests, and data integrity.

Do not paste standalone exported HTML pages into Next.js unchanged. Translate them into reusable, maintainable React components. Preserve the Stitch appearance closely while making the interface genuinely functional.

## 3. Confirmed business contact information

Use these **correct** details consistently in public-facing contact, footer, customer support, and appropriate business-information sections:

- Brand: **FLC Decor**
- Contact person: **Fahad Ali** (NOT Muhammad Fahad)
- Phone / WhatsApp: **0309 8663816**
- Email: **fahadaliali712@gmail.com**
- Address: **Mughal Pura, Prince Road, Gujranwala, Pakistan**
- WhatsApp URL: `https://wa.me/923098663816`
- Email URL: `mailto:fahadaliali712@gmail.com`
- Telephone URL: `tel:+923098663816`

Centralize these details in a typed configuration module. Do not invent other contact information, social accounts, business hours, shipping promises, guarantees, or manufacturing claims. Show the contact person's name only where relevant.

## 4. Brand and visual design

Use Stitch as the primary visual reference. Preserve **Quiet Luxury Meets Modern Minimalism**:

- Warm ivory `#F8F6F2`, white `#FFFFFF`, charcoal `#242424`, warm taupe `#A79A8A`, champagne brass `#B39B7D`, light stone `#EAE6DF`.
- Editorial serif headings; Inter or Plus Jakarta Sans for UI text.
- Spacious layouts, warm neutral photography, precise typography, subtle glassmorphism, restrained borders/shadows, consistent Lucide-style icons.
- Preserve spacing, proportions, visual hierarchy, imagery, and component patterns from the export where practical.
- No generic redesign, clutter, aggressive gradients, excessive parallax, or distracting motion.

Build reusable tokens and components: header, mobile navigation, footer, buttons, forms, cards, badges, dialogs, drawers, product grids, galleries, variant selectors, cart, checkout, account, tracking, and admin components.

## 5. Preserve the existing backend

Audit the actual implementations and API contracts before changing them. Preserve:

- Prisma/PostgreSQL schema and existing migrations.
- Catalog and category APIs.
- Transaction-safe inventory reservation and adjustments.
- Checkout idempotency and concurrency safeguards.
- Customer ownership and private-field protections.
- Admin server-side authorization and MFA boundaries.
- Guest tracking verification protections.
- Payment integrity and notification outbox semantics.
- Existing automated tests and CI checks.

Avoid schema changes unless genuinely required, justified, reviewed, and accompanied by safe migrations and tests. Do not replace working logic with browser-only mocks. Never disable authorization or expose secrets to the client.

## 6. Pages and user journeys

Implement all screens supported by the Stitch exports, and complete missing essential flows using the same design system where safe and feasible. Include:

### Storefront

- **Homepage:** responsive announcement/header, premium hero, admin-managed categories, featured products, brand story, lifestyle sections, contact/footer. Replace demo catalog data with real backend responses.
- **Shop, category, and search:** two-level admin-managed parent/subcategories; search, filtering, sorting, URL query synchronization, product cards, pagination/load more as supported, skeleton/empty/error states.
- **Product details:** real product name, PKR price, description, materials/dimensions when available, SKU, stock, variant selectors, gallery, related products, cart actions.
- **Product cards:** subtle hover image zoom, variant indicators, stock state, accurate pricing, quick view only when supported.
- **Cart:** slide-out drawer and full page, quantity edits, remove, selected variants, subtotal, stock validation, persistence, clear feedback and empty state.
- **Checkout:** guest and authenticated checkout where supported, address, delivery, enabled payment methods, authoritative server totals, accessible validation, loading/error handling, duplicate-submit protection.
- **Order confirmation and tracking:** real server-backed order details after authorized confirmation; guest tracking requires verification, with expired/invalid states and an accurate status timeline.
- **Accounts:** login/registration/recovery where supported, profile, saved addresses, order history/details, logout; use real secure identity and authorized APIs, never frontend-only authentication.
- **Content/support:** About, Contact, FAQ, shipping, returns, privacy, terms, and not-found/error pages. Use verified business copy; do not invent policies.
- **Custom orders:** WhatsApp inquiry link only for initial launch; do not build a full custom-order checkout workflow.

### Admin

Inspect the Stitch export for admin designs. Implement those faithfully where present; if absent, preserve existing admin UI and report design gaps. Integrate permitted product, category, variant, media-reference, inventory, order, customer, dashboard, audit, and settings workflows with existing server-side controls. Never make admin access depend on a client-side role check alone.

## 7. Product gallery and variant synchronization — mandatory

- Main image, thumbnail rail, multiple product and variant-specific images, optional lifestyle/close-up photos when present.
- Clicking/tapping an image opens an accessible full-screen lightbox.
- Support zoom in/out, mobile pinch zoom, pan while zoomed, swipe navigation, desktop previous/next buttons, arrow keys, Escape, image counter, close button, and focus management.
- Variant changes update image/gallery, price, SKU, availability, and labels from actual backend data; smooth 250–350 ms crossfades.
- Fall back to shared product imagery when a variant has no dedicated image. Do not fabricate media or inventory.

## 8. Responsive mobile experience — mandatory

Verify at approximately **390px, 768px, 1024px, and 1440px**.

- Deliberately designed mobile layouts, not merely shrunk desktop screens.
- Sticky compact header, functional hamburger navigation drawer, search/cart/account access, touch-friendly controls.
- Mobile category navigation, filter/sort bottom sheets, readable two-column product grid when space permits.
- Swipeable product galleries and mobile image zoom.
- Mobile product variant selectors, clear pricing, and sticky Add to Cart CTA where appropriate.
- Checkout forms with good keyboard behavior and collapsible order summary.
- No horizontal overflow, overlap, broken text, inaccessible buttons, or layout shifts.

## 9. Motion and interactivity

Implement polished, restrained interactions using the existing animation stack or Motion for React if compatible:

- Header/menu and cart drawers; modal and filter sheet transitions.
- Subtle card/image hover effects, image crossfades, accordion/tab transitions, toast feedback.
- Loading skeletons, form validation states, scroll reveals where appropriate.
- Suggested timings: buttons 150–200 ms; drawers 220–320 ms; images 250–350 ms; reveals 350–500 ms.
- Prefer opacity/transform animation; avoid layout thrashing and large JavaScript bundles.
- Respect `prefers-reduced-motion` and support keyboard interaction.

## 10. Accessibility, SEO, and performance

- Semantic HTML, logical heading order, visible focus states, keyboard support, labels, live feedback, accessible dialogs, meaningful alt text, good contrast, sufficiently large touch targets.
- Optimize images with Next.js Image where appropriate, responsive `sizes`, lazy loading, efficient fonts, stable layouts, sensible caching and data fetching.
- Add verified metadata, canonical URLs, Open Graph, sitemap integration, and structured product data based only on real product records.
- Avoid indexing private account, checkout, admin, and demo pages.

## 11. Media and payment boundaries

- Distinguish Stitch mock photography from actual product media. Do not publish fake products, stock, or prices as live inventory.
- Connect to the existing media-reference model; implement actual R2 upload/delivery only if credentials, infrastructure, and secure upload rules are available. Never expose R2 secrets.
- **Cash on Delivery (COD)** is the initial intended payment method. Do not activate JazzCash, Easypaisa, bank/card payment, or any gateway without real approved configuration and tested server-side verification.
- Production checkout has previously been intentionally disabled due to unfinished pricing/shipping/tax/policy and operational integrations. **Keep it disabled unless all necessary business rules and real integrations are implemented and independently verified.** Never substitute synthetic-zero totals or fake payment success.

## 12. Full frontend ↔ backend ↔ database integration — mandatory final phase

Do not stop at a visually complete UI. After implementing screens, systematically connect **every supported user-facing action** end to end:

1. **Frontend → backend:** Identify the actual API/service contract for every page, form, filter, variant, cart action, address, account operation, order, tracking request, and admin mutation. Use typed request/response models and consistent error handling. Eliminate static demo responses wherever real endpoints exist.
2. **Backend → PostgreSQL:** Verify each integrated API reads/writes the correct Prisma/PostgreSQL entities with server-side validation, authorization, transaction boundaries, idempotency, and stock accuracy. Reuse existing repositories/services instead of duplicating SQL or business rules in React.
3. **End-to-end correctness:** Test realistic seeded data through the entire flow: category → product → variant → cart → checkout boundary → permitted order creation → inventory reservation → order details/tracking; plus customer profile/address and authorized admin catalog/inventory/order workflows.
4. **Security:** Check authentication, customer ownership, MFA/admin RBAC, guest challenge verification, CSRF/session strategy as applicable, rate limits, secrets, and server-side price/stock calculations. Do not weaken fail-closed controls to make tests pass.
5. **External services:** Where live identity, email/SMS, Cloudflare R2, shipping, payment, or hosting credentials/accounts are missing, implement safe integration boundaries and clear configuration guidance. Mark those flows **BLOCKED**, do not invent credentials or claim successful real-world integration.
6. **Database safety:** Use the existing configured test database for integration tests. Never reset, seed destructively, or migrate a production database without explicit authorization. Do not silently modify customer data.
7. **UI truthfulness:** Remove fake checkout success, unverified shipping promises, and mock operational data from production-facing flows. Render honest unavailable/coming-soon states for blocked features.
8. **Integration matrix:** Maintain a table for every feature: frontend route/component, backend endpoint/service, database model(s), tested behavior, status (**complete / partial / blocked**), and outstanding dependencies.

**Definition of done:** A feature is complete only when its UI, API, database behavior, authorization, error states, and relevant automated tests all work together. A visually implemented page alone does not count as end-to-end complete.

## 13. Autonomous execution while I am away

I am leaving Codex running unattended. **Continue autonomously through all safe, available implementation phases rather than stopping after an audit or one page.** Do not ask me to approve ordinary coding decisions, formatting, refactoring, or non-destructive local tests. Make sensible choices consistent with the repository, implement, test, fix, and proceed.

Execution sequence:

1. Audit repository and Stitch exports; create a concise task plan and screen-to-route mapping.
2. Implement design tokens, shared components, responsive navigation, and business contact configuration.
3. Implement homepage, shop/category/search, product details, gallery/zoom, and variants.
4. Implement cart, checkout UI and its safe server-backed boundary, accounts, orders, and guest tracking.
5. Implement available admin designs and connect supported admin APIs.
6. Complete responsive layouts, animations, accessibility, SEO, and performance work.
7. Integrate all supported frontend → backend → database flows and write/update integration and E2E tests.
8. Run lint, typecheck, unit tests, database integration tests against the safe test environment, production build, and browser E2E tests. Fix regressions and repeat checks.
9. Review the integration matrix and continue resolving all issues that can be completed without missing external credentials, approvals, or policy decisions.
10. Produce a final report of files changed, screens delivered, integrations completed, commands/tests run and their results, unresolved blockers, and precise next steps.

**Do not stop merely because one phase is finished.** Continue until all safely executable work is completed or a genuine environment/tool/session limit prevents progress. If blocked on a specific external dependency, document it and **continue other independent work**. Keep a progress document in the repository so work can resume if the session ends.

### Hard safety boundaries

Autonomy does **not** authorize destructive production database operations, deployment to production, purchases, creation of paid external services, live payment activation, secret disclosure, disabling security controls, or sending real customer communications. Do not invent business policies or silently mark blocked work complete. Ask for user input only when an essential decision or credential is genuinely required; otherwise proceed with safe alternatives.

Do not promise continuous execution beyond the Codex tool/session limits. Work as far as the available environment permits and leave a detailed resumable state if interrupted.

## 14. Final verification and reporting

Run all relevant existing checks and add tests for:

- Responsive desktop/mobile navigation.
- Catalog search, filters, sorting, and categories.
- Product variant price/stock/gallery synchronization and image zoom.
- Cart persistence and stock validation.
- Checkout validation, duplicate-submit safety, and disabled production state where required.
- Customer data isolation and admin access control.
- Guest tracking verification.
- API/database consistency and transaction safety.
- Loading, empty, error, and accessibility states.

Report **actual** test results; never say tests passed unless executed. Preserve existing passing tests. Finish with a clear, evidence-based distinction between **implemented**, **verified**, **partially integrated**, and **blocked before production**.

**Ultimate objective:** Deliver the closest practical implementation of the Stitch-designed FLC Decor website, with elegant responsive interactions and as much secure, tested, real frontend/backend/PostgreSQL integration as the existing repository and available environment permit—without compromising security or fabricating production readiness.
