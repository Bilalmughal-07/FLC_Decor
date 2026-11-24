import { adminActor } from "@/lib/admin-api";
import { errorResponse } from "@/lib/backend-validation";
import { reconcileMedia } from "@/lib/media-store";

export async function POST(request: Request) {
  try {
    const actorId = await adminActor(request, "catalog.write", true);
    return Response.json(await reconcileMedia(actorId));
  } catch (error) { return errorResponse(error); }
}
