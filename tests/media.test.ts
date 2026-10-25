import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { validateAndReencodeImage } from "@/lib/media";

describe("media safety", () => {
  it("detects and re-encodes a valid image without trusting the filename/type", async () => {
    const input = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#b28a52" } }).jpeg().toBuffer();
    const result = await validateAndReencodeImage(input, "image/jpeg");
    expect(result.mime).toBe("image/webp");
    expect(result.width).toBe(4);
    expect(result.objectKey).toMatch(/^quarantine\//);
  });

  it("rejects fake extensions/content and oversized payloads", async () => {
    await expect(validateAndReencodeImage(Buffer.from("not-an-image"), "image/jpeg")).rejects.toThrow("IMAGE_TYPE_NOT_ALLOWED");
    await expect(validateAndReencodeImage(Buffer.alloc(10 * 1024 * 1024 + 1), "image/png")).rejects.toThrow("IMAGE_SIZE_NOT_ALLOWED");
  });
});
