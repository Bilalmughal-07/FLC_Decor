import { NextResponse } from "next/server";
import { allowRequest, checkSameOrigin } from "@/lib/auth";
import { enrollPersistentAdminMfa } from "@/lib/admin-auth";
import { DomainError } from "@/lib/backend-validation";

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: { code: "CSRF_REJECTED", message: "Request origin was not accepted." } }, { status: 403 });
  if (!allowRequest(request, "admin-mfa-enroll", 5)) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many enrollment attempts. Please wait." } }, { status: 429 });
  try { return NextResponse.json(await enrollPersistentAdminMfa(request), { headers: { "cache-control": "no-store" } }); }
  catch (error) {
    const status = error instanceof DomainError ? error.status : 503;
    return NextResponse.json({ error: { code: error instanceof DomainError ? error.code : "MFA_UNAVAILABLE", message: error instanceof DomainError ? error.message : "MFA enrollment is temporarily unavailable." } }, { status, headers: { "cache-control": "no-store" } });
  }
}
