import { NextResponse } from "next/server";
import { allowRequest, checkSameOrigin, loginCustomer, sessionCookie } from "@/lib/auth";
import { getCustomerAuthRuntime } from "@/lib/supabase/config";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

export async function POST(request: Request) {
  if (!checkSameOrigin(request) || !allowRequest(request, "login")) return NextResponse.json({ error: { code: "REQUEST_REJECTED", message: "Please try again later." } }, { status: 429 });
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  if (!body?.email || !body.password) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Email and password are required." } }, { status: 400 });
  if (getCustomerAuthRuntime() === "supabase") {
    const routeClient = createSupabaseRouteClient(request);
    if (!routeClient) return NextResponse.json({ error: { code: "AUTH_NOT_CONFIGURED", message: "Customer accounts are not configured in this environment." } }, { status: 503 });
    let result;
    try {
      result = await routeClient.client.auth.signInWithPassword({ email: body.email.trim().toLowerCase(), password: body.password });
    } catch {
      return NextResponse.json({ error: { code: "AUTH_UNAVAILABLE", message: "The account service is temporarily unavailable." } }, { status: 503 });
    }
    const { data, error } = result;
    if (error || !data.user) {
      const status = error?.status === 429 ? 429 : error?.status && error.status >= 500 ? 503 : 401;
      return NextResponse.json({ error: { code: status === 429 ? "RATE_LIMITED" : status === 503 ? "AUTH_UNAVAILABLE" : "INVALID_CREDENTIALS", message: status === 429 ? "Please wait before trying again." : status === 503 ? "The account service is temporarily unavailable." : "Email or password is incorrect, or the email has not been verified." } }, { status });
    }
    return routeClient.apply(NextResponse.json({ user: { id: data.user.id, email: data.user.email }, mfaRequired: false }));
  }
  const result = loginCustomer(body.email, body.password);
  if (result.kind === "disabled") return NextResponse.json({ error: { code: "AUTH_NOT_CONFIGURED", message: "Customer accounts are not configured in this environment." } }, { status: 503 });
  if (result.kind === "invalid") return NextResponse.json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } }, { status: 401 });
  const cookie = sessionCookie(result.token);
  const response = NextResponse.json({ user: { id: result.user.id, email: result.user.email }, mfaRequired: result.user.mfaEnabled, demoOnly: true });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
