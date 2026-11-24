import { NextResponse } from "next/server";
import { allowRequest, checkSameOrigin } from "@/lib/auth";
import { requestGuestTrackingVerification } from "@/lib/guest-tracking";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!checkSameOrigin(request) || !allowRequest(request, "guest-tracking-request", 5)) return NextResponse.json({ error: { code: "REQUEST_REJECTED", message: "Please try again later." } }, { status: 429 });
  const body = await request.json().catch(() => null) as { orderNumber?: string; email?: string } | null;
  if (!body?.orderNumber || !body.email) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Order number and email are required." } }, { status: 400 });
  const result = await requestGuestTrackingVerification(body.orderNumber, body.email);
  if (result.kind === "disabled") return NextResponse.json({ error: { code: "GUEST_TRACKING_NOT_CONFIGURED", message: result.message } }, { status: 503 });
  // This response is deliberately identical for matching and non-matching data.
  return NextResponse.json({ accepted: true, message: "If the order details match, a short-lived verification code will be sent when delivery is configured." }, { status: 202, headers: { "cache-control": "no-store" } });
}
