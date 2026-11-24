import { adminActor } from "@/lib/admin-api";
import { errorResponse, jsonBody } from "@/lib/backend-validation";
import { adjustInventory } from "@/lib/admin-store";

export async function POST(request: Request) { try { const actor = await adminActor(request, "inventory.adjust", true); return Response.json(await adjustInventory(await jsonBody(request), actor), { status: 201 }); } catch (error) { return errorResponse(error); } }
