import { NextResponse } from "next/server";
import { allowRequest, checkSameOrigin } from "@/lib/auth";

export async function POST(request: Request) {
  if (!checkSameOrigin(request) || !allowRequest(request, "password-reset", 5)) return NextResponse.json({ error: { code: "REQUEST_REJECTED", message: "Please try again later." } }, { status: 429 });
  await request.json().catch(() => null);
  return NextResponse.json({ accepted: true, delivery: "NOT_CONFIGURED", message: "If an account exists, reset instructions will be sent when email delivery is configured." }, { status: 202 });
}
