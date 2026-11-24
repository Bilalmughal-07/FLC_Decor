"use client";

import { useState } from "react";
type TrackedOrder = { publicOrderNumber: string; status: string; fulfillmentStatus: string | null; createdAt: string; items: Array<{ productNameSnapshot: string; variantSnapshotJson: unknown; quantity: number; lineTotalMinor: number; currency: string }> };

export function TrackClient() {
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function requestVerification(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/guest-orders/verify/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderNumber: number, email }) });
      if (!response.ok) throw new Error("UNAVAILABLE");
      setStep("confirm"); setMessage("If the order details match, a short-lived verification code will be sent. No order existence is disclosed from this request.");
    } catch { setMessage("If the order details match, a short-lived verification code will be sent when delivery is configured. No order existence is disclosed from this request."); }
    finally { setBusy(false); }
  }
  async function confirmVerification(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/guest-orders/verify/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderNumber: number, email, code }) });
      const data = await response.json() as { error?: { message?: string } };
      if (!response.ok) { setError(data.error?.message ?? "The verification code was not accepted."); return; }
      const orderResponse = await fetch(`/api/orders/${encodeURIComponent(number)}`, { cache: "no-store" });
      const orderData = await orderResponse.json() as { order?: TrackedOrder; error?: { message?: string } };
      if (!orderResponse.ok || !orderData.order) { setError(orderData.error?.message ?? "The order could not be loaded."); return; }
      setOrder(orderData.order); setMessage("Verified order details");
    } catch { setError("The tracking service is unavailable."); }
    finally { setBusy(false); }
  }
  return <div className="narrow-page"><section className="page-hero compact-hero"><p className="eyebrow">Private order tracking</p><h1>Where is your order?</h1><p>Order number alone is not enough. Verify control of the associated email before any order detail is shown.</p></section><form className="standalone-form" onSubmit={step === "request" ? requestVerification : confirmVerification}><label>Order number<input required value={number} onChange={(event) => setNumber(event.target.value)} placeholder="FL-2026-AB12CD34" disabled={step === "confirm"} /></label><label>Order email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={step === "confirm"} /></label>{step === "confirm" ? <label>Verification code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} /></label> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button-dark button-full" disabled={busy}>{busy ? "Checking…" : step === "request" ? "Request secure verification" : "Verify and view order"}</button>{message ? <p className="form-success" role="status">{message}</p> : null}</form>{order ? <section className="success-detail" aria-label="Verified order details"><strong>{order.publicOrderNumber}</strong><span>{order.fulfillmentStatus ?? order.status}</span>{order.items.map((item) => <span key={`${item.productNameSnapshot}-${item.quantity}`}>{item.productNameSnapshot} · {item.quantity}</span>)}</section> : null}<p className="micro-note">Verification delivery is not configured in this local build. No order existence is disclosed from this form.</p></div>;
}
