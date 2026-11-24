import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getCustomerAuthRuntime, getSupabasePublicConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const config = getSupabasePublicConfig();
  if (getCustomerAuthRuntime() !== "supabase" || !config) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishableKey, {
    auth: { flowType: "pkce" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies, headers) => {
        for (const { name, value } of cookies) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookies) response.cookies.set({ name, value, ...options });
        for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
      },
    },
  });

  // This verifies the JWT and refreshes an expired access token when possible.
  // Individual server routes still perform their own authorization checks.
  try {
    await supabase.auth.getClaims();
  } catch {
    // Provider outages must not turn public pages into raw authentication
    // exceptions. Protected routes still perform authoritative getUser checks.
  }
  response.headers.set("cache-control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)"],
};
