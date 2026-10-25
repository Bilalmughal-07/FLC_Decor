import sharp from "sharp";
import { randomBytes } from "node:crypto";

export const MEDIA_LIMITS = { maxBytes: 10 * 1024 * 1024, maxPixels: 40_000_000, maxDimension: 8_000 } as const;
export class MediaValidationError extends Error { constructor(message: string) { super(message); this.name = "MediaValidationError"; } }
function sniff(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}
export async function validateAndReencodeImage(buffer: Buffer, declaredMime?: string) {
  if (!buffer.length || buffer.length > MEDIA_LIMITS.maxBytes) throw new MediaValidationError("IMAGE_SIZE_NOT_ALLOWED");
  const detected = sniff(buffer);
  if (!detected || (declaredMime && !["image/jpeg", "image/png", "image/webp"].includes(declaredMime))) throw new MediaValidationError("IMAGE_TYPE_NOT_ALLOWED");
  try {
    const image = sharp(buffer, { limitInputPixels: MEDIA_LIMITS.maxPixels, failOn: "error" });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || metadata.width > MEDIA_LIMITS.maxDimension || metadata.height > MEDIA_LIMITS.maxDimension || metadata.width * metadata.height > MEDIA_LIMITS.maxPixels) throw new MediaValidationError("IMAGE_DIMENSIONS_NOT_ALLOWED");
    const encoded = await image.rotate().webp({ quality: 86 }).toBuffer();
    return { buffer: encoded, mime: "image/webp" as const, width: metadata.width, height: metadata.height, bytes: encoded.length, detectedFormat: detected, objectKey: `quarantine/${new Date().toISOString().slice(0, 10)}/${randomBytes(18).toString("hex")}.webp` };
  } catch (error) {
    if (error instanceof MediaValidationError) throw error;
    throw new MediaValidationError("IMAGE_DECODE_FAILED");
  }
}
