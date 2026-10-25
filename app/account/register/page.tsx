"use client";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
export default function RegisterPage() { return <PageShell><div className="narrow-page auth-page"><p className="eyebrow">Customer account</p><h1>Make the collection yours.</h1><form className="standalone-form"><label>Name<input required /></label><label>Email<input type="email" required /></label><label>Password<input type="password" required /></label><button className="button button-dark button-full" type="button" onClick={() => alert("Registration is not connected to a live database in this demo.")}>Create demo account</button></form><Link className="text-link" href="/account/login">Already registered? Sign in →</Link></div></PageShell>; }
