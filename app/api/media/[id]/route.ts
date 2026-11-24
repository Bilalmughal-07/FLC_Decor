import { errorResponse } from "@/lib/backend-validation";
import { readMediaContent } from "@/lib/media-store";

export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const media = await readMediaContent((await context.params).id, new URL(request.url).searchParams.get("kind") === "thumbnail", { admin: false });
    return new Response(new Uint8Array(media.body), { headers: { "content-type": media.contentType ?? "image/webp", "cache-control": media.cacheControl ?? "public, max-age=86400", ...(media.etag ? { etag: `\"${media.etag}\"` } : {}), "x-content-type-options": "nosniff" } });
  } catch (error) { return errorResponse(error); }
}
