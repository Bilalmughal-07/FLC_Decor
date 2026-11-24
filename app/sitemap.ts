import type { MetadataRoute } from "next";
import { categories, products } from "@/lib/catalog";
import { getPrisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const [categorySlugs, productSlugs] = process.env.CATALOG_RUNTIME === "database" ? await Promise.all([
    getPrisma().category.findMany({ where: { status: "ACTIVE" }, select: { slug: true } }),
    getPrisma().product.findMany({ where: { status: "PUBLISHED" }, select: { slug: true } }),
  ]) : [categories.map(({ slug }) => ({ slug })), products.map(({ slug }) => ({ slug }))];
  return [
    "", "/shop", "/about", "/faq", "/contact", "/custom-orders", "/shipping", "/returns", "/privacy", "/terms",
    ...categorySlugs.map((category) => `/categories/${category.slug}`),
    ...productSlugs.map((product) => `/products/${product.slug}`),
  ].map((path) => ({ url: `${baseUrl}${path}`, lastModified: new Date("2026-10-26T00:00:00Z") }));
}
