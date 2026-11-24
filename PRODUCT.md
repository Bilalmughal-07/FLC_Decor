# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are people shopping for laser-cut wall decor and related home accents. They browse by category, finish, size, price, and stock, select a variant, and place a clearly labelled local/demo COD order or contact FLC Decor about a bespoke inquiry.

Administrators manage products, categories, variants, approved media, inventory, orders, customers, analytics, and notification work through a protected MFA-gated workspace.

## Product Purpose

Fahad Laser is the FLC Decor storefront for discovering and purchasing expressive laser-cut home decor. Success means a customer can understand the collection quickly, choose a valid in-stock variant, and complete a safe demo checkout without the interface inventing production policy.

## Positioning

FLC Decor pairs expressive laser-cut forms with a calm, editorial shopping experience and a direct path to bespoke inquiries through configured WhatsApp.

## Operating Context

The repository is a Next.js 16 application with server-rendered catalog surfaces, client interactions for filters/cart/gallery, PostgreSQL-backed production-capable adapters, and explicit local/demo runtime boundaries. Development uses synthetic fixtures and must not touch the protected hosted database.

## Capabilities and Constraints

- Catalog, search, filters, sort, variant selection, cart, demo COD checkout, customer auth, guest tracking, order history, and protected admin workflows are in scope.
- Server-side pricing, stock, reservations, idempotency, authorization, MFA, and guest privacy remain authoritative.
- Shipping, tax, courier, COD eligibility, cancellation, returns, status policy, retention, external providers, and production contact configuration are undecided and must remain configurable or clearly marked `NOT_CONFIGURED`.
- No public custom-order builder, marketplace, affiliate flow, production payment, or live COD order is allowed during development.

## Brand Commitments

The name is FLC Decor / Fahad Laser. The written direction is quiet luxury, modern minimalism, warm ivory, charcoal, taupe, brass, stone, editorial display type, and product-first presentation. Product photography must be licensed and approved; current CSS artwork is explicitly labelled sample art.

## Evidence on Hand

Existing product/catalog fixtures, local Playwright screenshots, Stitch reference material, and repository product documents are available. No licensed production product photography, genuine testimonials, customer reviews, production metrics, or hosted staging approval is available.

## Product Principles

1. Product truth comes before decoration.
2. Every purchase path remains safe, reversible, and server-authoritative.
3. The interface should feel considered without hiding availability or policy.
4. Sample data and demo checkout are visibly labelled.
5. Accessibility, responsive behavior, and reduced motion are release requirements.

## Accessibility & Inclusion

Use semantic controls, visible keyboard focus, meaningful labels, keyboard-safe dialogs, touch-sized targets, responsive layouts from 360px upward, readable contrast, and `prefers-reduced-motion` fallbacks.
