import { adminActor } from "@/lib/admin-api";
import { salesAnalytics } from "@/lib/admin-store";
import { errorResponse } from "@/lib/backend-validation";

export async function GET(request: Request) {
  try {
    await adminActor(request, "analytics.read");
    const url = new URL(request.url);
    return Response.json(await salesAnalytics(url.searchParams.get("from"), url.searchParams.get("to")), { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
