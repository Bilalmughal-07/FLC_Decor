"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { businessContact } from "@/lib/business-contact";
import { CartDrawer } from "./cart-drawer";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader({ databaseCatalog = false }: { databaseCatalog?: boolean }) {
  const [open, setOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [identity, setIdentity] = useState<"CUSTOMER" | "ADMIN" | null>(null);
  const closeCart = useCallback(() => setCartOpen(false), []);
  useEffect(() => {
    const sync = () => setCount(Number(window.localStorage.getItem("flc-cart-count") ?? 0));
    sync(); window.addEventListener("storage", sync); window.addEventListener("flc-cart-change", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("flc-cart-change", sync); };
  }, []);
  useEffect(() => { if (!open) return; const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [open]);
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" }).then(async (response) => response.ok ? response.json() : null).then((data) => {
      if (active) setIdentity(data?.user?.role === "ADMIN" ? "ADMIN" : data?.user?.role === "CUSTOMER" ? "CUSTOMER" : null);
    }).catch(() => { if (active) setIdentity(null); });
    return () => { active = false; };
  }, []);
  const accountHref = identity === "ADMIN" ? "/admin" : identity === "CUSTOMER" ? "/account" : "/account/login";
  const accountLabel = identity === "ADMIN" ? "Admin" : identity === "CUSTOMER" ? "Account" : "Sign in";
  return <header className="site-header-shell" aria-label="Site header">
    <div className="announcement"><a href={businessContact.whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp {businessContact.phoneDisplay}</a><span className="announcement-note">FLC Decor · Gujranwala, Pakistan</span></div>
    <div className="site-header">
      <Link href="/" className="brand"><span className="brand-mark">F</span><span><strong>FLC DECOR</strong><small>FAHAD LASER</small></span></Link>
      <button className="menu-button" type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen((value) => !value)}><span aria-hidden="true">{open ? "×" : "☰"}</span></button>
      <nav id="main-nav" className={`main-nav ${open ? "is-open" : ""}`} aria-label="Main navigation">
        <Link href="/" onClick={() => setOpen(false)}>Home</Link>
        <Link href="/shop" onClick={() => setOpen(false)}>Shop</Link>
        <Link href="/shop?sort=featured" onClick={() => setOpen(false)}>Collections</Link>
        <Link href="/about" onClick={() => setOpen(false)}>Our story</Link>
        <Link href="/custom-orders" onClick={() => setOpen(false)}>Bespoke inquiries</Link>
        <Link href="/contact" onClick={() => setOpen(false)}>Contact</Link>
        <Link className="mobile-account-link" href={accountHref} onClick={() => setOpen(false)}>{accountLabel}</Link>
      </nav>
      <div className="header-actions">
        <Link href="/search" className="icon-link" aria-label="Search catalog">⌕</Link>
        <Link href={accountHref} className="icon-link" aria-label={accountLabel} title={accountLabel}>♙</Link>
        <button type="button" className="cart-link" aria-label={`Open bag, ${count} items`} aria-haspopup="dialog" aria-expanded={cartOpen} aria-controls="cart-drawer" onClick={() => setCartOpen(true)}>Bag <span>{count}</span></button>
        <ThemeToggle />
      </div>
    </div>
    <CartDrawer open={cartOpen} onClose={closeCart} databaseCatalog={databaseCatalog} />
  </header>;
}
