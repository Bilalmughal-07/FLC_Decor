import { adminActor } from "@/lib/admin-api";
import { errorResponse } from "@/lib/backend-validation";
import { listAdminOrders } from "@/lib/admin-store";

export async function GET(request: Request) { try { await adminActor(request, "orders.read"); return Response.json(await listAdminOrders(Number(new URL(request.url).searchParams.get("page") ?? "1"))); } catch (error) { return errorResponse(error); } }
