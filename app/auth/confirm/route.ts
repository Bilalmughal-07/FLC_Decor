import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getCustomerAuthRuntime, safeNextPath } from "@/lib/supabase/config";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

const allowedTypes = new Set<EmailOtpType>(["signup", "email", "recovery", "invite", "magiclink", "email_change"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get("next"), "/account");
  const failure = new URL("/account/login?error=email_confirmation", url.origin);
  if (getCustomerAuthRuntime() !== "supabase") return NextResponse.redirect(failure);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const routeClient = createSupabaseRouteClient(request);
  if (!tokenHash || tokenHash.length > 4096 || !type || !allowedTypes.has(type) || !routeClient) return NextResponse.redirect(failure);
  let error;
  try {
    ({ error } = await routeClient.client.auth.verifyOtp({ type, token_hash: tokenHash }));
  } catch {
    return routeClient.apply(NextResponse.redirect(failure));
  }
  if (error) return routeClient.apply(NextResponse.redirect(failure));
  return routeClient.apply(NextResponse.redirect(new URL(next, url.origin)));
}
