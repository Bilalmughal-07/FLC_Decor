import { NextResponse } from "next/server";
import { allowRequest, checkSameOrigin, loginCustomer, registerCustomer, sessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  if (!checkSameOrigin(request) || !allowRequest(request, "register")) return NextResponse.json({ error: { code: "REQUEST_REJECTED", message: "Please try again later." } }, { status: 429 });
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  if (!body?.email || !body.password) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Email and password are required." } }, { status: 400 });
  const result = registerCustomer(body.email, body.password);
  if (result.kind === "disabled") return NextResponse.json({ error: { code: "AUTH_NOT_CONFIGURED", message: "Customer accounts are not configured in this environment." } }, { status: 503 });
  if (result.kind === "exists") return NextResponse.json({ error: { code: "ACCOUNT_EXISTS", message: "Unable to create an account with those details." } }, { status: 409 });
  if (result.kind === "invalid") return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Use a valid email and a password with at least 12 characters." } }, { status: 400 });
  const login = loginCustomer(body.email, body.password);
  if (login.kind !== "authenticated") return NextResponse.json({ error: { code: "AUTH_UNAVAILABLE", message: "The account was created but a session could not be issued." } }, { status: 503 });
  const cookie = sessionCookie(login.token);
  const response = NextResponse.json({ user: { id: result.user.id, email: result.user.email }, demoOnly: true }, { status: 201 });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
