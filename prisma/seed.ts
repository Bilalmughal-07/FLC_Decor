import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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
}

main().finally(() => prisma.$disconnect());
