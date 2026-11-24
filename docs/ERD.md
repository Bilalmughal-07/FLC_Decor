# FLC Decor Entity Relationship and Trust Boundaries

The authoritative schema is `prisma/schema.prisma`; this diagram describes the intended persisted model without claiming the current demo runtime uses it.

```text
User 1---* Session
User 1---* Cart 1---* CartItem *---1 Variant *---1 Product *---1 Category
Category 1---* Category (parent/child, max depth two)
Product *---* Category (ProductCategory; primary category is separate)
Product/Variant *---* MediaAsset (ProductMedia / VariantMedia)
User? 1---* Order 1---* OrderItem *---? Variant
Order 1---* InventoryLedger *---1 Variant
Order 1---* OrderStatusEvent
Order 1---* GuestTrackingVerification
Order 1---0..1 CheckoutIdempotency
AuditEvent records privileged actors and safe metadata
```

Trust boundaries: browser input is untrusted; route handlers are the server boundary; PostgreSQL is the durability boundary; object storage is isolated and non-executable; email/courier/WhatsApp are post-commit outbox consumers. Customer/admin secrets never enter client bundles.

The expanded, cardinality-annotated production foundation ERD is in [`database/ERD.md`](./database/ERD.md). It remains schema intent until migration and integration evidence are available.
