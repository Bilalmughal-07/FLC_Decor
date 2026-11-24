import { PageShell } from "@/components/page-shell";
import { ShopClient } from "./shop-client";
import { listCatalog } from "@/lib/catalog-store";

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { const params = await searchParams; const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value; const databaseData = process.env.CATALOG_RUNTIME === "database" ? await listCatalog(new URLSearchParams(Object.entries(params).filter(([, value]) => one(value) != null).map(([key, value]) => [key, one(value)!]).concat([["limit", "24"]]))) : undefined; return <PageShell><ShopClient key={JSON.stringify(params)} initialCategory={one(params.category) ?? "all"} initialFilters={{ query: one(params.q), color: one(params.color), size: one(params.size), stock: one(params.stock), price: one(params.price), sort: one(params.sort) }} databaseData={databaseData} /></PageShell>; }
