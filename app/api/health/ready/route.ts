import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { getCustomerAuthRuntime, isSupabaseAuthConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

export async function GET() {
  const authReady = getCustomerAuthRuntime() !== "supabase" || isSupabaseAuthConfigured();
  if (!process.env.DATABASE_URL || !authReady) {
    return Response.json({ status: "not_ready" }, { status: 503, headers: { "cache-control": "no-store" } });
  }

  try {
    await getPrisma().$queryRaw(Prisma.sql`SELECT 1`);
    return Response.json({ status: "ready" }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ status: "not_ready" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
