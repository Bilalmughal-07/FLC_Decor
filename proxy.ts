import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const protectedAdminPage = pathname === "/admin" || (pathname.startsWith("/admin/") && pathname !== "/admin/login" && pathname !== "/admin/mfa");
  if (protectedAdminPage && process.env.NODE_ENV === "production") return NextResponse.redirect(new URL("/admin/login?reason=not-configured", request.url));
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
