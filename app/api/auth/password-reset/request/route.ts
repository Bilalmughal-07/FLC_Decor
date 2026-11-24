import { NextResponse } from "next/server";
import { allowRequest, checkSameOrigin } from "@/lib/auth";
import { authRedirectUrl, getCustomerAuthRuntime } from "@/lib/supabase/config";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

export async function POST(request: Request) {
  if (!checkSameOrigin(request) || !allowRequest(request, "password-reset", 5)) return NextResponse.json({ error: { code: "REQUEST_REJECTED", message: "Please try again later." } }, { status: 429 });
  const body = await request.json().catch(() => null) as { email?: string } | null;
  if (getCustomerAuthRuntime() === "supabase") {
    const routeClient = createSupabaseRouteClient(request);
    const redirectTo = authRedirectUrl(request.url, "/auth/callback?next=%2Faccount%2Freset-password");
    if (!routeClient || !redirectTo) return NextResponse.json({ error: { code: "AUTH_NOT_CONFIGURED", message: "Customer accounts are not configured in this environment." } }, { status: 503 });
    try {
      if (body?.email && body.email.length <= 320) await routeClient.client.auth.resetPasswordForEmail(body.email.trim().toLowerCase(), { redirectTo });
    } catch {
      return NextResponse.json({ error: { code: "AUTH_UNAVAILABLE", message: "The account service is temporarily unavailable." } }, { status: 503 });
    }
    return routeClient.apply(NextResponse.json({ accepted: true, message: "If an account exists, reset instructions will be sent." }, { status: 202 }));
  }
  return NextResponse.json({ accepted: true, delivery: "NOT_CONFIGURED", message: "If an account exists, reset instructions will be sent when email delivery is configured." }, { status: 202 });
}
