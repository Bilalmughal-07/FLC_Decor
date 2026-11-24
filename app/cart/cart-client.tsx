"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { effectivePrice, formatPrice, getProduct, getVariant, type Product } from "@/lib/catalog";
import { ProductArt } from "@/components/product-art";
import { parseCart, readCart, subscribeCart, writeCart, type CartLine } from "@/lib/cart-browser";

export function CartClient({ databaseCatalog = false }: { databaseCatalog?: boolean }) {
  const cartValue = useSyncExternalStore(subscribeCart, readCart, () => "[]");
  const cart = useMemo(() => parseCart(cartValue), [cartValue]);
  const cartKey = cart.map((line) => line.variantId).sort().join("|");
  const [resolution, setResolution] = useState<{ key: string; products: Product[]; error: boolean }>({ key: "", products: [], error: false });
  useEffect(() => {
    if (!databaseCatalog) return;
    let active = true;
    const variantIds = cart.map((line) => line.variantId);
    fetch("/api/catalog/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ variantIds }) }).then((response) => { if (!response.ok) throw new Error("Catalog unavailable"); return response.json(); }).then((data) => { if (active) setResolution({ key: cartKey, products: Array.isArray(data.products) ? data.products : [], error: false }); }).catch(() => { if (active) setResolution({ key: cartKey, products: [], error: true }); });
    return () => { active = false; };
  }, [cart, cartKey, databaseCatalog]);
  const resolved = resolution.products;
  function sync(next: CartLine[]) { writeCart(next); }
  const lines = useMemo(() => cart.map((line) => { const product = databaseCatalog ? resolved.find((item) => item.variants.some((variant) => variant.id === line.variantId)) : productsForVariant(line.variantId); const variant = databaseCatalog ? product?.variants.find((item) => item.id === line.variantId) : getVariant(line.variantId); return variant && product ? { ...line, variant, product, total: effectivePrice(variant) * line.quantity } : null; }).filter(Boolean) as Array<CartLine & { variant: NonNullable<ReturnType<typeof getVariant>>; product: Product; total: number }>, [cart, databaseCatalog, resolved]);
  const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
  if (databaseCatalog && cart.length && resolution.key !== cartKey) return <div className="narrow-page loading-state" role="status">Checking current prices and availability…</div>;
  if (databaseCatalog && cart.length && resolution.error) return <div className="narrow-page"><h1>Your bag is temporarily unavailable.</h1><p>We could not check current product availability. Please reload before checkout.</p><button type="button" className="button button-dark" onClick={() => window.location.reload()}>Retry</button></div>;
  const unavailable = databaseCatalog ? cart.filter((item) => !lines.some((line) => line.variantId === item.variantId)) : [];
  if (unavailable.length) return <div className="narrow-page"><h1>Review your bag.</h1><p>Some saved items are no longer available. Remove them before checkout.</p>{unavailable.map((item) => <div className="address-row" key={item.variantId}><span>Unavailable variant {item.variantId}</span><button type="button" className="remove-button" onClick={() => sync(cart.filter((line) => line.variantId !== item.variantId))}>Remove</button></div>)}</div>;
  return <div className="cart-page"><section className="page-hero compact-hero"><p className="eyebrow">Your bag</p><h1>Make room for something good.</h1><p>Cart prices are estimates until the server recalculates them at checkout. No stock is reserved in the bag.</p></section>{lines.length ? <div className="cart-layout"><div className="cart-lines">{lines.map((line) => <div className="cart-line" key={line.variantId}><div className="cart-line-art"><ProductArt product={line.product} compact /></div><div className="cart-line-main"><p className="eyebrow">{line.product.category}</p><h2>{line.product.name}</h2><p>{line.variant.size} · {line.variant.color}</p><div className="cart-line-actions"><div className="quantity-stepper"><button onClick={() => sync(cart.map((item) => item.variantId === line.variantId ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item))}>−</button><span>{line.quantity}</span><button onClick={() => sync(cart.map((item) => item.variantId === line.variantId ? { ...item, quantity: Math.min(line.variant.stock, item.quantity + 1) } : item))}>＋</button></div><button className="remove-button" onClick={() => sync(cart.filter((item) => item.variantId !== line.variantId))}>Remove</button></div></div><strong>{formatPrice(line.total)}</strong></div>)}</div><aside className="cart-summary"><p className="eyebrow">Summary</p><div className="summary-row"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div><div className="summary-row"><span>Shipping</span><span className="tbd">To be configured</span></div><div className="summary-total"><span>Total at checkout</span><strong>Pending quote</strong></div><Link className="button button-dark button-full" href="/checkout">Continue to checkout <span>→</span></Link><Link className="text-link centered" href="/shop">Continue shopping</Link></aside></div> : <div className="empty-state"><p className="eyebrow">Nothing here yet</p><h2>Your space is waiting for its next statement piece.</h2><Link className="button button-dark" href="/shop">Browse the collection</Link></div>}</div>;
}
function productsForVariant(variantId: string) { return [getProduct("sunline-arch"), getProduct("noor-petal-grid"), getProduct("mehrab-line"), getProduct("orbit-table-mark"), getProduct("lattice-quiet"), getProduct("nesting-leaves")].find((product) => product?.variants.some((variant) => variant.id === variantId))!; }
