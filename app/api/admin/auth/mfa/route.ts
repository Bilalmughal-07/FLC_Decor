import { NextResponse } from "next/server";
import { allowRequest, checkSameOrigin } from "@/lib/auth";
import { verifyPersistentAdminMfa } from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: { code: "CSRF_REJECTED", message: "Request origin was not accepted." } }, { status: 403 });
  if (!allowRequest(request, "admin-mfa", 10)) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many verification attempts. Please wait." } }, { status: 429 });
  const body = await request.json().catch(() => null) as { code?: string } | null;
  if (!body?.code) return NextResponse.json({ error: { code: "MFA_INVALID", message: "The administrator verification code was not accepted." } }, { status: 401 });
  try {
    const result = await verifyPersistentAdminMfa(request, body.code);
    if (result.kind === "enrollment_required") return NextResponse.json({ error: { code: "MFA_ENROLLMENT_REQUIRED", message: "Enroll an authenticator before verification." } }, { status: 409 });
    if (result.kind !== "verified") return NextResponse.json({ error: { code: "MFA_INVALID", message: "The administrator verification code was not accepted." } }, { status: 401 });
    return NextResponse.json({ ok: true, recoveryCodes: result.recoveryCodes });
  } catch {
    return NextResponse.json({ error: { code: "MFA_UNAVAILABLE", message: "Administrator verification is temporarily unavailable." } }, { status: 503 });
  }
}
