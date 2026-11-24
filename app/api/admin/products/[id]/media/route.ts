import { adminActor } from "@/lib/admin-api";
import { errorResponse, jsonBody } from "@/lib/backend-validation";
import { attachProductMedia, detachMedia } from "@/lib/catalog-store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const actor = await adminActor(request, "catalog.write", true); return Response.json({ attachment: await attachProductMedia((await context.params).id, await jsonBody(request), actor) }, { status: 201 }); } catch (error) { return errorResponse(error); } }
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) { try { const actor = await adminActor(request, "catalog.write", true); await detachMedia("product", (await context.params).id, new URL(request.url).searchParams.get("mediaId") ?? "", actor); return new Response(null, { status: 204 }); } catch (error) { return errorResponse(error); } }
