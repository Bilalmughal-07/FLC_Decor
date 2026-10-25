"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageShell } from "@/components/page-shell";

export default function AdminMfaPage() { const router = useRouter(); const [code, setCode] = useState(""); const [error, setError] = useState(""); async function submit(event: React.FormEvent) { event.preventDefault(); setError(""); const response = await fetch("/api/admin/auth/mfa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) }); const data = await response.json(); if (!response.ok) { setError(data.error?.message ?? "MFA was not accepted."); return; } router.push("/admin"); } return <PageShell><div className="narrow-page auth-page"><p className="eyebrow">FLC Decor / MFA required</p><h1>Verify administrator access.</h1><form className="standalone-form" onSubmit={submit}><label>6-digit authenticator code<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} required /></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button-dark button-full" type="submit">Verify and open dashboard</button></form></div></PageShell>; }
