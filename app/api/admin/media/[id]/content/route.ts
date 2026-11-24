import { adminActor } from "@/lib/admin-api";
import { errorResponse } from "@/lib/backend-validation";
import { readMediaContent } from "@/lib/media-store";

export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await adminActor(request, "catalog.read");
    const media = await readMediaContent((await context.params).id, new URL(request.url).searchParams.get("kind") === "thumbnail", { admin: true });
    return new Response(new Uint8Array(media.body), { headers: { "content-type": media.contentType ?? "image/webp", "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
  } catch (error) { return errorResponse(error); }
}
