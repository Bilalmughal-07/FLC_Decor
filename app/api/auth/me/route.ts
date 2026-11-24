import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { currentPersistentAdminSession } from "@/lib/admin-auth";
import { getCustomerAuthRuntime } from "@/lib/supabase/config";
import { getSupabaseCustomer } from "@/lib/supabase/identity";

export async function GET(request: Request) {
  const admin = await currentPersistentAdminSession(request);
  if (admin) return NextResponse.json({ user: { id: admin.user.id, email: admin.user.email, role: "ADMIN" }, mfaVerified: admin.mfaVerified });
  if (getCustomerAuthRuntime() === "supabase") {
    const customer = await getSupabaseCustomer(request);
    if (!customer) return NextResponse.json({ user: null }, { status: 401, headers: { "cache-control": "private, no-store" } });
    return NextResponse.json({ user: { ...customer, role: "CUSTOMER" }, mfaVerified: false }, { headers: { "cache-control": "private, no-store" } });
  }
  const current = currentSession(request);
  if (!current) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: { id: current.user.id, email: current.user.email, role: current.user.role }, mfaVerified: current.mfaVerified, demoOnly: true });
}
