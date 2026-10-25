import { NextResponse } from "next/server";
import { checkSameOrigin, verifyCustomerMfa } from "@/lib/auth";

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: { code: "CSRF_REJECTED", message: "Request origin was not accepted." } }, { status: 403 });
  const body = await request.json().catch(() => null) as { code?: string } | null;
  if (!body?.code || !verifyCustomerMfa(request, body.code)) return NextResponse.json({ error: { code: "MFA_INVALID", message: "The verification code was not accepted." } }, { status: 401 });
  return NextResponse.json({ ok: true, demoOnly: true });
}
