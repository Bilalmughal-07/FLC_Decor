import { PageShell } from "@/components/page-shell";
import { ShopClient } from "@/app/shop/shop-client";
export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { const params = await searchParams; const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value; return <PageShell><ShopClient initialFilters={{ query: one(params.q), color: one(params.color), size: one(params.size), stock: one(params.stock), price: one(params.price), sort: one(params.sort) }} /></PageShell>; }
