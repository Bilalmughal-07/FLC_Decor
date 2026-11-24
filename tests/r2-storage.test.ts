import { describe, expect, it } from "vitest";
import { createMediaObjectKeys, publicMediaUrl, publicObjectKey, readR2Config, stagingObjectKey, thumbnailObjectKey } from "@/lib/r2-storage";

describe("R2 media storage boundary", () => {
  it("requires an explicitly enabled, complete HTTPS configuration", () => {
    expect(readR2Config({ MEDIA_STORAGE_RUNTIME: "disabled" })).toBeNull();
    expect(readR2Config({ MEDIA_STORAGE_RUNTIME: "r2", R2_ACCOUNT_ID: "a" })).toBeNull();
    expect(readR2Config({ MEDIA_STORAGE_RUNTIME: "r2", R2_ACCOUNT_ID: "a", R2_ACCESS_KEY_ID: "k", R2_SECRET_ACCESS_KEY: "s", R2_BUCKET_NAME: "b", R2_ENDPOINT: "http://example.test" })).toBeNull();
    expect(readR2Config({ MEDIA_STORAGE_RUNTIME: "r2", R2_ACCOUNT_ID: "a", R2_ACCESS_KEY_ID: "k", R2_SECRET_ACCESS_KEY: "s", R2_BUCKET_NAME: "b", R2_ENDPOINT: "https://a.r2.cloudflarestorage.com" })).toMatchObject({ bucket: "b", publicBaseUrl: null });
  });

  it("creates safe paired keys and only promotes staging keys", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const keys = createMediaObjectKeys(new Date("2026-10-27T00:00:00Z"), id);
    expect(keys.main).toBe(`staging/2026-10-27/${id}/main.webp`);
    expect(thumbnailObjectKey(keys.main)).toBe(keys.thumbnail);
    const published = publicObjectKey(keys.main);
    expect(published).toBe(`public/2026-10-27/${id}/main.webp`);
    expect(stagingObjectKey(published)).toBe(keys.main);
    expect(() => publicObjectKey("../../secret")).toThrow("UNSAFE_MEDIA_OBJECT_KEY");
  });

  it("uses the state-checked application route unless a scoped public URL is configured", () => {
    const key = "public/2026-10-27/11111111-1111-4111-8111-111111111111/main.webp";
    expect(publicMediaUrl("media-id", key, false, { MEDIA_STORAGE_RUNTIME: "disabled" })).toBe("/api/media/media-id");
    expect(publicMediaUrl("media-id", key, true, { MEDIA_STORAGE_RUNTIME: "disabled" })).toBe("/api/media/media-id?kind=thumbnail");
  });
});
