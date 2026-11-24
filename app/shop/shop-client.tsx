"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { categories as sampleCategories, products as sampleProducts, type Product } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";

type Filters = { query?: string; color?: string; size?: string; stock?: string; price?: string; sort?: string };
type DatabaseData = { categories: Array<{ name: string; slug: string; parentId?: string | null }>; facets?: { colors: string[]; sizes: string[] }; products: Product[]; total: number; page: number; limit: number };
export function ShopClient({ initialCategory = "all", initialFilters = {}, databaseData }: { initialCategory?: string; initialFilters?: Filters; databaseData?: DatabaseData }) {
  const router = useRouter();
  const [filters, setFilters] = useState({ query: initialFilters.query ?? "", category: initialCategory, color: initialFilters.color ?? "all", size: initialFilters.size ?? "all", stock: initialFilters.stock ?? "all", price: initialFilters.price ?? "all", sort: initialFilters.sort ?? "featured" });
  const [sheetOpen, setSheetOpen] = useState(false);
  const filterButton = useRef<HTMLButtonElement>(null);
  const filterPanel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sheetOpen) return;
    const oldOverflow = document.body.style.overflow;
    const trigger = filterButton.current;
    document.body.style.overflow = "hidden";
    filterPanel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
      if (event.key !== "Tab") return;
      const controls = [...(filterPanel.current?.querySelectorAll<HTMLElement>("button, input, select") ?? [])].filter((control) => control.getClientRects().length > 0);
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", onKeyDown); trigger?.focus(); };
  }, [sheetOpen]);
  const categories = databaseData?.categories ?? sampleCategories;
  const products = databaseData?.products ?? sampleProducts;
  const colors = databaseData?.facets?.colors ?? [...new Set(products.flatMap((product) => product.variants.map((variant) => variant.color)))].sort();
  const sizes = databaseData?.facets?.sizes ?? [...new Set(products.flatMap((product) => product.variants.map((variant) => variant.size)))].sort();
  const filtered = useMemo(() => databaseData ? products : products.filter((product) => {
    const matchingVariant = product.variants.some((variant) => {
      const amount = variant.salePrice ?? variant.regularPrice;
      return (filters.color === "all" || variant.color === filters.color) && (filters.size === "all" || variant.size === filters.size) && (filters.stock === "all" || (filters.stock === "in" ? variant.stock > 0 : variant.stock === 0)) && (filters.price === "all" || (filters.price === "under500" && amount < 500000) || (filters.price === "500to800" && amount >= 500000 && amount <= 800000) || (filters.price === "over800" && amount > 800000));
    });
    return (!filters.query || product.name.toLowerCase().includes(filters.query.toLowerCase())) && (filters.category === "all" || product.categorySlug === filters.category) && matchingVariant;
  }).sort((a, b) => filters.sort === "alphabetical" ? a.name.localeCompare(b.name) || a.id.localeCompare(b.id) : filters.sort === "newest" ? b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id) : filters.sort === "price-low" ? minPrice(a) - minPrice(b) || a.id.localeCompare(b.id) : filters.sort === "price-high" ? minPrice(b) - minPrice(a) || a.id.localeCompare(b.id) : Number(b.featured) - Number(a.featured) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)), [databaseData, products, filters]);
  function navigate(next: typeof filters, page = 1) {
    setFilters(next);
    const params = new URLSearchParams();
    if (next.query) params.set("q", next.query.trim());
    if (next.category !== "all") params.set("category", next.category);
    if (next.color !== "all") params.set("color", next.color);
    if (next.size !== "all") params.set("size", next.size);
    if (next.stock !== "all") params.set("stock", next.stock);
    if (next.price !== "all") params.set("price", next.price);
    if (next.sort !== "featured") params.set("sort", next.sort);
    if (page > 1) params.set("page", String(page));
    router.replace(`/shop${params.size ? "?" + params.toString() : ""}`, { scroll: false });
  }
  const categoryName = categories.find((item) => item.slug === filters.category)?.name;
  const total = databaseData?.total ?? filtered.length;
  return <div className="shop-page">
    <section className="page-hero"><p className="eyebrow">{categoryName ?? "The collection"}</p><h1>Objects with a point of view.</h1><p>Browse the collection by form, finish and size. Availability and prices are checked again by the server before a demo order.</p></section>
    <div className="catalog-mobile-actions"><button ref={filterButton} type="button" className="button button-outline" aria-expanded={sheetOpen} aria-controls="catalog-filter-panel" onClick={() => setSheetOpen(true)}>Filter and sort</button><span>{total} {total === 1 ? "piece" : "pieces"}</span></div>
    {sheetOpen ? <button type="button" className="catalog-sheet-backdrop" aria-label="Close filters" onClick={() => setSheetOpen(false)} /> : null}
    <div ref={filterPanel} id="catalog-filter-panel" role={sheetOpen ? "dialog" : undefined} aria-modal={sheetOpen ? "true" : undefined} aria-label={sheetOpen ? "Filter and sort products" : undefined} className={`catalog-toolbar ${sheetOpen ? "sheet-open" : ""}`}>
      <div className="catalog-sheet-heading"><strong>Refine the collection</strong><button type="button" onClick={() => setSheetOpen(false)} aria-label="Close filters">×</button></div>
      <form className="search-field" onSubmit={(event) => { event.preventDefault(); navigate(filters); setSheetOpen(false); }}><label htmlFor="catalog-search">Search pieces</label><div className="catalog-search-row"><input id="catalog-search" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Search the collection" /><button type="submit" aria-label="Search products">Search</button></div></form>
      <div className="filter-group">
        <label>Category<select value={filters.category} onChange={(event) => navigate({ ...filters, category: event.target.value })}><option value="all">All categories</option>{categories.map((item) => <option value={item.slug} key={item.slug}>{"parentId" in item && item.parentId ? "— " : ""}{item.name}</option>)}</select></label>
        <label>Finish<select value={filters.color} onChange={(event) => navigate({ ...filters, color: event.target.value })}><option value="all">All finishes</option>{colors.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
        <label>Size<select value={filters.size} onChange={(event) => navigate({ ...filters, size: event.target.value })}><option value="all">All sizes</option>{sizes.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
        <label>Stock<select value={filters.stock} onChange={(event) => navigate({ ...filters, stock: event.target.value })}><option value="all">Any stock</option><option value="in">In stock</option><option value="out">Sold out</option></select></label>
        <label>Price<select value={filters.price} onChange={(event) => navigate({ ...filters, price: event.target.value })}><option value="all">Any price</option><option value="under500">Under PKR 5,000</option><option value="500to800">PKR 5,000–8,000</option><option value="over800">Over PKR 8,000</option></select></label>
        <label>Sort<select value={filters.sort} onChange={(event) => navigate({ ...filters, sort: event.target.value })}><option value="featured">Featured first</option><option value="newest">Newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="alphabetical">A–Z</option></select></label>
      </div><button type="button" className="catalog-sheet-done button button-dark" onClick={() => setSheetOpen(false)}>View {total} pieces</button>
    </div>
    <div className="catalog-summary"><span>{total} {total === 1 ? "piece" : "pieces"}</span><span>Combined filters match the same variant</span></div>
    {filtered.length ? <div className="product-grid product-grid-wide">{filtered.map((product) => <ProductCard product={product} key={product.id} />)}</div> : <div className="empty-state"><p className="eyebrow">Nothing matched</p><h2>Try a different combination.</h2><button type="button" className="button button-outline" onClick={() => navigate({ query: "", category: "all", color: "all", size: "all", stock: "all", price: "all", sort: "featured" })}>Clear filters</button></div>}
    {databaseData && total > databaseData.limit ? <nav className="catalog-pagination" aria-label="Catalog pages"><button type="button" disabled={databaseData.page <= 1} onClick={() => navigate(filters, databaseData.page - 1)}>← Previous</button><span>Page {databaseData.page} of {Math.ceil(total / databaseData.limit)}</span><button type="button" disabled={databaseData.page * databaseData.limit >= total} onClick={() => navigate(filters, databaseData.page + 1)}>Next →</button></nav> : null}
  </div>;
}
function minPrice(product: Product) { return Math.min(...product.variants.map((variant) => variant.salePrice ?? variant.regularPrice)); }
