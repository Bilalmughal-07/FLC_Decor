import sharp from "sharp";
import { createR2Storage, readR2Config, thumbnailObjectKey } from "../lib/r2-storage";
import { validateAndReencodeImage } from "../lib/media";

async function main() {
  if (process.env.RUN_R2_INTEGRATION !== "true" || process.env.R2_TEST_BUCKET_CONFIRMED !== "true") throw new Error("Set RUN_R2_INTEGRATION=true and R2_TEST_BUCKET_CONFIRMED=true for a designated disposable bucket.");
  const config = readR2Config();
  if (!config) throw new Error("Complete R2 configuration is required.");
  if (!/(test|dev|staging|sandbox|disposable)/i.test(config.bucket)) throw new Error("Refusing R2 verification because the bucket name is not clearly non-production.");
  const input = await sharp({ create: { width: 16, height: 16, channels: 3, background: "#b39b7d" } }).png().toBuffer();
  const media = await validateAndReencodeImage(input, "image/png");
  const storage = createR2Storage(config);
  try {
    await storage.put(media.objectKey, { body: media.buffer, contentType: media.mime, cacheControl: "private, no-store", metadata: { purpose: "disposable-verification" } });
    await storage.put(media.thumbnailObjectKey, { body: media.thumbnailBuffer, contentType: media.mime, cacheControl: "private, no-store", metadata: { purpose: "disposable-verification" } });
    const [head, downloaded] = await Promise.all([storage.head(media.objectKey), storage.get(media.objectKey)]);
    if (head.bytes !== media.bytes || !downloaded.body.equals(media.buffer)) throw new Error("R2 verification content mismatch.");
    process.stdout.write("R2 disposable upload, metadata, download, and exact-key cleanup verification passed.\n");
  } finally {
    await Promise.allSettled([storage.delete(media.objectKey), storage.delete(thumbnailObjectKey(media.objectKey))]);
  }
}

main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : "R2 verification failed."}\n`); process.exitCode = 1; });
