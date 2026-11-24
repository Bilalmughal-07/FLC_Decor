import { NextResponse } from "next/server";
import { allowRequest, checkSameOrigin } from "@/lib/auth";
import { confirmGuestTrackingVerification, trackingCookie } from "@/lib/guest-tracking";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!checkSameOrigin(request) || !allowRequest(request, "guest-tracking-confirm", 10)) return NextResponse.json({ error: { code: "REQUEST_REJECTED", message: "Please try again later." } }, { status: 429 });
  const body = await request.json().catch(() => null) as { orderNumber?: string; email?: string; code?: string } | null;
  if (!body?.orderNumber || !body.email || !body.code) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Order number, email and verification code are required." } }, { status: 400 });
  const result = await confirmGuestTrackingVerification(body.orderNumber, body.email, body.code);
  if (result.kind === "disabled") return NextResponse.json({ error: { code: "GUEST_TRACKING_NOT_CONFIGURED", message: result.message } }, { status: 503 });
  if (result.kind !== "accepted" || !result.token) return NextResponse.json({ error: { code: "VERIFICATION_FAILED", message: "The verification code was not accepted." } }, { status: 401 });
  const cookie = trackingCookie(result.token);
  const response = NextResponse.json({ verified: true }, { headers: { "cache-control": "no-store" } });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
