import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";

export function GET(request: Request) {
  const current = currentSession(request);
  if (!current) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: { id: current.user.id, email: current.user.email, role: current.user.role }, mfaVerified: current.mfaVerified, demoOnly: true });
}
