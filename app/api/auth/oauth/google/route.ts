import { NextResponse } from "next/server";
import { allowRequest, checkSameOrigin } from "@/lib/auth";
import { authRedirectUrl, getCustomerAuthRuntime, safeNextPath } from "@/lib/supabase/config";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

export async function POST(request: Request) {
  if (!checkSameOrigin(request) || !allowRequest(request, "oauth-google", 10)) return NextResponse.json({ error: { code: "REQUEST_REJECTED", message: "Please try again later." } }, { status: 429 });
  if (getCustomerAuthRuntime() !== "supabase") return NextResponse.json({ error: { code: "AUTH_NOT_CONFIGURED", message: "Google sign-in is not configured in this environment." } }, { status: 503 });
  const body = await request.json().catch(() => null) as { next?: string } | null;
  const next = safeNextPath(body?.next, "/account");
  const routeClient = createSupabaseRouteClient(request);
  const redirectTo = authRedirectUrl(request.url, `/auth/callback?next=${encodeURIComponent(next)}`);
  if (!routeClient || !redirectTo) return NextResponse.json({ error: { code: "AUTH_NOT_CONFIGURED", message: "Google sign-in is not configured in this environment." } }, { status: 503 });
  let result;
  try {
    result = await routeClient.client.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
  } catch {
    return NextResponse.json({ error: { code: "OAUTH_UNAVAILABLE", message: "Google sign-in is temporarily unavailable." } }, { status: 503 });
  }
  const { data, error } = result;
  if (error || !data.url) return NextResponse.json({ error: { code: "OAUTH_UNAVAILABLE", message: "Google sign-in is temporarily unavailable." } }, { status: 503 });
  return routeClient.apply(NextResponse.json({ url: data.url }));
}
