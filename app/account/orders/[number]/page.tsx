import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { accountActor } from "@/lib/account-api";
import { getAccountOrder } from "@/lib/account-store";
import { formatPrice } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function AccountOrderPage({ params }: { params: Promise<{ number: string }> }) {
  const requestHeaders = await headers();
  const request = new Request("http://internal.local/account/orders", { headers: { cookie: requestHeaders.get("cookie") ?? "" } });
  let actor;
  try { actor = await accountActor(request); } catch { redirect("/account/login"); }
  const order = await getAccountOrder(actor, (await params).number);
  if (!order) notFound();
  return <PageShell><div className="narrow-page"><Link className="back-link" href="/account">← Account</Link><p className="eyebrow">Customer order</p><h1>{order.publicOrderNumber}</h1><p className="lead">{order.fulfillmentStatus ?? order.status} · Payment {order.paymentStatus ?? "pending"}</p><section className="account-panel account-orders"><h2>Pieces</h2>{order.items.map((item) => <div className="address-row" key={item.id}><div><strong>{item.productNameSnapshot}</strong><p>Quantity {item.quantity}</p></div><span>{formatPrice(item.lineTotalMinor)}</span></div>)}<div className="summary-row"><span>Subtotal</span><strong>{formatPrice(order.subtotalMinor)}</strong></div><div className="summary-row"><span>Shipping</span><strong>{order.shippingMinor == null ? "Not configured" : formatPrice(order.shippingMinor)}</strong></div><div className="summary-row"><span>Tax</span><strong>{formatPrice(order.taxMinor)}</strong></div><div className="summary-total"><span>Total</span><strong>{order.totalMinor == null ? "Pending" : formatPrice(order.totalMinor)}</strong></div></section><section className="account-panel"><h2>Status history</h2>{order.statusEvents.map((event) => <div className="address-row" key={`${event.toStatus}-${event.createdAt.toISOString()}`}><div><strong>{event.toStatus}</strong><p>{event.reason ?? "Order status updated"}</p></div><time>{event.createdAt.toLocaleString("en-PK")}</time></div>)}</section><p className="micro-note">Delivery tracking appears only after an approved courier update. This local checkout remains a synthetic demo.</p></div></PageShell>;
}
