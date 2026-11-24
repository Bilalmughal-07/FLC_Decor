import { notFound } from "next/navigation";
import { categories } from "@/lib/catalog";
import { PageShell } from "@/components/page-shell";
import { ShopClient } from "@/app/shop/shop-client";
import { listCatalog } from "@/lib/catalog-store";

export const dynamic = "force-dynamic";
export function generateStaticParams() { return categories.map((category) => ({ slug: category.slug })); }
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const databaseData = process.env.CATALOG_RUNTIME === "database" ? await listCatalog(new URLSearchParams({ category: slug, limit: "24" })) : undefined; if (!(databaseData?.categories ?? categories).some((category) => category.slug === slug)) notFound(); return <PageShell><ShopClient initialCategory={slug} databaseData={databaseData} /></PageShell>; }
