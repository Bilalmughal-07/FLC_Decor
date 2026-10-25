"use client";

import Link from "next/link";
import { useState } from "react";
import { PageShell } from "@/components/page-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent) { event.preventDefault(); setError(""); try { const response = await fetch("/api/auth/password-reset/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) }); if (!response.ok) throw new Error(); setSent(true); } catch { setError("The reset service is unavailable."); } }
  return <PageShell><div className="narrow-page auth-page"><p className="eyebrow">Customer account</p><h1>Reset access securely.</h1>{sent ? <><p className="form-success" role="status">Request received. Email delivery is marked NOT_CONFIGURED in this local demo, so no message was sent.</p><Link className="text-link" href="/account/login">Return to sign in →</Link></> : <form className="standalone-form" onSubmit={submit}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button-dark button-full" type="submit">Request reset</button></form>}</div></PageShell>;
}
