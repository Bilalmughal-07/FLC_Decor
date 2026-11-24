import { NextResponse } from "next/server";
import { allowRequest } from "@/lib/auth";
import { adminActor } from "@/lib/admin-api";
import { errorResponse } from "@/lib/backend-validation";
import { MEDIA_LIMITS, MediaValidationError, validateAndReencodeImage } from "@/lib/media";
import { mediaStorageConfigured } from "@/lib/media-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!allowRequest(request, "media", 20)) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many media requests. Please wait and try again." } }, { status: 429 });
  try { await adminActor(request, "catalog.write", true); }
  catch (error) { return errorResponse(error); }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MEDIA_LIMITS.maxBytes + 1024 * 1024) return NextResponse.json({ error: { code: "IMAGE_SIZE_NOT_ALLOWED", message: "The upload is too large." } }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: { code: "IMAGE_REQUIRED", message: "Provide one image file." } }, { status: 400 });
  if (file.size > MEDIA_LIMITS.maxBytes) return NextResponse.json({ error: { code: "IMAGE_SIZE_NOT_ALLOWED", message: "The upload is too large." } }, { status: 413 });
  try {
    const result = await validateAndReencodeImage(Buffer.from(await file.arrayBuffer()), file.type);
    return NextResponse.json({ accepted: true, validationOnly: true, media: { objectKey: result.objectKey, mime: result.mime, width: result.width, height: result.height, bytes: result.bytes, detectedFormat: result.detectedFormat }, storage: mediaStorageConfigured() ? "CONFIGURED" : "NOT_CONFIGURED" });
  } catch (error) {
    const code = error instanceof MediaValidationError ? error.message : "IMAGE_REJECTED";
    return NextResponse.json({ error: { code, message: "The image did not pass the safe media checks." } }, { status: 422 });
  }
}
