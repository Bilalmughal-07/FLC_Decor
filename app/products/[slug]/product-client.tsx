"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductGallery } from "@/components/product-gallery";
import { effectivePrice, formatPrice, type Product } from "@/lib/catalog";
import { parseCart, readCart, writeCart } from "@/lib/cart-browser";
import { businessContact } from "@/lib/business-contact";

export function ProductClient({ product }: { product: Product }) {
  const [selected, setSelected] = useState(product.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const variant = useMemo(() => product.variants.find((item) => item.id === selected) ?? product.variants[0], [selected, product.variants]);
  if (!variant) return <div className="empty-state"><h1>Currently unavailable</h1><p>This piece has no selectable variant.</p></div>;
  function addToCart() {
    const current = parseCart(readCart());
    const existing = current.find((item) => item.variantId === variant.id);
    const newQuantity = Math.min(variant.stock, (existing?.quantity ?? 0) + quantity);
    writeCart(existing ? current.map((item) => item.variantId === variant.id ? { ...item, quantity: newQuantity } : item) : [...current, { variantId: variant.id, quantity: newQuantity }]);
    setAdded(true);
  }
  return <div className="product-detail">
    <div className="product-gallery"><ProductGallery key={variant.id} product={product} variantId={variant.id} /></div>
    <div className="product-info">
      <Link className="back-link" href="/shop">← Back to collection</Link>
      <p className="eyebrow">{product.category}</p>
      <h1>{product.name}</h1>
      <p className="product-description">{product.description}</p>
      <div className="price-large">{formatPrice(effectivePrice(variant))}{variant.salePrice != null ? <del>{formatPrice(variant.regularPrice)}</del> : null}</div>
      <div className="selection-block">
        <div className="selection-label"><span>Finish and size</span><span>{variant.stock > 0 ? `${variant.stock} available in demo inventory` : "Currently unavailable"}</span></div>
        <div className="variant-list">{product.variants.map((item) => <button type="button" key={item.id} className={`variant-option ${item.id === variant.id ? "is-selected" : ""}`} aria-pressed={item.id === variant.id} disabled={item.stock < 1} onClick={() => { setSelected(item.id); setQuantity(1); setAdded(false); }}><span>{item.color}</span><small>{item.size} · {item.stock > 0 ? "Available" : "Sold out"}</small></button>)}</div>
        <p className="product-sku">SKU {variant.sku}</p>
      </div>
      <div className="buy-row"><div className="quantity-stepper"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity">−</button><span>{quantity}</span><button type="button" onClick={() => setQuantity(Math.min(variant.stock, quantity + 1))} aria-label="Increase quantity">+</button></div><button type="button" className="button button-dark add-button" disabled={!variant.stock} onClick={addToCart}>{added ? "Added to bag ✓" : "Add to bag"}</button></div>
      {added ? <p className="form-success" role="status">Added {quantity} to your bag. <Link href="/cart">View bag</Link></p> : null}
      <p className="product-note">Stock and price are checked again by the server. Production checkout, shipping and tax remain unconfigured.</p>
      <a className="subtle-cta" href={businessContact.whatsappHref} target="_blank" rel="noopener noreferrer">Need a custom design? Message FLC Decor on WhatsApp ↗</a>
      <div className="detail-accordion"><details open><summary>About this piece</summary><p>{product.materialNote || product.description}</p></details><details><summary>Delivery and returns</summary><p>Delivery charges, timing and returns policy are not configured for production.</p></details></div>
    </div>
  </div>;
}
