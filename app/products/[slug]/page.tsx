import { notFound } from "next/navigation";
import { getProduct, products } from "@/lib/catalog";
import { PageShell } from "@/components/page-shell";
import { ProductClient } from "./product-client";
import { getCatalogProduct } from "@/lib/catalog-store";
import type { Metadata } from "next";
export const dynamic = "force-dynamic";

export function generateStaticParams() { return products.map((product) => ({ slug: product.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const product = process.env.CATALOG_RUNTIME === "database" ? await getCatalogProduct(slug) : getProduct(slug); if (!product) return { title: "Piece unavailable", robots: { index: false } }; return { title: product.name, description: product.description, alternates: { canonical: `/products/${product.slug}` }, openGraph: { title: product.name, description: product.description, images: product.images?.[0]?.src ? [{ url: product.images[0].src, alt: product.images[0].alt }] : undefined }, robots: { index: false } }; }
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const product = process.env.CATALOG_RUNTIME === "database" ? await getCatalogProduct(slug) : getProduct(slug); if (!product) notFound(); return <PageShell><ProductClient product={product} /></PageShell>; }
