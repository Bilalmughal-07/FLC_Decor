import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

type PendingCookie = { name: string; value: string; options: CookieOptions };

function requestCookies(request: Request) {
  const values = new Map<string, string>();
  for (const part of request.headers.get("cookie")?.split(";") ?? []) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    const raw = part.slice(separator + 1).trim();
    try { values.set(name, decodeURIComponent(raw)); } catch { values.set(name, raw); }
  }
  return values;
}

export function createSupabaseRouteClient(request: Request) {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  const values = requestCookies(request);
  const pending = new Map<string, PendingCookie>();
  const responseHeaders = new Map<string, string>();
  const client = createServerClient(config.url, config.publishableKey, {
    auth: { flowType: "pkce" },
    cookies: {
      getAll: () => [...values].map(([name, value]) => ({ name, value })),
      setAll: (cookies, headers) => {
        for (const cookie of cookies) {
          values.set(cookie.name, cookie.value);
          pending.set(cookie.name, cookie);
        }
        for (const [name, value] of Object.entries(headers)) responseHeaders.set(name, value);
      },
    },
  });
  return {
    client,
    apply(response: NextResponse) {
      for (const cookie of pending.values()) response.cookies.set({ name: cookie.name, value: cookie.value, ...cookie.options });
      for (const [name, value] of responseHeaders) response.headers.set(name, value);
      response.headers.set("cache-control", "private, no-store");
      return response;
    },
  };
}
