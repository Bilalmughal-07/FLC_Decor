# UI/UX Design Specification — Fahad Laser | FLC Decor

## Creative direction
**Design intent:** premium contemporary decor gallery meets frictionless e-commerce. Inspired by the *merchandising structure* of https://pyariwalls.pk/ (category exploration, large catalog photography, visible pricing/sale information, cart and search) but deliberately more spacious, cinematic and cohesive. **Do not copy** Pyari Walls branding, product photos, layouts, copy or assets.

**Proposed brand voice:** confident, warm, crafted, elegant, never pushy.  
**Hero headline:** *Turn Your Walls Into a Statement.*  
**Subhead:** *Discover precision-cut decor made to bring character, warmth and detail to your space.*  
**Primary CTA:** *Explore the Collection*  
**Secondary CTA:** *Request a Custom Design* (WhatsApp)

## Visual system — starting proposal, validate with mockups
- Primary light canvas: warm ivory `#F7F4EE`; text charcoal `#22211F`; subtle surface `#FFFFFF`; border `#E5DED4`.
- Accent: antique brass `#B28A52`; secondary muted sage `#778273`; avoid neon/gold overload.
- Dark: ink `#151515`, raised surface `#22211F`, ivory text `#F4EFE7`, brass accent `#D0AC72`.
- Typography: editorial display serif (e.g. Cormorant Garamond) for hero/headings; legible sans (e.g. Manrope/Inter) for navigation, labels, prices and forms. License-check and self-host/subset as appropriate.
- 8px spacing rhythm, large imagery, generous whitespace, subtle hairline dividers, restrained rounded corners (8–16px), crisp buttons and visible focus rings.
- Use real or properly licensed high-resolution product photography; avoid generic unrelated stock shots and fake reviews/discounts.

## Homepage wireframe / composition
1. **Announcement strip**: only verifiable offers; no fabricated free-shipping promise.
2. **Sticky transparent-to-solid header**: FLC Decor logotype, Shop, Categories, About, Custom Orders, search, account, cart; mobile menu and visible cart count.
3. **Cinematic hero**: full-bleed interior/lifestyle photo of laser-cut wall art; elegant heading left; accessible contrast overlay; layered decorative product silhouette. 3D parallax limited to hero ornament, not core text.
4. **Shop by space / category**: 3–6 large editorial category tiles (data-driven, no invented catalog promises).
5. **Featured collection**: 4-column desktop / 2-column mobile product cards with image, title, variant starting price if relevant, optional genuine sale badge, quick-view optional.
6. **Craft story**: split-image editorial section with proposed copy about precision and thoughtful design; avoid unverifiable manufacturing claims.
7. **Interactive 3D showcase**: optional 3D wall-art scene with slow rotation or mouse/touch tilt; prominent 'View Product' button and static fallback.
8. **New arrivals**: compact carousel with accessible controls and no auto-moving content by default.
9. **Custom design CTA**: WhatsApp link, clear that custom inquiries are handled off-site.
10. **Trust / FAQ**: COD available, secure checkout; courier timing, shipping cost and returns only once policies approved.
11. **Footer**: shop, help, about, social links, contact, policy links; placeholder contact data until confirmed.

## Motion and 3D requirements
- Use CSS transforms / Motion library for subtle hover lift (2–6px), opacity reveals (150–400ms), image scale (~1.02–1.05), page transitions only where they do not interrupt navigation.
- Use React Three Fiber / Three.js **only if needed** for a distinct 3D product showcase. Load scene lazily after core content; dynamic import, suspense/static poster, capability detection, cap device pixel ratio, pause when offscreen/tab hidden.
- Hero parallax: max small offset; never animate the primary LCP image into late visibility. No heavy WebGL above-the-fold on low-end mobile.
- Mouse-follow depth: restrained 3–8 degrees, touch-friendly fallback. Do not require dragging to access details.
- Respect `prefers-reduced-motion: reduce`: no parallax, 3D rotation, scroll-jacking or prolonged transitions; render stable static composition.
- Keep checkout, authentication and admin **motion-light**. No distracting 3D checkout or animated form labels that hurt accessibility.
- Do not autoplay audio, hijack scrolling, or run permanent GPU-intensive background particles.
- Performance budget: track LCP <= 2.5s p75; measure long tasks, CLS and INP; dynamically disable heavy effects when performance degrades.

## Page inventory
**Public:** `/`, `/shop`, `/categories/[slug]`, `/products/[slug]`, `/search`, `/cart`, `/checkout`, `/order/success/[publicToken]` (protected from enumeration), `/track-order`, `/custom-orders` (WhatsApp CTA), `/about`, `/contact`, `/faq`, `/privacy`, `/terms`, `/shipping`, `/returns` (policies withheld until approved), `/404`.
**Customer:** `/account/login`, `/account/register`, `/account/forgot-password`, `/account/reset-password`, `/account`, `/account/orders`, `/account/orders/[id]`, `/account/security`.
**Admin:** `/admin/login`, `/admin/mfa`, `/admin`, `/admin/products`, `/admin/products/new`, `/admin/products/[id]`, `/admin/categories`, `/admin/inventory`, `/admin/orders`, `/admin/orders/[id]`, `/admin/media`, `/admin/settings`, `/admin/audit`.

## Key page behaviors
**Catalog:** desktop filter sidebar; mobile filter drawer; sticky sort control; URL-synced filters; reset-all; meaningful empty states; pagination or load-more with deep links. Never show invalid combined size/color filters.

**Product detail:** image gallery with thumbnails, zoom, descriptive alt text; price changes when variant changes; swatches labeled in text; size selector with dimensions where known; stock indicator; quantity stepper; add-to-cart disabled for invalid/out-of-stock selection; cart feedback; WhatsApp custom inquiry nearby but not confused with checkout.

**Cart:** item thumbnail, exact selected variant, quantity, server-verified subtotal, remove, continue shopping, checkout CTA; disclose shipping fee as TBD/at checkout until configured; never claim item reserved.

**Checkout:** clean step sequence (contact → delivery → review → place COD order), guest default, optional login, clear error summary, disabled duplicate submission with idempotent server retry, visible COD choice, no hidden extra fees. Shipping fee cannot be silently assumed zero; if not configured, demo checkout must be labeled test-only and live checkout disabled.

**Guest tracking:** request order number and email, then send expiring verification to email; do not display protected order data merely from matching typed email.

**Admin:** utilitarian accessible dashboard; table search/filter/pagination; product editor with variant matrix, inventory controls and image reuse; upload processing states; order detail audit trail; MFA gate; confirmation on destructive actions.

## Responsive behavior
- Small mobile 320–479px: single-column hero, 2-column product grid only if card readability remains acceptable, bottom sticky add-to-cart on product page, full-screen filter drawer.
- Tablet 480–1023px: 2–3 product columns; compact nav.
- Desktop 1024px+: 3–4 product columns; sidebar filters, generous editorial imagery.
- Test 320, 375, 390, 768, 1024, 1440px and zoom to 200%.

## Accessibility and quality
- WCAG 2.2 AA design target; semantic HTML, accessible names, keyboard focus and modal focus trapping, contrast >= 4.5:1 normal text, 44px-ish comfortable targets, screen-reader announcements for cart changes.
- No information only via color or motion; all images have useful alt text; captions for relevant video.
- Skeletons must avoid layout shift; all loading, error, empty, offline and success states designed.
- Genuine offers only; never create fake scarcity, reviews, testimonials, shipping claims or fake product ratings.

## Visual review checklist for Codex
- Screenshot every page at mobile and desktop; check hierarchy, alignment, typography, product photography, whitespace, accessible contrast, dark mode.
- Verify static fallback without WebGL and reduced-motion mode.
- Verify fast first render and that animations never interfere with adding to cart or checkout.
- Compare *information architecture*, not visual copying, against the reference site.
