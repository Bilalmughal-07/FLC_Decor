import { NextResponse } from "next/server";
import { checkSameOrigin, enrollCustomerMfa } from "@/lib/auth";

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: { code: "CSRF_REJECTED", message: "Request origin was not accepted." } }, { status: 403 });
  const result = enrollCustomerMfa(request);
  if (!result) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in to manage MFA." } }, { status: 401 });
  return NextResponse.json({ ...result, demoOnly: true });
}
