import { notFound } from "next/navigation";
import { getProduct, products } from "@/lib/catalog";
import { PageShell } from "@/components/page-shell";
import { ProductClient } from "./product-client";

export function generateStaticParams() { return products.map((product) => ({ slug: product.slug })); }
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const product = getProduct(slug); if (!product) notFound(); return <PageShell><ProductClient product={product} /></PageShell>; }
