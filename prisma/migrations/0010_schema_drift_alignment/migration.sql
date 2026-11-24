-- Forward-only alignment for indexes represented by the current Prisma schema
-- but absent from the existing 0001-0009 migration baseline. Existing rows and
-- legacy columns are preserved.
BEGIN;

CREATE INDEX "Category_parentId_slug_idx"
  ON public."Category" ("parentId", "slug");

CREATE INDEX "Order_guestEmailNormalized_createdAt_idx"
  ON public."Order" ("guestEmailNormalized", "createdAt");

COMMIT;
