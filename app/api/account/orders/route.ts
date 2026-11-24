import { NextResponse } from "next/server";
import { accountActor } from "@/lib/account-api";
import { getPrisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/backend-validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const current = await accountActor(request);
    if (process.env.CHECKOUT_RUNTIME !== "database") return NextResponse.json({ orders: [], checkoutConfigured: false }, { headers: { "cache-control": "no-store" } });
    const profile = await getPrisma().customerProfile.findUnique({ where: { authUserId: current.id } });
    if (!profile) return NextResponse.json({ orders: [] }, { headers: { "cache-control": "no-store" } });
    const orders = await getPrisma().order.findMany({
      where: { customerProfileId: profile.id },
      orderBy: [{ placedAt: "desc" }, { id: "desc" }],
      select: { publicOrderNumber: true, status: true, fulfillmentStatus: true, paymentStatus: true, totalMinor: true, currency: true, placedAt: true },
    });
    return NextResponse.json({ orders }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
