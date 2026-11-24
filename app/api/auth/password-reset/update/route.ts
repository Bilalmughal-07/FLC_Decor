import { NextResponse } from "next/server";
import { allowRequest, checkSameOrigin } from "@/lib/auth";
import { getCustomerAuthRuntime } from "@/lib/supabase/config";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

export async function POST(request: Request) {
  if (!checkSameOrigin(request) || !allowRequest(request, "password-update", 5)) return NextResponse.json({ error: { code: "REQUEST_REJECTED", message: "Please try again later." } }, { status: 429 });
  if (getCustomerAuthRuntime() !== "supabase") return NextResponse.json({ error: { code: "AUTH_NOT_CONFIGURED", message: "Password recovery is not configured in this environment." } }, { status: 503 });
  const body = await request.json().catch(() => null) as { password?: string; passwordConfirmation?: string } | null;
  if (!body?.password || body.password.length < 12 || body.password.length > 256 || body.password !== body.passwordConfirmation) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Use matching passwords of at least 12 characters." } }, { status: 400 });
  const routeClient = createSupabaseRouteClient(request);
  if (!routeClient) return NextResponse.json({ error: { code: "AUTH_NOT_CONFIGURED", message: "Password recovery is not configured in this environment." } }, { status: 503 });
  let current;
  try {
    ({ data: current } = await routeClient.client.auth.getUser());
  } catch {
    return NextResponse.json({ error: { code: "AUTH_UNAVAILABLE", message: "The account service is temporarily unavailable." } }, { status: 503 });
  }
  if (!current.user) return NextResponse.json({ error: { code: "RECOVERY_SESSION_REQUIRED", message: "Open the current password-recovery link before setting a new password." } }, { status: 401 });
  let error;
  try {
    ({ error } = await routeClient.client.auth.updateUser({ password: body.password }));
  } catch {
    return NextResponse.json({ error: { code: "AUTH_UNAVAILABLE", message: "The account service is temporarily unavailable." } }, { status: 503 });
  }
  if (error) return NextResponse.json({ error: { code: "PASSWORD_UPDATE_REJECTED", message: "The password could not be updated. Request a new recovery link and try again." } }, { status: 400 });
  return routeClient.apply(NextResponse.json({ ok: true }));
}
