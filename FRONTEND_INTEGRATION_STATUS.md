# Stitch frontend integration — 2026-10-26

## Export inventory and route map

The `stitch_flc_decor_e_commerce_platform` export has 10 HTML files, 9 usable PNG screenshots, 2 28-byte invalid PNG placeholders, and one design guide. It has no local CSS, JavaScript, font, or individual product-image files. The HTML uses Tailwind CDN, Google Fonts, and Google-hosted mock imagery; those assets are references only and are not approved product media.

| Stitch screen | Next.js target | Export limitations |
|---|---|---|
| `flc_decor_e_commerce_experience` / `flc_decor_home_living_catalog` | `/` | Second screenshot invalid; same desktop landing layout. Mock products, testimonials and delivery claims cannot be published as facts. |
| `flc_decor_mobile_atelier_home` | `/` at 390px | Mobile reference only; no separate route. |
| `flc_decor_shop_collections` | `/shop`, `/categories/[slug]`, `/search` | Screenshot invalid; HTML available. |
| `flc_decor_mobile_curated_catalog` | Catalog at 390px | Mobile reference only. |
| `flc_decor_product_details_pdp` | `/products/[slug]` | Claims about materials, reviews, delivery and payment are unverified. |
| `flc_decor_mobile_product_details` | Product at 390px | Mobile reference only. |
| `flc_decor_mobile_cart_drawer` | Shared cart drawer and `/cart` | Free shipping, tax and tip claims are unapproved. |
| `flc_decor_frictionless_checkout` / `_refined` | `/checkout` | Mock rates, online payment methods, SSL badges and tips are excluded. |
| `flc_decor_order_success_live_tracking` | `/order/success/[token]`, `/track-order` | Live courier tracking cannot be claimed; existing guest verification remains authoritative. |

No admin, account, policy, FAQ or support screens were exported. Those pages use the same shared tokens and existing server-controlled flows.

## Implementation plan and gates

1. Shared tokens, verified contact configuration, header, footer, mobile navigation and cart drawer.
2. Database-driven home/catalog/product detail with accurate filters, pagination, media fallback and gallery controls.
3. Cart, server quote, checkout, account, order/tracking and admin API integrations with honest blocked states.
4. Responsive and accessibility checks at 390/768/1024/1440px; unit, PostgreSQL integration, build and browser E2E checks.

Production checkout, live payment, courier, email/SMS and R2 storage stay disabled until approved and configured. Update this document with actual progress and test results as each phase completes.

## Phase 1 progress

- Added `lib/business-contact.ts` and used the owner-confirmed phone, WhatsApp, email and address on the header, footer, contact and custom-order pages.
- Added `components/cart-drawer.tsx` and shared `lib/cart-browser.ts`; the drawer reads real local cart state, resolves database variants through `/api/catalog/resolve` in DB mode, supports quantity/remove, Escape, focus wrap and backdrop close.
- Updated warm-neutral tokens, editorial header/footer and responsive navigation without using Stitch mock imagery or unsupported delivery/payment claims.
- `npm run typecheck` and `npm run lint` passed after this phase. Browser and integration checks remain pending.

## Phase 2 progress

- Catalog pages now use URL-backed filters and server pagination (24 items/page in database mode), with a mobile filter sheet and same-variant filtering preserved in the existing service.
- Product cards and detail galleries use only approved media references when `MEDIA_PUBLIC_BASE_URL` is configured; variant media takes priority, product media is the fallback, and missing media uses labeled original CSS artwork. Lightbox supports keyboard controls, swipe, pinch and pan.
- Checkout uses server quote/availability, a retry-stable idempotency key, duplicate-submit guard and authorized saved addresses. Immediate confirmation uses a 15-minute signed HTTP-only receipt cookie and reads the corresponding PostgreSQL order; later guest tracking still requires email verification.
- Account page reads protected profile/address/order APIs and supports profile edit, address add/remove and logout. Production auth and checkout remain fail closed.
- Typecheck and unit tests passed (17 unit tests; 3 database suites skipped without the integration flag). Lint found a React effect pattern in checkout, which was corrected; lint rerun pending.

## Phase 3 progress

- Added `app/admin/admin-workbench.tsx` under the existing server-side MFA guard. It calls the existing admin category, product, variant, inventory, order and audit APIs; category/product creation, variant creation, publish/feature and inventory adjustment are functional only when the server grants permission.
- No Stitch admin design was exported. The admin workbench uses the shared editorial tokens; payment, fulfillment, customer administration, settings and R2 upload controls remain unavailable because the backend contracts or approved policies/providers are absent.
- Responsive/browser and PostgreSQL E2E verification results are recorded in Phase 4 below.

## Phase 4 verification and integration matrix

The following status describes the current local implementation. “Complete” means the stated local behavior was exercised; it does not authorize production checkout.

| Feature | Frontend | API/service | PostgreSQL entity | Evidence | Status / dependency |
|---|---|---|---|---|---|
| Home and featured selection | `/`, `ProductCard` | `listCatalog` in database mode | Category, Product, Variant, balances, media references | PostgreSQL browser catalog journey; responsive and axe browser tests | Partial: approved media and large-catalog pagination/performance remain |
| Two-level categories | `/categories/[slug]`, shop filter, admin workbench | `/api/admin/categories`, `listCatalog` | Category, ProductCategory, AuditEvent | PostgreSQL backend suite; catalog browser tests | Partial: UI can create parent/child, but category editing remains API-only |
| Search, filter, sorting | `/shop`, `/search` | `listCatalog`, `/api/catalog` | Product, Variant, Category, InventoryBalance | Browser URL persistence/empty state; backend suite | Partial: service currently loads all published rows before filtering, so scale needs work |
| Variant price, stock and gallery | `/products/[slug]`, `ProductGallery` | `getCatalogProduct`, approved media mapping | Variant, ProductMedia, VariantMedia, MediaAsset, InventoryBalance | Browser variant/SKU/price and lightbox; backend media reference test | Partial: R2 delivery, image processing and real product photography unconfigured |
| Bag and server revalidation | `CartDrawer`, `/cart` | `/api/catalog/resolve`, `/api/checkout/quote` | Product, Variant, InventoryBalance | Browser persistence; PostgreSQL checkout journey | Partial: local cart only; server quote is final authority |
| Demo COD checkout | `/checkout`, receipt page | `/api/checkout/orders`, `createDatabaseOrder` | Order, OrderItem, balances, Reservation, Movement, intent, outbox, idempotency | PostgreSQL browser journey and 13 integration tests including concurrency | Complete for guarded synthetic local demo; production blocked by shipping/tax/policy/identity |
| Guest tracking | `/track-order` | `/api/guest-orders/verify/**`, `/api/orders/[number]` | Guest challenge, capability, Order | Backend security tests; browser non-disclosure test | Partial: real verification delivery provider unconfigured |
| Customer account/profile/address | `/account/**` | `/api/auth/**`, `/api/account/profile`, `/api/account/addresses/**` | CustomerProfile, CustomerAddress, AuditEvent | PostgreSQL browser encrypted-address journey; backend ownership tests | Partial: identity/session storage is local demo only; production key management needed |
| Customer order history | `/account` | `/api/account/orders` | CustomerProfile, Order | Ownership boundary in backend tests | Partial: list only, no account order-detail UI; depends on durable identity |
| Admin catalog/inventory | `/admin`, `AdminWorkbench` | `/api/admin/categories/**`, `products/**`, `variants/**`, `inventory/**` | Category, Product, Variant, Balance, Movement, AuditEvent | PostgreSQL backend suite, admin permission tests | Partial: create/publish/feature/adjust UI; edit/media/fulfillment UI incomplete; demo MFA only |
| Admin orders/dashboard/audit | `/admin` | `/api/admin/orders/**`, `dashboard`, `audit` | Order, AuditEvent, reporting view | PostgreSQL backend suite | Partial: read-only UI; transitions lack approved policy |
| Payments, shipping, notifications | Checkout unavailable states | Provider-neutral intent/outbox services | PaymentIntent, OutboxEvent, Notification | Database atomicity tests | Blocked: real gateway/COD collection, courier/tax rates and delivery credentials/policies |
| R2 media upload | Admin drag/drop manager, storefront gallery/cards | `/api/admin/media/**`, `/api/media/[id]`, R2 adapter and existing attachment APIs | MediaAsset, ProductMedia, VariantMedia, AuditEvent | Unit security/key tests; PostgreSQL lifecycle tests with fake storage | Partial: implementation complete and fail-closed; real disposable R2 bucket verification awaits credentials |
| Contact and custom requests | Header/footer/contact/custom/FAQ | `businessContact` | None | Centralized config and page source review | Complete: owner-confirmed WhatsApp, telephone, email and address; inquiry is off-site |
| SEO and support pages | metadata, sitemap, robots, about/policy/FAQ | Database slug reads for sitemap | Product, Category | Build route generation | Partial: demo is noindex; legal policies require owner/legal approval |

### Final local checks (2026-10-26)

- `npm run lint`: passed after the final source changes, with no errors.
- `npm run typecheck`: passed.
- `npm run test:unit`: 18 passed.
- `npm run test:integration` against verified `127.0.0.1:5433/flcdecor_test`: 13 passed, then repeated three times (39/39) including concurrent stock tests.
- Guarded PostgreSQL browser journey: 2 passed, covering order/reservation and encrypted profile/address.
- `npm run test:e2e` in synthetic demo mode: 11 passed, 7 intentionally skipped for project/environment targeting.
- `npm run build`: passed after the final cart availability change, 61 generated routes.

The database cart now waits for variant resolution and displays a recoverable service error or a removal path for unavailable saved variants. It does not silently treat unresolved lines as an empty bag. The guarded PostgreSQL browser journey passed 2/2 again after this change. The final synthetic browser run passed 11 tests with seven intentional environment/project skips.

Production checkout remains disabled. The test database contains synthetic records created by non-destructive browser/integration tests.
