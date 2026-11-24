# FLC Decor UI audit

Audit date: 2026-11-11

## Scope and evidence

- Read the overnight execution prompt and the product, SRS, UI/UX, architecture, API, security, test, roadmap, and decision documents before editing.
- Reviewed the existing storefront, catalog, product detail, cart, authentication, admin entry, and protected admin surfaces.
- Captured local evidence at 1440x900, 1280x800, 768x1024, 390x844, and 360x800 in `.next-e2e/qa-shop-*-fixed.png`.
- No `docs/ui-reference/` screenshot set was present, so the approved written UI direction and existing local evidence were used as the reference.

## Findings and remediation

### Resolved: desktop collection media collapse (high)

The collection cards used an absolutely positioned image/fallback inside an auto-height link. The compact sample-art rule therefore resolved to zero height at desktop widths. The empty media frame pushed the title and price into the lower card boundary, and the metadata badge appeared to collide with the copy.

`components/product-card.tsx` now keeps approved media error-safe and falls back to the deliberately labelled sample artwork. `app/globals.css` gives every card a stable 4:5 editorial frame and separates the title/price columns. The fix was visually checked at wide and narrow widths; the desktop capture now shows the card artwork in the first viewport and the mobile capture remains legible.

### Resolved: broken approved media could blank product surfaces (medium)

The card and product gallery now render the existing sample-art fallback when an approved image fails to load. This is a presentation fallback only; it does not invent product photography or change catalog truth.

### Existing strengths confirmed

- Storefront uses semantic links, buttons, labels, and responsive layouts.
- Product detail preserves variant selection, gallery controls, zoom, swipe, and focus behavior.
- Admin routes remain protected; unauthenticated access redirects to admin login.
- Cart and checkout remain explicitly demo-only and do not claim payment success.
- Database catalog mode keeps server-authoritative prices and media approval filtering.

### Remaining visual/product constraints

- Current catalog art is the documented CSS sample-art fixture because licensed product photography is not configured. It is visibly labelled `FLC / SAMPLE` and must be replaced through the approved media workflow before launch.
- Shipping, tax, courier, returns, cancellation, retention, and real contact policy remain configuration/owner decisions; the UI must not present demo values as production policy.
- The local app has no supplied external reference screenshots to compare against.

## Verification

- `npm run typecheck`: PASS
- `npm run lint`: PASS, 0 errors; warnings are confined to the bundled Impeccable helper scripts.
- `npm test -- --reporter=dot`: PASS, 46/46 unit tests.
- `npm run build`: PASS, 76 routes/pages.
- `npm run test:e2e -- --reporter=line`: PASS, 17 passed and 9 intentionally skipped.
- BrowserAct is installed locally but could not authenticate because its API key is not configured. No BrowserAct result is claimed.
- Dependency audit remains an implementation follow-up: npm reports 8 moderate transitive `minimatch` advisories; the suggested forced remediation is a breaking lint-config change and was intentionally not run.

## Post-transformation QA audit — 2026-11-12

### Verified fix

- Mobile product purchase bar: at 360px and 390px the sticky `.buy-row` was two pixels wider than the viewport because of the negative 5vw margins. The safe CSS-only correction changes those margins to `calc(-5vw + 2px)`. No business logic or interaction contract changed. The rerun reports no document overflow on the product page.

### Visual matrix

The local Playwright audit covered `/`, `/shop`, `/categories/wall-accents`, `/products/sunline-arch`, `/cart`, `/checkout`, `/account/register`, `/account/login`, `/account`, `/track-order`, `/admin/login`, and `/admin` at 1440, 1280, 768, 390, and 360px widths. The protected `/admin` route correctly redirects to `/admin/login` without an authenticated session.

- No layout overflow was found after the product-bar fix.
- The 360px homepage’s 3px orbit excursion is intentional decorative clipping inside the existing `main` overflow boundary, not document scrolling.
- Form pages render with expected unauthenticated `401 /api/auth/me` responses in local demo mode; these are not application exceptions.
- The sticky mobile purchase bar remains intentionally visible at the viewport bottom; full-page screenshots can show it over the normal-flow product heading because sticky elements are captured at their viewport position.

### Hallmark triage

Latest static result: 188 FAIL, 185 REFLEX, and 15 WARN findings, 388 total. The findings overlap heavily by selector and are classified as follows:

| Group | Count | Classification | Customer impact / disposition |
| --- | ---: | --- | --- |
| 24b spacing-scale checks | 174 | Maintainability / false positive | Existing responsive/editorial rhythm uses fluid vw and clamp values. No functional or visual regression was verified; not changed wholesale. |
| 48 literal colours/fonts | 87 | Maintainability / existing legacy issue | Concentrated in the original one-line CSS and CSS sample-art palette. Tokenizing every art stop would be a broad refactor with no verified customer defect. |
| 54 eyebrow-before-heading | 47 | False positive / existing design convention | The eyebrow is intentional editorial hierarchy and appears consistently across page templates. |
| 67 tracked uppercase labels | 25 | False positive / visual convention | These are intentional compact catalogue labels; changing them would alter the approved FLC Decor voice. |
| 63 arrow/dash glyph copy | 19 | Mixed: legacy maintainability, not an accessibility defect | Arrows in link copy are text affordances, not icon-only controls. The touched homepage surfaces use the shared icon component; broader replacement is deferred. |
| 7a pure white | 5 | False positive unless a specific contrast check fails | White is used on dark/light contrast surfaces; no axe violation was found on the tested homepage. |
| 19 punctuation dashes | 2 | False positive | These are prose punctuation, not decorative UI glyphs. |
| 39a border focus | 2 | Accessibility-adjacent legacy issue, mitigated | Global `:focus-visible` outlines remain present; the border change is an additional non-keyboard state. No keyboard focus failure was observed. |
| 34 drawer width | 1 | Static false positive | The drawer has `max-width:490px`, the document clips horizontal overflow, and the visual matrix found no scrolling overflow. |
| 64 mono labels | 9 | Reflex / visual convention | Monospace is intentionally used for FLC metadata and operational labels. |
| 37 font-family count | 1 | Reflex / maintainability | Fallback stacks are defensive for environments without licensed brand fonts; final font licensing remains open. |
| 38iii hero accent | 1 | Reflex / intentional visual treatment | The single brass accent in the hero is part of the documented design direction. |
| 41 dark surface text inference | 6 | False positive | Surfaces inherit tokenized `--ink` and switch with the dark theme; no contrast failure was reproduced. |
| 40 contrast heuristics | 2 | Needs owner review, not silently altered | Brand/payment marks are small branded/decorative surfaces. Final contrast treatment should be approved with the production brand assets. |
| 49 long labels | 2 | Accessibility/visual watch item | Labels wrap safely in the tested widths; shortening copy would require content approval. |
| 70 success-state heuristic | 1 | False positive | The referenced control is a local filter-sheet completion action, not an external submission success claim. |
| F5/F24/11/29 finish heuristics | 4 | Visual preference / existing legacy issue | Existing coin, border/shadow, hover, and backdrop treatments are intentional and did not produce a verified usability defect. |

No Hallmark finding was suppressed. Only the verified mobile overflow was changed.

### Skipped Playwright tests

The nine skips are intentional condition branches, not failures:

1. `initial admin can enroll MFA, use protected modules, and revoke the session` — skipped in both desktop and mobile because `RUN_ADMIN_E2E=true` is not set; requires an isolated loopback `127.0.0.1:5433/flcdecor_test` database and a 64-hex `AUTH_FIELD_ENCRYPTION_KEY`. This is a real admin coverage gap until the disposable database is available.
2. `catalog filters follow the URL and survive refresh` — skipped in the mobile project by design; the desktop toolbar test runs, while the mobile filter-sheet path is covered by the responsive keyboard test. Not a gap for the current suite.
3. `PostgreSQL catalog to demo COD reservation through the browser` — skipped in both projects because `RUN_POSTGRES_E2E=true` is not set; requires the isolated local PostgreSQL test database. This is a database-runtime coverage gap, not evidence that hosted checkout works.
4. `local customer can save an encrypted PostgreSQL profile and address` — skipped in both projects for the same isolated PostgreSQL requirement. This is a database-runtime coverage gap.
5. `shared layouts fit 390, 768, 1024 and 1440 pixel viewports` — skipped in mobile because the desktop project intentionally loops through all four viewport sizes. Not a gap; the new audit additionally covered 360px.
6. `mobile menu, filters, bag drawer and product lightbox are keyboard accessible` — skipped in desktop by design and passed in the mobile project. Not a gap.

The two project-specific admin/database tests account for duplicate desktop/mobile skip entries, producing nine skipped test instances total.

### Hydration warning outcome

Repository search found no application `caret-color: transparent` or `caretColor` injection. A normal local Playwright browser diagnostic produced no hydration warning and showed the expected tokenized caret color. The earlier warning was emitted by the screenshot capture path’s temporary caret styling, while the only browser console errors during normal review were expected unauthenticated `/api/auth/me` responses. No application fix was necessary; the warning is documented as tooling noise rather than hidden.
# UI Audit

## 2026-11-12 design transformation follow-up

The visual pass is implemented as a refinement of the existing editorial storefront: shared design tokens, focus and reduced-motion behavior, responsive overflow safeguards, stable interaction states, and inline SVG icons on the touched homepage/product surfaces. Desktop and mobile review screenshots were captured for home, shop, admin login, and cart.

The full resource assessment is recorded in [`UI_RESOURCE_EVALUATION.md`](UI_RESOURCE_EVALUATION.md). Hallmark’s static audit still reports legacy findings across the codebase; the optional render verifier could not run because `puppeteer-core` is not installed locally. Playwright remains the visual/browser verification path for this repository.
