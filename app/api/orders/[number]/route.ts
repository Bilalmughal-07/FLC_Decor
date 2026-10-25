import { NextResponse } from "next/server";
export async function GET(request: Request, { params }: { params: Promise<{ number: string }> }) {
  // A real implementation must validate a short-lived email-verified capability here.
  // The local demo has no email provider, so it fails closed instead of exposing order existence.
  void request;
  void params;
  return NextResponse.json({ error: { code: "GUEST_TRACKING_NOT_CONFIGURED", message: "Secure email verification is not configured in this local demo." } }, { status: 503 });
}
