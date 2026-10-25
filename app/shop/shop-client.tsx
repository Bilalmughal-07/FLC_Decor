"use client";

import { useMemo, useState } from "react";
import { categories, products, type Product } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";

export function ShopClient({ initialCategory = "all" }: { initialCategory?: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [color, setColor] = useState("all");
  const [size, setSize] = useState("all");
  const [stock, setStock] = useState("all");
  const [price, setPrice] = useState("all");
  const [sort, setSort] = useState("featured");
  const colors = [...new Set(products.flatMap((product) => product.variants.map((variant) => variant.color)))];
  const sizes = [...new Set(products.flatMap((product) => product.variants.map((variant) => variant.size)))];
  const filtered = useMemo(() => products.filter((product) => {
    const matchingVariant = product.variants.some((variant) => {
      const value = variant.salePrice ?? variant.regularPrice;
      const priceMatch = price === "all" || (price === "under500" && value < 500000) || (price === "500to800" && value >= 500000 && value <= 800000) || (price === "over800" && value > 800000);
      return (color === "all" || variant.color === color) && (size === "all" || variant.size === size) && (stock === "all" || (stock === "in" ? variant.stock > 0 : variant.stock === 0)) && priceMatch;
    });
    return (!query || product.name.toLowerCase().includes(query.toLowerCase())) && (category === "all" || product.categorySlug === category) && matchingVariant;
  }).sort((a, b) => sort === "alphabetical" ? a.name.localeCompare(b.name) : sort === "newest" ? b.createdAt.localeCompare(a.createdAt) : sort === "price-low" ? minPrice(a) - minPrice(b) || a.name.localeCompare(b.name) : sort === "price-high" ? minPrice(b) - minPrice(a) || a.name.localeCompare(b.name) : Number(b.featured) - Number(a.featured) || b.createdAt.localeCompare(a.createdAt)), [query, category, color, size, stock, price, sort]);
  function reset() { setQuery(""); setCategory(initialCategory); setColor("all"); setSize("all"); setStock("all"); setPrice("all"); setSort("featured"); }
  return <div className="shop-page"><section className="page-hero"><p className="eyebrow">{category === "all" ? "The collection" : categories.find((item) => item.slug === category)?.name}</p><h1>Objects with a point of view.</h1><p>Explore sample designs by shape, space and finish. Every product page shows the exact variant combination available in the demo catalog.</p></section><section className="catalog-toolbar"><label className="search-field"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the collection" /></label><div className="filter-group"><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((item) => <option value={item.slug} key={item.slug}>{item.name}</option>)}</select></label><label>Color<select value={color} onChange={(event) => setColor(event.target.value)}><option value="all">All finishes</option>{colors.map((item) => <option value={item} key={item}>{item}</option>)}</select></label><label>Size<select value={size} onChange={(event) => setSize(event.target.value)}><option value="all">All sizes</option>{sizes.map((item) => <option value={item} key={item}>{item}</option>)}</select></label><label>Stock<select value={stock} onChange={(event) => setStock(event.target.value)}><option value="all">Any stock</option><option value="in">In stock</option><option value="out">Sold out</option></select></label><label>Price<select value={price} onChange={(event) => setPrice(event.target.value)}><option value="all">Any price</option><option value="under500">Under PKR 5,000</option><option value="500to800">PKR 5,000–8,000</option><option value="over800">Over PKR 8,000</option></select></label><label>Sort<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured first</option><option value="newest">Newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="alphabetical">A–Z</option></select></label></div></section><div className="catalog-summary"><span>{filtered.length} sample {filtered.length === 1 ? "piece" : "pieces"}</span><span>Combined filters match the same variant</span></div>{filtered.length ? <div className="product-grid product-grid-wide">{filtered.map((product) => <ProductCard product={product} key={product.id} />)}</div> : <div className="empty-state"><p className="eyebrow">Nothing matched</p><h2>Try a softer search.</h2><p>Reset a filter or browse the full collection.</p><button className="button button-outline" onClick={reset}>Reset filters</button></div>}</div>;
}

function minPrice(product: Product) { return Math.min(...product.variants.map((variant) => variant.salePrice ?? variant.regularPrice)); }
