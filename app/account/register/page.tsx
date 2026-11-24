"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageShell } from "@/components/page-shell";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName, email, password, passwordConfirmation }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error?.message ?? "Unable to create the account."); return; }
      if (data.verificationRequired) { setMessage("Check your email to verify the account before signing in."); return; }
      router.push("/account"); router.refresh();
    } catch { setError("The account service is unavailable."); }
    finally { setBusy(false); }
  }

  async function resend() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/resend-confirmation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error?.message ?? "Unable to resend confirmation."); return; }
      setMessage(data.message);
    } catch { setError("Confirmation email is unavailable."); }
    finally { setBusy(false); }
  }

  return <PageShell><div className="narrow-page auth-page"><p className="eyebrow">Customer account</p><h1>Make the collection yours.</h1><form className="standalone-form" onSubmit={submit}><label>Name <span className="optional">Optional</span><input autoComplete="name" maxLength={120} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label><label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<span className="password-control"><input aria-label="Password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-pressed={showPassword}>{showPassword ? "Hide" : "Show"}</button></span><small>Use at least 12 characters.</small></label><label>Confirm password<input aria-label="Confirm password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} minLength={12} required /></label>{error ? <p className="form-error" role="alert">{error}</p> : null}{message ? <p className="form-success" role="status">{message}</p> : null}<button className="button button-dark button-full" type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>{message ? <button className="button button-outline button-full" type="button" disabled={busy} onClick={resend}>Resend confirmation email</button> : null}</form><Link className="text-link" href="/account/login">Already registered? Sign in →</Link></div></PageShell>;
}
