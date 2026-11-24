import { adminActor } from "@/lib/admin-api";
import { errorResponse, jsonBody } from "@/lib/backend-validation";
import { updateVariant } from "@/lib/catalog-store";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { const actor = await adminActor(request, "catalog.write", true); return Response.json({ variant: await updateVariant((await context.params).id, await jsonBody(request), actor) }); } catch (error) { return errorResponse(error); } }
