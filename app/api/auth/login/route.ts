import { NextResponse } from "next/server";
import { allowRequest, checkSameOrigin, loginCustomer, sessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  if (!checkSameOrigin(request) || !allowRequest(request, "login")) return NextResponse.json({ error: { code: "REQUEST_REJECTED", message: "Please try again later." } }, { status: 429 });
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  if (!body?.email || !body.password) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Email and password are required." } }, { status: 400 });
  const result = loginCustomer(body.email, body.password);
  if (result.kind === "disabled") return NextResponse.json({ error: { code: "AUTH_NOT_CONFIGURED", message: "Customer accounts are not configured in this environment." } }, { status: 503 });
  if (result.kind === "invalid") return NextResponse.json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } }, { status: 401 });
  const cookie = sessionCookie(result.token);
  const response = NextResponse.json({ user: { id: result.user.id, email: result.user.email }, mfaRequired: result.user.mfaEnabled, demoOnly: true });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
