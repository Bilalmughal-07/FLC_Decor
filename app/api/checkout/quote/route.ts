import { NextResponse } from "next/server";
import { quoteDatabaseItems } from "@/lib/database-store";
import { allowRequest } from "@/lib/auth";
import { formatPrice, getProduct, getVariant } from "@/lib/catalog";
import { isDemoCheckoutEnabled } from "@/lib/demo-store";

export async function POST(request: Request) {
  if (!allowRequest(request, "quote", 30)) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many quote requests. Please wait and try again." } }, { status: 429 });
  const body = await request.json().catch(() => null) as { items?: Array<{ variantId: string; quantity: number }> } | null;
  if (!body?.items?.length) return NextResponse.json({ error: { code: "EMPTY_CART", message: "Your cart is empty." } }, { status: 400 });
  if (process.env.CHECKOUT_RUNTIME === "database") {
    try {
      const result = await quoteDatabaseItems(body.items);
      if (result.kind === "disabled") return NextResponse.json({ error: { code: "CHECKOUT_NOT_CONFIGURED", message: result.message } }, { status: 503 });
      if (result.kind === "invalid") return NextResponse.json({ error: { code: "INVALID_CART", message: result.message } }, { status: 409 });
      return NextResponse.json(result.quote);
    } catch (error) {
      if (error instanceof Error && error.message === "STOCK") return NextResponse.json({ error: { code: "INSUFFICIENT_STOCK", message: "A selected variant is no longer available in that quantity." } }, { status: 409 });
      return NextResponse.json({ error: { code: "CHECKOUT_UNAVAILABLE", message: "The persistent quote service is temporarily unavailable." } }, { status: 503 });
    }
  }
  const requested = new Map<string, number>();
  for (const item of body.items) requested.set(item.variantId, (requested.get(item.variantId) ?? 0) + item.quantity);
  let subtotal = 0;
  const items = [];
  for (const [variantId, quantity] of requested) {
    const item = { variantId, quantity };
    const variant = getVariant(item.variantId); const product = ["sunline-arch", "noor-petal-grid", "mehrab-line", "orbit-table-mark", "lattice-quiet", "nesting-leaves"].map(getProduct).find((candidate) => candidate?.variants.some((candidateVariant) => candidateVariant.id === item.variantId));
    if (!variant || !product || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > variant.stock) return NextResponse.json({ error: { code: "INVALID_CART", message: "A selected variant is no longer available." } }, { status: 409 });
    const lineTotal = (variant.salePrice ?? variant.regularPrice) * item.quantity; subtotal += lineTotal; items.push({ variantId: item.variantId, name: product.name, label: `${variant.size} · ${variant.color}`, quantity: item.quantity, unitPrice: variant.salePrice ?? variant.regularPrice, lineTotal });
  }
  return NextResponse.json({ demoOnly: true, checkoutAvailable: isDemoCheckoutEnabled(), shippingConfigured: false, taxConfigured: false, subtotal, subtotalDisplay: formatPrice(subtotal), total: null, items, message: "Shipping and tax are not configured; this is a synthetic demo quote." });
}
