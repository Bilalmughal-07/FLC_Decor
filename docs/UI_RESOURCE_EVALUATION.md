# FLC Decor UI Resource Evaluation

Date: 2026-11-12

This record covers the design tools and component resources evaluated for the FLC Decor UI transformation. No production database, hosting account, or customer data was used.

| Resource | Result | Decision and rationale |
| --- | --- | --- |
| Hallmark | Installed locally and verified | Used for the redesign guidance and slop audit. The existing storefront already has a coherent editorial visual world, so the implementation keeps the current architecture and applies a tokenized refinement layer. |
| Impeccable | Installed locally and verified | Used for context, product/design guidance, and visual review. The existing project hook remains available. |
| Mobbin MCP | Not available in the configured plugin/MCP discovery | No endpoint or integration was invented. |
| Watermelon UI MCP | Not available in the configured plugin/MCP discovery | No endpoint or integration was invented. |
| Skiper UI | Evaluated; not installed | The official setup is shadcn/registry-oriented and includes dependency and attribution/license considerations. The current CSS architecture did not need those dependencies for this pass. |
| Vengeance UI | Evaluated; not installed | The component library is React/Next-oriented and useful for motion references, but the current storefront already has suitable motion primitives and adding a second component system would increase maintenance surface. |
| Animmaster | Evaluated; not installed | The site is oriented around a large PRO animated-component collection; license and production fit were not sufficiently established for adding it as a dependency. |

## Applied design system

- Added `PRODUCT.md` as the visual/product context source for future UI work.
- Added `DESIGN.md` with the FLC Decor editorial token system, typography, layout, motion, accessibility, and content rules.
- Added tokenized focus, motion, typography, responsive overflow, interaction, and card refinements in `app/globals.css`.
- Replaced the homepage’s decorative arrow glyphs with the shared inline `Icon` component where the touched surfaces required it.
- Captured desktop and mobile review screenshots for home, shop, admin login, and cart in the project workspace.

## Verification notes

Playwright, typecheck, lint, build, and the existing automated checks were run during the pass. The Hallmark static audit still reports legacy findings in the broader codebase, and its optional render verifier could not run because `puppeteer-core` is not installed locally. Those are documented as remaining verification work rather than being presented as clean results.
