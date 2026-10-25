"use client";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
export default function LoginPage() { return <PageShell><div className="narrow-page auth-page"><p className="eyebrow">Customer account</p><h1>Welcome back.</h1><form className="standalone-form" action="/account"><label>Email<input type="email" required /></label><label>Password<input type="password" required /></label><button className="button button-dark button-full" type="button" onClick={() => alert("Account sign-in is a documented demo boundary; no real credential is accepted.")}>Sign in to demo</button></form><Link className="text-link" href="/account/register">Need an account? Create one →</Link></div></PageShell>; }
