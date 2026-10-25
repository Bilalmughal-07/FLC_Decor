import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function Footer() {
  return <footer className="site-footer"><div className="footer-brand"><div className="brand-mark">F</div><p>FLC Decor — Crafted with Precision. Designed to Inspire.</p><ThemeToggle /></div><div className="footer-links"><div><p className="eyebrow">Explore</p><Link href="/shop">Shop all</Link><Link href="/about">Our approach</Link><Link href="/faq">FAQ</Link></div><div><p className="eyebrow">Support</p><Link href="/track-order">Track an order</Link><Link href="/custom-orders">Custom design</Link><Link href="/contact">Contact</Link></div><div><p className="eyebrow">Policies</p><Link href="/shipping">Shipping</Link><Link href="/returns">Returns</Link><Link href="/privacy">Privacy</Link></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} FLC Decor. Sample build.</span><span>Public business details are not configured.</span></div></footer>;
}
