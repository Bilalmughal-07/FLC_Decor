import { NextResponse } from "next/server";
import { checkSameOrigin, clearSessionCookie, logout } from "@/lib/auth";
import { logoutPersistentAdmin } from "@/lib/admin-auth";
import { getCustomerAuthRuntime } from "@/lib/supabase/config";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: { code: "CSRF_REJECTED", message: "Request origin was not accepted." } }, { status: 403 });
  await logoutPersistentAdmin(request);
  logout(request);
  const supabase = getCustomerAuthRuntime() === "supabase" ? createSupabaseRouteClient(request) : null;
  if (supabase) {
    try { await supabase.client.auth.signOut({ scope: "local" }); }
    catch { /* Continue clearing application-local session cookies. */ }
  }
  const cookie = clearSessionCookie();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  for (const item of request.headers.get("cookie")?.split(";") ?? []) {
    const separator = item.indexOf("=");
    if (separator < 1) continue;
    const name = item.slice(0, separator).trim();
    if (/^sb-[a-z0-9-]+-auth-token(?:\.[0-9]+|-code-verifier)?$/i.test(name)) {
      response.cookies.set(name, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
    }
  }
  return supabase ? supabase.apply(response) : response;
}
