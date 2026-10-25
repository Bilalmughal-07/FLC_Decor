import { NextResponse } from "next/server";
import { allowRequest, requireAdmin } from "@/lib/auth";
import { MediaValidationError, validateAndReencodeImage } from "@/lib/media";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!allowRequest(request, "media", 20)) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many media requests. Please wait and try again." } }, { status: 429 });
  if (!requireAdmin(request)) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Administrator MFA is required." } }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: { code: "IMAGE_REQUIRED", message: "Provide one image file." } }, { status: 400 });
  try {
    const result = await validateAndReencodeImage(Buffer.from(await file.arrayBuffer()), file.type);
    return NextResponse.json({ accepted: true, quarantine: true, media: { objectKey: result.objectKey, mime: result.mime, width: result.width, height: result.height, bytes: result.bytes, detectedFormat: result.detectedFormat }, storage: "NOT_CONFIGURED" });
  } catch (error) {
    const code = error instanceof MediaValidationError ? error.message : "IMAGE_REJECTED";
    return NextResponse.json({ error: { code, message: "The image did not pass the safe media checks." } }, { status: 422 });
  }
}
