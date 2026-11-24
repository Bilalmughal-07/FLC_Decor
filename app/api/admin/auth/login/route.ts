import { NextResponse } from "next/server";
import { allowRequest, checkSameOrigin, sessionCookie } from "@/lib/auth";
import { loginPersistentAdmin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!checkSameOrigin(request) || !allowRequest(request, "admin-login", 5)) return NextResponse.json({ error: { code: "REQUEST_REJECTED", message: "Please try again later." } }, { status: 429 });
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  if (!body?.email || !body.password) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Email and password are required." } }, { status: 400 });
  try {
    const result = await loginPersistentAdmin(body.email, body.password);
    if (result.kind === "disabled") return NextResponse.json({ error: { code: "ADMIN_AUTH_NOT_CONFIGURED", message: "Administrator authentication is not configured in this environment." } }, { status: 503 });
    if (result.kind === "invalid") return NextResponse.json({ error: { code: "INVALID_CREDENTIALS", message: "Administrator credentials were not accepted." } }, { status: 401 });
    const cookie = sessionCookie(result.token);
    const response = NextResponse.json({ mfaRequired: true, mfaEnrollmentRequired: result.mfaEnrollmentRequired });
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch {
    return NextResponse.json({ error: { code: "ADMIN_AUTH_UNAVAILABLE", message: "Administrator authentication is temporarily unavailable." } }, { status: 503 });
  }
}
