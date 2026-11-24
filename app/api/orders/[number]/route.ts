import { NextResponse } from "next/server";
import { readGuestOrder } from "@/lib/guest-tracking";
export async function GET(request: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const result = await readGuestOrder(request, number);
  if (result.kind === "disabled") return NextResponse.json({ error: { code: "GUEST_TRACKING_NOT_CONFIGURED", message: result.message } }, { status: 503, headers: { "cache-control": "no-store" } });
  if (result.kind !== "ok") return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Order verification is required." } }, { status: 401, headers: { "cache-control": "no-store" } });
  return NextResponse.json({ order: result.order }, { headers: { "cache-control": "no-store" } });
}
