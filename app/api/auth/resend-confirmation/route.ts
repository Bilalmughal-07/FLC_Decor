import { NextResponse } from "next/server";
import { allowRequest, checkSameOrigin } from "@/lib/auth";
import { authRedirectUrl, getCustomerAuthRuntime } from "@/lib/supabase/config";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

export async function POST(request: Request) {
  if (!checkSameOrigin(request) || !allowRequest(request, "resend-confirmation", 3)) return NextResponse.json({ error: { code: "REQUEST_REJECTED", message: "Please wait before requesting another email." } }, { status: 429 });
  if (getCustomerAuthRuntime() !== "supabase") return NextResponse.json({ error: { code: "AUTH_NOT_CONFIGURED", message: "Email verification is not configured in this environment." } }, { status: 503 });
  const body = await request.json().catch(() => null) as { email?: string } | null;
  const routeClient = createSupabaseRouteClient(request);
  const emailRedirectTo = authRedirectUrl(request.url, "/auth/callback?next=%2Faccount");
  if (!body?.email || body.email.length > 320 || !routeClient || !emailRedirectTo) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "A valid email is required." } }, { status: 400 });
  try {
    await routeClient.client.auth.resend({ type: "signup", email: body.email.trim().toLowerCase(), options: { emailRedirectTo } });
  } catch {
    return NextResponse.json({ error: { code: "AUTH_UNAVAILABLE", message: "The account service is temporarily unavailable." } }, { status: 503 });
  }
  return routeClient.apply(NextResponse.json({ accepted: true, message: "If confirmation is pending, another email will be sent." }, { status: 202 }));
}
