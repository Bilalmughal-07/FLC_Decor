import { NextResponse } from "next/server";
import { getCustomerAuthRuntime, safeNextPath } from "@/lib/supabase/config";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get("next"), "/account");
  const failure = new URL("/account/login?error=auth_callback", url.origin);
  if (getCustomerAuthRuntime() !== "supabase") return NextResponse.redirect(failure);
  const code = url.searchParams.get("code");
  const routeClient = createSupabaseRouteClient(request);
  if (!code || code.length > 2048 || !routeClient) return NextResponse.redirect(failure);
  let error;
  try {
    ({ error } = await routeClient.client.auth.exchangeCodeForSession(code));
  } catch {
    return routeClient.apply(NextResponse.redirect(failure));
  }
  if (error) return routeClient.apply(NextResponse.redirect(failure));
  return routeClient.apply(NextResponse.redirect(new URL(next, url.origin)));
}
