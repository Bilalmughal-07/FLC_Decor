import { adminActor } from "@/lib/admin-api";
import { errorResponse } from "@/lib/backend-validation";
import { listAdminInventory } from "@/lib/admin-store";

export async function GET(request: Request) { try { await adminActor(request, "inventory.read"); return Response.json(await listAdminInventory(Number(new URL(request.url).searchParams.get("page") ?? "1"))); } catch (error) { return errorResponse(error); } }
