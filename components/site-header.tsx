"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  useEffect(() => {
    const sync = () => setCount(Number(window.localStorage.getItem("flc-cart-count") ?? 0));
    sync(); window.addEventListener("storage", sync); window.addEventListener("flc-cart-change", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("flc-cart-change", sync); };
  }, []);
  return <header className="site-header-shell" aria-label="Site header">
    <div className="announcement"><span>Fahad Laser / FLC Decor</span><span className="announcement-note">Synthetic demo catalog · Pakistan</span></div>
    <div className="site-header">
      <Link href="/" className="brand"><span className="brand-mark">F</span><span><strong>FAHAD LASER</strong><small>FLC DECOR</small></span></Link>
      <button className="menu-button" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen((value) => !value)}>Menu <span>{open ? "×" : "＋"}</span></button>
      <nav id="main-nav" className={`main-nav ${open ? "is-open" : ""}`} aria-label="Main navigation">
        <Link href="/shop" onClick={() => setOpen(false)}>Shop</Link>
        <Link href="/shop?sort=featured" onClick={() => setOpen(false)}>Collections</Link>
        <Link href="/about" onClick={() => setOpen(false)}>Our approach</Link>
        <Link href="/custom-orders" onClick={() => setOpen(false)}>Custom design</Link>
      </nav>
      <div className="header-actions">
        <Link href="/search" className="icon-link" aria-label="Search">⌕</Link>
        <Link href="/account" className="icon-link" aria-label="Account">◯</Link>
        <Link href="/cart" className="cart-link" aria-label={`Bag ${count} cart`}>Bag <span>{count}</span></Link>
      </div>
    </div>
  </header>;
}
