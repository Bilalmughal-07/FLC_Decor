"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const issue = new URL(window.location.href).searchParams.get("error");
    if (!issue) return;
    const timeout = window.setTimeout(() => setError("Sign-in could not be completed. Please try again."), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error?.message ?? "Unable to sign in."); return; }
      router.push("/account"); router.refresh();
    } catch { setError("The account service is unavailable."); }
    finally { setBusy(false); }
  }

  async function google() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/oauth/google", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ next: "/account" }) });
      const data = await response.json();
      if (!response.ok || !data.url) { setError(data.error?.message ?? "Google sign-in is unavailable."); return; }
      window.location.assign(data.url);
    } catch { setError("Google sign-in is unavailable."); }
    finally { setBusy(false); }
  }

  return <PageShell><div className="narrow-page auth-page"><p className="eyebrow">Customer account</p><h1>Welcome back.</h1><form className="standalone-form" onSubmit={submit}><label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<span className="password-control"><input aria-label="Password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-pressed={showPassword}>{showPassword ? "Hide" : "Show"}</button></span></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button-dark button-full" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button><button className="button button-outline button-full" type="button" disabled={busy} onClick={google}>Continue with Google</button></form><Link className="text-link" href="/account/register">Need an account? Create one →</Link><Link className="text-link" href="/account/forgot-password">Forgot your password? →</Link></div></PageShell>;
}
