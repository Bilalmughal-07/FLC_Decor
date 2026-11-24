import { GET as readiness } from "@/app/api/health/ready/route";

// Backward-compatible alias for deployments that already monitor /api/ready.
// The canonical readiness implementation performs a read-only dependency check.
export const runtime = "nodejs";
export async function GET() { return readiness(); }
