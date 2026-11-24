import { NextResponse } from "next/server";
import { allowRequest, checkSameOrigin, loginCustomer, registerCustomer, sessionCookie } from "@/lib/auth";
import { authRedirectUrl, getCustomerAuthRuntime } from "@/lib/supabase/config";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

function validEmail(value: string) { return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }

export async function POST(request: Request) {
  if (!checkSameOrigin(request) || !allowRequest(request, "register")) return NextResponse.json({ error: { code: "REQUEST_REJECTED", message: "Please try again later." } }, { status: 429 });
  const body = await request.json().catch(() => null) as { email?: string; password?: string; passwordConfirmation?: string; displayName?: string } | null;
  if (!body?.email || !body.password) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Email and password are required." } }, { status: 400 });
  const email = body.email.trim().toLowerCase();
  if (!validEmail(email) || body.password.length < 12 || body.password.length > 256 || (body.passwordConfirmation !== undefined && body.password !== body.passwordConfirmation)) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Use a valid email, matching passwords, and at least 12 characters." } }, { status: 400 });
  }
  if (body.displayName !== undefined && (typeof body.displayName !== "string" || body.displayName.trim().length > 120)) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Display name must be at most 120 characters." } }, { status: 400 });
  }

  if (getCustomerAuthRuntime() === "supabase") {
    const routeClient = createSupabaseRouteClient(request);
    const emailRedirectTo = authRedirectUrl(request.url, "/auth/callback?next=%2Faccount");
    if (!routeClient || !emailRedirectTo) return NextResponse.json({ error: { code: "AUTH_NOT_CONFIGURED", message: "Customer accounts are not configured in this environment." } }, { status: 503 });
    let result;
    try {
      result = await routeClient.client.auth.signUp({
        email,
        password: body.password,
        options: { emailRedirectTo, data: body.displayName?.trim() ? { display_name: body.displayName.trim() } : undefined },
      });
    } catch {
      return NextResponse.json({ error: { code: "AUTH_UNAVAILABLE", message: "The account service is temporarily unavailable." } }, { status: 503 });
    }
    const { data, error } = result;
    if (error) {
      const status = error.status === 429 ? 429 : error.status && error.status >= 500 ? 503 : 400;
      return NextResponse.json({ error: { code: status === 429 ? "RATE_LIMITED" : "REGISTRATION_REJECTED", message: status === 429 ? "Please wait before trying again." : "Unable to create an account with those details." } }, { status });
    }
    return routeClient.apply(NextResponse.json({ user: data.user ? { id: data.user.id, email: data.user.email } : null, verificationRequired: !data.session }, { status: 201 }));
  }

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
