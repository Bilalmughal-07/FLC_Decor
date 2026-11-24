export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export type CustomerAuthRuntime = "supabase" | "demo" | "disabled";

function configured(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "NOT_CONFIGURED" ? trimmed : null;
}

export function getCustomerAuthRuntime(): CustomerAuthRuntime {
  const requested = process.env.AUTH_RUNTIME?.trim().toLowerCase();
  if (requested === "supabase") return "supabase";
  if (requested === "demo" && process.env.NODE_ENV !== "production") return "demo";
  return "disabled";
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = configured(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = configured(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (!url || !publishableKey) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && parsed.protocol === "http:")) return null;
    return { url: parsed.origin, publishableKey };
  } catch {
    return null;
  }
}

export function isSupabaseAuthConfigured() {
  return getCustomerAuthRuntime() === "supabase" && getSupabasePublicConfig() !== null;
}

export function safeNextPath(value: string | null | undefined, fallback = "/account") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\r\n]/.test(value)) return fallback;
  return value;
}

export function getApplicationOrigin(requestUrl: string) {
  const configuredOrigin = configured(process.env.NEXT_PUBLIC_APP_URL);
  if (configuredOrigin) {
    try {
      const parsed = new URL(configuredOrigin);
      if (parsed.protocol === "https:" || (process.env.NODE_ENV !== "production" && parsed.protocol === "http:")) return parsed.origin;
    } catch {
      // Fall through to the controlled development request origin.
    }
  }
  if (process.env.NODE_ENV !== "production") return new URL(requestUrl).origin;
  return null;
}

export function authRedirectUrl(requestUrl: string, pathname: string) {
  const origin = getApplicationOrigin(requestUrl);
  if (!origin) return null;
  return new URL(safeNextPath(pathname, "/account"), origin).toString();
}
