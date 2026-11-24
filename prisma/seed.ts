import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Synthetic seed data is forbidden in production.");
  const wall = await prisma.category.upsert({ where: { slug: "wall-accents" }, update: {}, create: { name: "Wall Accents", slug: "wall-accents" } });
  const entry = await prisma.category.upsert({ where: { slug: "entryway-details" }, update: {}, create: { name: "Entryway Details", slug: "entryway-details" } });
  await prisma.product.upsert({
    where: { slug: "sunline-arch" },
    update: {},
    create: {
      name: "Sunline Arch", slug: "sunline-arch", description: "A light-catching geometric accent for calm, considered walls.",
      primaryCategoryId: wall.id, status: "PUBLISHED", featured: true, publishedAt: new Date(),
      variants: { create: [
        { sku: "DEMO-SUN-24-BR", sizeLabel: "24 in", colorLabel: "Brass", regularPriceMinor: 649900, availableQty: 8 },
        { sku: "DEMO-SUN-24-BK", sizeLabel: "24 in", colorLabel: "Ink", regularPriceMinor: 599900, availableQty: 4 },
      ] },
      placements: { create: [{ categoryId: entry.id }] },
    },
  });
  const location = await prisma.inventoryLocation.upsert({
    where: { code: "MAIN" },
    update: { name: "Local synthetic demo stock", active: true },
    create: { code: "MAIN", name: "Local synthetic demo stock", active: true },
  });
  const variants = await prisma.variant.findMany({ where: { product: { slug: "sunline-arch" } } });
  for (const variant of variants) {
    await prisma.inventoryBalance.upsert({
      where: { variantId_locationId: { variantId: variant.id, locationId: location.id } },
      update: {},
      create: { variantId: variant.id, locationId: location.id, onHand: variant.availableQty, reserved: 0 },
    });
    await prisma.inventoryMovement.createMany({
      data: [{ variantId: variant.id, locationId: location.id, deltaOnHand: variant.availableQty, deltaReserved: 0, kind: "BASELINE_IMPORT", eventId: `seed:${variant.id}`, reason: "Synthetic local seed fixture" }],
      skipDuplicates: true,
    });
  }
}

main().finally(() => prisma.$disconnect());
