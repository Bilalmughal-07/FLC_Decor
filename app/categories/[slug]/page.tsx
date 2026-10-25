import { notFound } from "next/navigation";
import { categories } from "@/lib/catalog";
import { PageShell } from "@/components/page-shell";
import { ShopClient } from "@/app/shop/shop-client";

export function generateStaticParams() { return categories.map((category) => ({ slug: category.slug })); }
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; if (!categories.some((category) => category.slug === slug)) notFound(); return <PageShell><ShopClient initialCategory={slug} /></PageShell>; }
