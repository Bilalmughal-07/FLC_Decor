"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";

type Enrollment = { secret: string; otpauthUri: string; alreadyEnrolled?: false };

export default function AdminMfaEnrollmentPage() {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const enrollmentStarted = useRef(false);

  useEffect(() => {
    if (enrollmentStarted.current) return;
    enrollmentStarted.current = true;
    void fetch("/api/admin/auth/mfa/enroll", { method: "POST" })
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (data.alreadyEnrolled) { router.replace("/admin/mfa"); return; }
        if (!response.ok) { setError(data.error?.message ?? "MFA enrollment is unavailable."); return; }
        setEnrollment(data);
      })
      .catch(() => { setError("MFA enrollment is unavailable."); });
  }, [router]);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/auth/mfa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error?.message ?? "MFA was not accepted."); return; }
      setRecoveryCodes(data.recoveryCodes ?? []);
    } catch {
      setError("MFA verification is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  if (recoveryCodes) return <PageShell><div className="narrow-page auth-page"><p className="eyebrow">MFA enabled</p><h1>Save your recovery codes.</h1><p>Store these one-time codes in a password manager. They will not be shown again.</p><div className="recovery-code-grid" aria-label="MFA recovery codes">{recoveryCodes.map((item) => <code key={item}>{item}</code>)}</div><button className="button button-dark button-full" type="button" onClick={() => { router.replace("/admin"); router.refresh(); }}>I have saved these codes</button></div></PageShell>;

  return <PageShell><div className="narrow-page auth-page"><p className="eyebrow">FLC Decor / MFA enrollment</p><h1>Connect an authenticator.</h1><p>Add a TOTP account in your authenticator app using the secret below, then enter its current six-digit code.</p>{enrollment ? <div className="mfa-enrollment-values"><span>Manual setup secret</span><code data-testid="mfa-secret">{enrollment.secret}</code><details><summary>Authenticator setup URI</summary><code className="mfa-uri">{enrollment.otpauthUri}</code></details></div> : <p>Preparing secure enrollment…</p>}<form className="standalone-form" onSubmit={verify}><label>6-digit authenticator code<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} required disabled={!enrollment} /></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button-dark button-full" type="submit" disabled={busy || !enrollment}>{busy ? "Enabling…" : "Enable MFA"}</button></form></div></PageShell>;
}
