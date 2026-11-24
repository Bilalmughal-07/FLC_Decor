import { adminActor } from "@/lib/admin-api";
import { DomainError, errorResponse } from "@/lib/backend-validation";
import { MEDIA_LIMITS, MediaValidationError } from "@/lib/media";
import { createStagedMedia, listAdminMedia, mediaStorageConfigured } from "@/lib/media-store";
import { allowRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await adminActor(request, "catalog.read");
    return Response.json({ media: await listAdminMedia(), storageConfigured: mediaStorageConfigured() }, { headers: { "cache-control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const actorId = await adminActor(request, "catalog.write", true);
    if (!allowRequest(request, "media-upload", 20)) throw new DomainError("RATE_LIMITED", "Too many media uploads. Please wait and retry.", 429);
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > MEDIA_LIMITS.maxBytes + 1024 * 1024) throw new DomainError("IMAGE_SIZE_NOT_ALLOWED", "The upload is too large.", 413);
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) throw new DomainError("IMAGE_REQUIRED", "Provide one image file.", 400);
    if (file.size > MEDIA_LIMITS.maxBytes) throw new DomainError("IMAGE_SIZE_NOT_ALLOWED", "The upload is too large.", 413);
    const asset = await createStagedMedia({ buffer: Buffer.from(await file.arrayBuffer()), declaredMime: file.type, actorId });
    return Response.json({ media: { ...asset, previewUrl: `/api/admin/media/${asset.id}/content?kind=thumbnail` } }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof MediaValidationError) return Response.json({ error: { code: error.message, message: "The image did not pass the safe media checks." } }, { status: 422 });
    return errorResponse(error);
  }
}
