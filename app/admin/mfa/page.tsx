"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageShell } from "@/components/page-shell";

export default function AdminMfaPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/auth/mfa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (data.error?.code === "MFA_ENROLLMENT_REQUIRED") {
        router.replace("/admin/mfa/enroll");
        return;
      }
      if (!response.ok) {
        setError(data.error?.message ?? "MFA was not accepted.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Administrator verification is unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <PageShell>
      <div className="narrow-page auth-page">
        <p className="eyebrow">FLC Decor / MFA required</p>
        <h1>Verify administrator access.</h1>
        <form className="standalone-form" onSubmit={submit}>
          <label>
            Authenticator or recovery code
            <input
              autoComplete="one-time-code"
              maxLength={16}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="button button-dark button-full" type="submit" disabled={busy}>
            {busy ? "Verifying…" : "Verify and open dashboard"}
          </button>
        </form>
      </div>
    </PageShell>
  );
}
