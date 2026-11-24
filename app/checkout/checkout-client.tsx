"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/catalog";
import { parseCart, readCart, writeCart } from "@/lib/cart-browser";

type Quote = { demoOnly: true; checkoutAvailable: boolean; subtotal: number; subtotalDisplay: string; total: number | null; items: Array<{ variantId: string; name: string; label: string; quantity: number; lineTotal: number }>; message: string };
type Address = { id: string; recipientFirst: string; recipientLast: string; address1: string; city: string; phone: string };
export function CheckoutClient() {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", line1: "", city: "", notes: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const submissionRef = useRef<{ fingerprint: string; key: string } | null>(null);
  useEffect(() => {
    const items = parseCart(readCart());
    const controller = new AbortController();
    if (!items.length) { Promise.resolve().then(() => { if (!controller.signal.aborted) setError("Your bag is empty. Add a piece before checkout."); }); return () => controller.abort(); }
    fetch("/api/checkout/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items }), signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? "Quote is unavailable."); return data as Quote; })
      .then(setQuote).catch((issue: unknown) => { if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : "Quote is unavailable."); });
    fetch("/api/account/addresses", { cache: "no-store", signal: controller.signal }).then((response) => response.ok ? response.json() : null).then((data) => { if (data?.addresses) setAddresses(data.addresses); }).catch(() => {});
    return () => controller.abort();
  }, []);
  function chooseAddress(id: string) {
    const address = addresses.find((entry) => entry.id === id);
    if (address) setForm((value) => ({ ...value, name: `${address.recipientFirst} ${address.recipientLast}`.trim(), phone: address.phone, line1: address.address1, city: address.city }));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busyRef.current || !quote?.checkoutAvailable) return;
    const items = parseCart(readCart());
    if (!items.length) { setError("Your bag is empty."); return; }
    busyRef.current = true; setBusy(true); setError("");
    const payload = { email: form.email.trim(), phone: form.phone.trim(), address: { name: form.name.trim(), line1: form.line1.trim(), city: form.city.trim(), notes: form.notes.trim() }, items };
    const fingerprint = JSON.stringify(payload);
    if (!submissionRef.current || submissionRef.current.fingerprint !== fingerprint) submissionRef.current = { fingerprint, key: crypto.randomUUID() };
    try {
      const response = await fetch("/api/checkout/orders", { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": submissionRef.current.key }, body: fingerprint });
      const data = await response.json();
      if (!response.ok) { setError(data.error?.message ?? "Unable to place the demo order."); return; }
      writeCart([]);
      router.push(`/order/success/${encodeURIComponent(data.order.publicOrderNumber)}`);
    } catch { setError("Checkout is temporarily unavailable. You can retry safely with the same details."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  return <div className="checkout-page">
    <div className="checkout-main"><Link className="back-link" href="/cart">← Back to bag</Link><section className="page-hero compact-hero"><p className="eyebrow">Checkout · local demo</p><h1>Make it yours.</h1><p>Contact and delivery details are validated by the server. Stock is reserved only after the demo order is accepted.</p></section>
      <div className="demo-alert"><span>Demo only</span> No live order, payment or notification will be sent. Production shipping and tax are not configured.</div>
      {addresses.length ? <label className="saved-address-picker">Use a saved address<select defaultValue="" onChange={(event) => chooseAddress(event.target.value)}><option value="">Enter a new address</option>{addresses.map((address) => <option key={address.id} value={address.id}>{address.recipientFirst} · {address.address1}, {address.city}</option>)}</select></label> : null}
      <form onSubmit={submit} className="checkout-form"><fieldset><legend>01 / Contact</legend><label>Full name<input required autoComplete="name" value={form.name} maxLength={120} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><div className="form-grid"><label>Email address<input required type="email" autoComplete="email" value={form.email} maxLength={254} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Phone number<input required type="tel" autoComplete="tel" value={form.phone} maxLength={40} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label></div><Link href="/account/login" className="text-link">Already have an account? Sign in</Link></fieldset>
      <fieldset><legend>02 / Delivery details</legend><label>Address<input required autoComplete="street-address" value={form.line1} maxLength={240} onChange={(event) => setForm({ ...form, line1: event.target.value })} /></label><label>City<input required autoComplete="address-level2" value={form.city} maxLength={120} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label><label>Notes <span className="optional">Optional</span><textarea rows={3} value={form.notes} maxLength={500} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></fieldset>
      <fieldset><legend>03 / Payment</legend><div className="payment-choice"><span className="payment-icon">₨</span><span><strong>Cash on Delivery</strong><small>Local demo only. Online payment methods are unavailable.</small></span><span className="radio-dot" /></div></fieldset>
      {error ? <p className="form-error" role="alert">{error}</p> : null}{quote && !quote.checkoutAvailable ? <p className="form-error" role="status">Checkout is currently unavailable while required settings are being configured.</p> : null}
      <button className="button button-dark button-full" disabled={busy || !quote?.checkoutAvailable || !quote.items.length}>{busy ? "Placing demo order…" : "Place demo COD order"}</button></form>
    </div>
    <aside className="checkout-summary"><p className="eyebrow">Your bag</p>{quote?.items.map((item) => <div className="summary-item" key={item.variantId}><span>{item.name}<small>{item.label} · Qty {item.quantity}</small></span><strong>{formatPrice(item.lineTotal)}</strong></div>)}<div className="summary-row"><span>Subtotal</span><strong>{quote?.subtotalDisplay ?? "Pending quote"}</strong></div><div className="summary-row"><span>Shipping and tax</span><span className="tbd">Production policy not configured</span></div><div className="summary-total"><span>{quote?.total != null ? "Synthetic demo total" : "Total"}</span><strong>{quote?.total != null ? formatPrice(quote.total) : "Pending configuration"}</strong></div><p className="micro-note">{quote?.message ?? "The server will recalculate the quote."}</p></aside>
  </div>;
}
