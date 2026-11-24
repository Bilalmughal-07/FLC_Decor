import { NextResponse } from "next/server";
import { createDatabaseOrder } from "@/lib/database-store";
import { createDemoOrder } from "@/lib/demo-store";
import { allowRequest, checkSameOrigin, currentSession } from "@/lib/auth";
import { createOrderReceipt, receiptCookieName } from "@/lib/order-receipt";

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: { code: "INVALID_ORIGIN", message: "Invalid request origin." } }, { status: 403 });
  if (!allowRequest(request, "checkout", 20)) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many checkout attempts. Please wait and try again." } }, { status: 429 });
  const key = request.headers.get("Idempotency-Key");
  if (!key || key.length < 12) return NextResponse.json({ error: { code: "IDEMPOTENCY_KEY_REQUIRED", message: "A retry-safe checkout key is required." } }, { status: 400 });
  const body = await request.json().catch(() => null) as { email?: string; phone?: string; address?: { name?: string; line1?: string; city?: string; notes?: string }; items?: Array<{ variantId: string; quantity: number }> } | null;
  if (!body?.email || !body.phone || !body.address?.name || !body.address.line1 || !body.address.city || !body.items) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Please complete the required contact and delivery fields." } }, { status: 400 });
  const session = currentSession(request);
  if (session?.user.role === "CUSTOMER" && session.user.email !== body.email.trim().toLowerCase()) return NextResponse.json({ error: { code: "ACCOUNT_EMAIL_MISMATCH", message: "Use the signed-in account email for checkout." } }, { status: 400 });
  const input = { idempotencyKey: key, email: body.email, phone: body.phone, address: { name: body.address.name, line1: body.address.line1, city: body.address.city, notes: body.address.notes }, items: body.items, ...(session?.user.role === "CUSTOMER" ? { customerAuthUserId: session.user.id } : {}) };
  let result: Awaited<ReturnType<typeof createDatabaseOrder>> | Awaited<ReturnType<typeof createDemoOrder>>;
  try { result = process.env.CHECKOUT_RUNTIME === "database" ? await createDatabaseOrder(input) : await createDemoOrder(input); }
  catch { return NextResponse.json({ error: { code: "CHECKOUT_UNAVAILABLE", message: "Checkout is temporarily unavailable. Retry using the same checkout key." } }, { status: 503 }); }
  if (result.kind === "conflict") return NextResponse.json({ error: { code: "IDEMPOTENCY_CONFLICT", message: "This retry key was already used for a different checkout." } }, { status: 409 });
  if (result.kind === "disabled") return NextResponse.json({ error: { code: "CHECKOUT_NOT_CONFIGURED", message: result.message } }, { status: 503 });
  if (result.kind === "stock") return NextResponse.json({ error: { code: "INSUFFICIENT_STOCK", message: result.message } }, { status: 409 });
  if (result.kind === "invalid") return NextResponse.json({ error: { code: "INVALID_CART", message: result.message } }, { status: 400 });
  const response = NextResponse.json({ order: result.order, replayed: result.kind === "replay" }, { status: result.kind === "replay" ? 200 : 201 });
  const receipt = createOrderReceipt(result.order.id, result.order.publicOrderNumber);
  if (receipt) response.cookies.set(receiptCookieName, receipt, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/order/success", maxAge: 900 });
  return response;
}
