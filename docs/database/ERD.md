# Production database ERD

This ERD is the proposed additive PostgreSQL foundation represented by Prisma and migration `0004_production_database_foundation`. Authentication is an external authority selected later; `CustomerProfile.authUserId` is an external UUID, not an FK to a proprietary schema.

```mermaid
erDiagram
  CUSTOMER_PROFILE ||--o{ CUSTOMER_ADDRESS : saves
  CUSTOMER_PROFILE ||--o{ CUSTOMER_CONSENT : records
  ROLE ||--o{ USER_ROLE : assigned
  PERMISSION ||--o{ ROLE_PERMISSION : grants
  ROLE ||--o{ ROLE_PERMISSION : includes
  CATEGORY ||--o{ CATEGORY : parent
  PRODUCT ||--o{ PRODUCT_CATEGORY : placed
  CATEGORY ||--o{ PRODUCT_CATEGORY : classifies
  PRODUCT ||--o{ VARIANT : has
  PRODUCT ||--o{ PRODUCT_MEDIA : displays
  MEDIA_ASSET ||--o{ PRODUCT_MEDIA : referenced
  VARIANT ||--o{ INVENTORY_BALANCE : stocked
  INVENTORY_LOCATION ||--o{ INVENTORY_BALANCE : holds
  VARIANT ||--o{ INVENTORY_MOVEMENT : ledger
  INVENTORY_LOCATION ||--o{ INVENTORY_MOVEMENT : location
  ORDER ||--|{ ORDER_ITEM : snapshots
  ORDER ||--o{ STOCK_RESERVATION : reserves
  VARIANT ||--o{ STOCK_RESERVATION : allocated
  ORDER ||--o{ ORDER_STATUS_EVENT : history
  ORDER ||--o{ SHIPMENT : fulfilled
  SHIPMENT ||--o{ SHIPMENT_TRACKING_EVENT : tracked
  ORDER ||--o{ PAYMENT_INTENT : payable
  PAYMENT_INTENT ||--o{ PAYMENT_ATTEMPT : attempts
  PAYMENT_ATTEMPT ||--o{ PAYMENT_TRANSACTION : records
  PAYMENT_TRANSACTION ||--o{ REFUND : refunded
  ORDER ||--o{ NOTIFICATION : triggers
  NOTIFICATION ||--o{ NOTIFICATION_DELIVERY : delivered
  OUTBOX_EVENT ||--o{ JOB_ATTEMPT : processed
  ORDER ||--o{ GUEST_TRACKING_CHALLENGE : verified
  ORDER ||--o{ GUEST_TRACKING_CAPABILITY : scoped
```

Orders and ledger/event records are retained; current catalog entities may be archived. The legacy `User` relations are retained for compatibility and are not the chosen production-auth integration.
