"use client";

import Link from "next/link";
import { useState } from "react";
import { PageShell } from "@/components/page-shell";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/password-reset/update", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password, passwordConfirmation }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error?.message ?? "Unable to update the password."); return; }
      setComplete(true);
    } catch { setError("The account service is unavailable."); }
    finally { setBusy(false); }
  }
  return <PageShell><div className="narrow-page auth-page"><p className="eyebrow">Customer account</p><h1>Choose a new password.</h1>{complete ? <><p className="form-success" role="status">Your password was updated.</p><Link className="button button-dark" href="/account">Continue to your account</Link></> : <form className="standalone-form" onSubmit={submit}><label>New password<span className="password-control"><input type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-pressed={showPassword}>{showPassword ? "Hide" : "Show"}</button></span></label><label>Confirm new password<input type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={12} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} required /></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button-dark button-full" disabled={busy}>{busy ? "Updating…" : "Update password"}</button></form>}</div></PageShell>;
}
