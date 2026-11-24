import { adminActor } from "@/lib/admin-api";
import { errorResponse, jsonBody, keys, object, string } from "@/lib/backend-validation";
import { approveMedia, removeMedia } from "@/lib/media-store";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actorId = await adminActor(request, "catalog.write", true);
    const body = object(await jsonBody(request));
    keys(body, ["action"]);
    if (string(body.action, "Action", 30) !== "approve") return Response.json({ error: { code: "VALIDATION_ERROR", message: "Unsupported media action." } }, { status: 400 });
    return Response.json({ media: await approveMedia((await context.params).id, actorId) });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actorId = await adminActor(request, "catalog.write", true);
    await removeMedia((await context.params).id, actorId);
    return new Response(null, { status: 204 });
  } catch (error) { return errorResponse(error); }
}
