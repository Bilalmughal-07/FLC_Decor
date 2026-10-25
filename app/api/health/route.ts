import { NextResponse } from "next/server";

export function GET() { return NextResponse.json({ ok: true, service: "fahad-laser-web", demo: true, timestamp: new Date().toISOString() }); }
