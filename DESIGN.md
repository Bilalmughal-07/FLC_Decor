# FLC Decor design system

## Direction

Quiet luxury meets modern minimalism: an editorial catalogue where the product, not interface chrome, carries the visual weight. The design should feel warm, precise, tactile, and calm.

## Tokens

- Canvas: Warm Ivory `#F8F6F2`
- Surface: White `#FFFFFF`
- Ink: Charcoal `#242424`
- Muted text: Taupe-charcoal `#645F58`
- Line: Stone `#EAE6DF`
- Accent: Brass `#91785A` locally, with restrained brighter brass in dark mode
- Secondary accent: Sage `#536052`
- Display: Cormorant Garamond when available, falling back to Playfair Display/Georgia
- Body: Plus Jakarta Sans when available, falling back to Manrope/Arial
- Radius: mostly square or 2px; circular treatment is reserved for small utility controls
- Motion: short ease-out transitions; content is visible by default and reduced motion disables decorative movement

## Layout rules

- Cap content at `--max` and use fluid viewport gutters.
- Use stable media aspect ratios to prevent layout shift.
- Keep product grids dense enough to scan and spacious enough to breathe.
- Prefer left-aligned editorial hierarchy; center only intentional empty/error/success states.
- Use one primary dark action, one outline action, and restrained text links.

## Interaction rules

- Every interactive element has a visible `:focus-visible` state and a pressed state.
- Draw icons as consistent inline SVGs; do not use Unicode glyphs as interface icons.
- Use motion to clarify state changes: drawer entry, image transitions, hover lift, and selection feedback only.
- Preserve server-authoritative product, price, inventory, and order behavior.

## Content rules

- Never invent testimonials, reviews, metrics, logos, stock claims, prices, or delivery promises.
- Keep demo and sample states explicit.
- Unresolved commercial policy is shown as configuration/TBD, not implied as a real promise.

## Surfaces

- Storefront: expressive, editorial, product-led.
- Catalog/detail: calm scanning, consistent media frames, obvious variant/stock state.
- Cart/checkout: low-distraction, clear totals, safe error/loading states.
- Admin: denser, more utilitarian, with the same type and color tokens but higher information density.

## Theme system

The storefront uses one document-level theme contract: `data-theme="light" | "dark"` on
`<html>`, with the preference stored in `localStorage` as `flc-theme`. The inline bootstrap
in `app/layout.tsx` applies a saved preference before paint and otherwise follows the operating
system preference. Manual selection remains the customer’s override across routes and reloads.

Light tokens: canvas `#F8F6F2`, surface `#FFFFFF`, ink `#242424`, contrast-safe secondary
text `#645F58`, accent `#91785A`, and line `#EAE6DF`. The lighter values proposed for
secondary text and accent were tested and rejected because they fail the existing axe contrast
gate on body text and large display accent text.

Dark tokens: canvas `#171614`, surface `#22201D`, elevated surface `#2B2824`, primary text
`#F5F1EA`, secondary text `#B9B0A3`, accent `#C3A77E`, and line `#39352F`.

The shared header toggle emits the actual pointer coordinates consumed by `InkThemeTransition`.
The controller keeps the current `data-theme` as the visible base while `html2canvas` captures a
destination-theme clone with the live overlay hidden. WebGL2 progressively reveals that
destination snapshot with a slower, layered organic noise mask from the click point; the current
theme remains visible outside the reveal. The destination is committed to `data-theme` and
`flc-theme` only after the mask reaches the viewport edge and the final frame completes. Browsers
without WebGL2 receive the same destination capture through a CSS clip-path fallback; capture
failures use a safe destination-color texture. Reduced-motion users switch immediately. The
overlay is pointer-transparent, has no focusable content, and cleans up its canvas, listeners,
animation frame, texture, and shader resources.

The reference interaction was adapted from the MIT-licensed Codemure ink-bleed project rather
than copied as a separate demo. Its original full renderer uses additional snapshot, noise, and
animation modules; this app keeps the click origin, persistent theme state, WebGL2/CSS fallback,
and cleanup behavior while using FLC’s existing tokens and Next.js shell.
