import { adminActor } from "@/lib/admin-api";
import { listAdminCustomers } from "@/lib/admin-store";
import { errorResponse } from "@/lib/backend-validation";

export async function GET(request: Request) {
  try {
    await adminActor(request, "customers.read");
    const url = new URL(request.url);
    return Response.json(await listAdminCustomers(Number(url.searchParams.get("page") ?? "1"), url.searchParams.get("q") ?? ""), { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
