import { NextResponse } from "next/server";
import { isDemoCheckoutEnabled } from "@/lib/demo-store";

export function GET() { const demo = isDemoCheckoutEnabled(); return NextResponse.json({ ready: true, checkout: demo ? "demo-only" : "disabled", database: "not-connected-in-local-fallback", productionDurability: false }); }
