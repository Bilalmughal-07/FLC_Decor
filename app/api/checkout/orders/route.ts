import { NextResponse } from "next/server";
import { createDemoOrder } from "@/lib/demo-store";

export async function POST(request: Request) {
  const key = request.headers.get("Idempotency-Key");
  if (!key || key.length < 12) return NextResponse.json({ error: { code: "IDEMPOTENCY_KEY_REQUIRED", message: "A retry-safe checkout key is required." } }, { status: 400 });
  const body = await request.json().catch(() => null) as { email?: string; phone?: string; address?: { name?: string; line1?: string; city?: string; notes?: string }; items?: Array<{ variantId: string; quantity: number }> } | null;
  if (!body?.email || !body.phone || !body.address?.name || !body.address.line1 || !body.address.city || !body.items) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Please complete the required contact and delivery fields." } }, { status: 400 });
  const result = await createDemoOrder({ idempotencyKey: key, email: body.email, phone: body.phone, address: { name: body.address.name, line1: body.address.line1, city: body.address.city, notes: body.address.notes }, items: body.items });
  if (result.kind === "conflict") return NextResponse.json({ error: { code: "IDEMPOTENCY_CONFLICT", message: "This retry key was already used for a different checkout." } }, { status: 409 });
  if (result.kind === "disabled") return NextResponse.json({ error: { code: "CHECKOUT_NOT_CONFIGURED", message: "Live checkout is disabled until shipping, tax and operational policies are configured." } }, { status: 503 });
  if (result.kind === "stock") return NextResponse.json({ error: { code: "INSUFFICIENT_STOCK", message: result.message } }, { status: 409 });
  if (result.kind === "invalid") return NextResponse.json({ error: { code: "INVALID_CART", message: result.message } }, { status: 400 });
  return NextResponse.json({ order: result.order, replayed: result.kind === "replay" }, { status: result.kind === "replay" ? 200 : 201 });
}
