import type { NextConfig } from "next";

function publicMediaConfiguration() {
  const configured = process.env.R2_PUBLIC_BASE_URL;
  if (!configured || configured === "NOT_CONFIGURED") return null;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:") return null;
    return { origin: url.origin, pattern: { protocol: "https" as const, hostname: url.hostname, port: url.port, pathname: `${url.pathname.replace(/\/$/, "")}/public/**` } };
  } catch { return null; }
}

const publicMedia = publicMediaConfiguration();

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  images: publicMedia ? { remotePatterns: [publicMedia.pattern] } : undefined,
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Content-Security-Policy", value: process.env.NODE_ENV === "production" ? `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob:${publicMedia ? ` ${publicMedia.origin}` : ""}; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'` : `default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; img-src 'self' data: blob:${publicMedia ? ` ${publicMedia.origin}` : ""}; connect-src 'self'` },
        ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
      ],
    }];
  },
};

export default nextConfig;
