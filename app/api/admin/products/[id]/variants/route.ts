import { adminActor } from "@/lib/admin-api";
import { errorResponse, jsonBody } from "@/lib/backend-validation";
import { createVariant } from "@/lib/catalog-store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const actor = await adminActor(request, "catalog.write", true); return Response.json({ variant: await createVariant((await context.params).id, await jsonBody(request), actor) }, { status: 201 }); } catch (error) { return errorResponse(error); } }
