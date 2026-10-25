import type { MetadataRoute } from "next";
import { categories, products } from "@/lib/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return [
    "", "/shop", "/about", "/faq", "/contact", "/custom-orders", "/shipping", "/returns", "/privacy", "/terms",
    ...categories.map((category) => `/categories/${category.slug}`),
    ...products.map((product) => `/products/${product.slug}`),
  ].map((path) => ({ url: `${baseUrl}${path}`, lastModified: new Date("2026-10-26T00:00:00Z") }));
}
