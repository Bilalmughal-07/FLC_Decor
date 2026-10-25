import { NextResponse } from "next/server";
import { checkSameOrigin, clearSessionCookie, logout } from "@/lib/auth";

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: { code: "CSRF_REJECTED", message: "Request origin was not accepted." } }, { status: 403 });
  logout(request);
  const cookie = clearSessionCookie();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
