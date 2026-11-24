import Link from "next/link";
import { cookies } from "next/headers";
import { PageShell } from "@/components/page-shell";
import { findDemoOrder } from "@/lib/demo-store";
import { formatPrice } from "@/lib/catalog";
import { getPrisma } from "@/lib/prisma";
import { readOrderReceipt, receiptCookieName } from "@/lib/order-receipt";

export const dynamic = "force-dynamic";
export default async function SuccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const cookie = (await cookies()).get(receiptCookieName)?.value;
  const id = readOrderReceipt(cookie, token);
  let order: { publicOrderNumber: string; subtotal: number; items: Array<{ name: string; quantity: number }> } | null = null;
  if (id && process.env.CHECKOUT_RUNTIME === "database" && process.env.NODE_ENV !== "production") {
    try {
      const row = await getPrisma().order.findFirst({ where: { id, publicOrderNumber: token }, select: { publicOrderNumber: true, subtotalMinor: true, items: { select: { productNameSnapshot: true, quantity: true } } } });
      if (row) order = { publicOrderNumber: row.publicOrderNumber, subtotal: row.subtotalMinor, items: row.items.map((item) => ({ name: item.productNameSnapshot, quantity: item.quantity })) };
    } catch { /* Show the safe unavailable state below. */ }
  } else if (id && process.env.NODE_ENV !== "production") {
    const row = findDemoOrder(token);
    if (row?.id === id) order = { publicOrderNumber: row.publicOrderNumber, subtotal: row.subtotal, items: row.items.map((item) => ({ name: item.productName, quantity: item.quantity })) };
  }
  return <PageShell><div className="success-page">{order ? <>
    <div className="success-seal" aria-hidden="true">✓</div><p className="eyebrow">Demo order received</p><h1>Your order has been received.</h1>
    <p>This is a local synthetic order. Keep your order number for your records. No production purchase or message was sent.</p>
    <div className="order-number">{order.publicOrderNumber}</div>
    <div className="success-detail"><span>Subtotal</span><strong>{formatPrice(order.subtotal)}</strong></div>
    {order.items.map((item, index) => <div className="success-detail" key={index}><span>{item.name}</span><span>Qty {item.quantity}</span></div>)}
    <div className="demo-alert"><span>Demo only</span> Shipping and tax policy are not configured for production.</div>
    <div className="hero-actions"><Link className="button button-dark" href="/track-order">Order tracking</Link><Link className="text-link" href="/shop">Continue browsing →</Link></div>
  </> : <>
    <p className="eyebrow">Private confirmation</p><h1>This receipt is unavailable.</h1><p>For privacy, confirmation is available only in the checkout browser for a short time. Guest tracking requires verified control of the order email.</p>
    <div className="hero-actions"><Link className="button button-dark" href="/track-order">Verify and track an order</Link><Link className="text-link" href="/shop">Return to collection →</Link></div>
  </>}</div></PageShell>;
}
