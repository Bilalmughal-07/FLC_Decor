"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { formatPrice, products as sampleProducts, type Product } from "@/lib/catalog";
import { parseCart, readCart, subscribeCart, writeCart } from "@/lib/cart-browser";

export function CartDrawer({ open, onClose, databaseCatalog }: { open: boolean; onClose: () => void; databaseCatalog: boolean }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const cartValue = useSyncExternalStore(subscribeCart, readCart, () => "[]");
  const cart = useMemo(() => parseCart(cartValue), [cartValue]);
  const [products, setProducts] = useState<Product[]>(databaseCatalog ? [] : sampleProducts);
  useEffect(() => {
    if (!open || !databaseCatalog) return;
    let active = true;
    fetch("/api/catalog/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ variantIds: cart.map((item) => item.variantId) }) }).then((response) => response.json()).then((data) => { if (active) setProducts(Array.isArray(data.products) ? data.products : []); }).catch(() => { if (active) setProducts([]); });
    return () => { active = false; };
  }, [open, databaseCatalog, cart]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); if (event.key === "Tab") { const panel = closeRef.current?.closest("[role=dialog]"); const focusable = panel?.querySelectorAll<HTMLElement>("a[href],button:not([disabled])"); if (!focusable?.length) return; const first = focusable[0], last = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = previousOverflow; previous?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  const lines = cart.map((item) => { const product = products.find((entry) => entry.variants.some((variant) => variant.id === item.variantId)); const variant = product?.variants.find((entry) => entry.id === item.variantId); return { item, product, variant }; });
  const subtotal = lines.reduce((sum, line) => sum + (line.variant ? (line.variant.salePrice ?? line.variant.regularPrice) * line.item.quantity : 0), 0);
  return <div className="drawer-layer"><button className="drawer-backdrop" type="button" aria-label="Close bag" onClick={onClose} /><aside id="cart-drawer" className="cart-drawer" role="dialog" aria-modal="true" aria-label="Your bag"><div className="drawer-heading"><div><p className="eyebrow">Your collection</p><h2>Atelier bag <small>({cart.reduce((sum, item) => sum + item.quantity, 0)})</small></h2></div><button ref={closeRef} type="button" className="drawer-close" onClick={onClose} aria-label="Close bag">×</button></div><div className="drawer-lines">{cart.length ? lines.map(({ item, product, variant }) => <div className="drawer-line" key={item.variantId}><div className="drawer-line-copy"><strong>{product?.name ?? "Item unavailable"}</strong><span>{variant ? `${variant.size} · ${variant.color}` : "Remove this item before checkout"}</span><span>{variant ? formatPrice((variant.salePrice ?? variant.regularPrice) * item.quantity) : "Unavailable"}</span></div><div className="drawer-line-actions"><div className="quantity-stepper"><button type="button" aria-label={`Decrease ${product?.name ?? "item"} quantity`} onClick={() => writeCart(cart.map((line) => line.variantId === item.variantId ? { ...line, quantity: Math.max(1, line.quantity - 1) } : line))}>−</button><span>{item.quantity}</span><button type="button" aria-label={`Increase ${product?.name ?? "item"} quantity`} disabled={!variant || item.quantity >= variant.stock} onClick={() => writeCart(cart.map((line) => line.variantId === item.variantId ? { ...line, quantity: Math.min(variant?.stock ?? 1, line.quantity + 1) } : line))}>+</button></div><button className="remove-button" type="button" onClick={() => writeCart(cart.filter((line) => line.variantId !== item.variantId))}>Remove</button></div></div>) : <div className="drawer-empty"><p>Your bag is waiting for its first piece.</p><Link href="/shop" onClick={onClose}>Explore the collection →</Link></div>}</div><div className="drawer-summary"><div className="summary-row"><span>Estimated subtotal</span><strong>{formatPrice(subtotal)}</strong></div><p>Shipping and tax are not configured. Final availability and price are checked by the server.</p><Link className="button button-dark button-full" href="/cart" onClick={onClose}>View bag</Link>{cart.length ? <Link className="button button-outline button-full" href="/checkout" onClick={onClose}>Continue to demo checkout</Link> : null}</div></aside></div>;
}
