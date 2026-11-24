import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { attachProductMedia, attachVariantMedia, detachMedia, getCatalogProduct } from "@/lib/catalog-store";
import { approveMedia, createStagedMedia, readMediaContent, reconcileMedia, removeMedia } from "@/lib/media-store";
import { getPrisma } from "@/lib/prisma";
import { thumbnailObjectKey, type MediaStorage, type StoredObject } from "@/lib/r2-storage";

const enabled = process.env.RUN_POSTGRES_INTEGRATION === "true";
const suite = enabled ? describe : describe.skip;

class FakeStorage implements MediaStorage {
  objects = new Map<string, StoredObject>();
  failPutNumber = 0;
  puts = 0;
  async put(key: string, object: StoredObject) { this.puts += 1; if (this.failPutNumber === this.puts) throw new Error("synthetic upload failure"); this.objects.set(key, object); }
  async head(key: string) { const value = this.objects.get(key); if (!value) throw new Error("missing"); return { bytes: value.body.length, contentType: value.contentType, metadata: value.metadata }; }
  async get(key: string) { const value = this.objects.get(key); if (!value) throw new Error("missing"); return { body: value.body, contentType: value.contentType, cacheControl: value.cacheControl }; }
  async copy(sourceKey: string, destinationKey: string, options: { contentType: string; cacheControl: string }) { const value = this.objects.get(sourceKey); if (!value) throw new Error("missing"); this.objects.set(destinationKey, { ...value, contentType: options.contentType, cacheControl: options.cacheControl }); }
  async delete(key: string) { this.objects.delete(key); }
}

suite("R2 media lifecycle with PostgreSQL and fake object storage", () => {
  const prisma = getPrisma();
  const token = randomUUID().slice(0, 8);
  let productId = "", variantId = "", slug = "";
  beforeAll(async () => {
    const category = await prisma.category.create({ data: { name: `Media ${token}`, slug: `media-${token}` } });
    slug = `media-piece-${token}`;
    const product = await prisma.product.create({ data: { name: `Media Piece ${token}`, slug, description: "Synthetic media integration product", primaryCategoryId: category.id, status: "PUBLISHED", publishedAt: new Date() } });
    const variant = await prisma.variant.create({ data: { productId: product.id, sku: `MEDIA-${token}`, regularPriceMinor: 10000 } });
    productId = product.id; variantId = variant.id;
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("stages, approves, attaches, renders and safely purges shared media", async () => {
    const storage = new FakeStorage();
    const input = await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#b39b7d" } }).jpeg().toBuffer();
    const staged = await createStagedMedia({ buffer: input, declaredMime: "image/jpeg", actorId: "media-test-admin" }, storage);
    expect(staged.state).toBe("PENDING");
    expect(storage.objects.has(staged.objectKey)).toBe(true);
    expect(storage.objects.has(thumbnailObjectKey(staged.objectKey))).toBe(true);
    const approved = await approveMedia(staged.id, "media-test-admin", storage);
    expect(approved.state).toBe("APPROVED");
    expect(approved.objectKey.startsWith("public/")).toBe(true);
    await attachProductMedia(productId, { mediaId: approved.id, altText: "Synthetic approved product image", sortOrder: 0 }, "media-test-admin");
    await attachVariantMedia(variantId, { mediaId: approved.id, sortOrder: 0 }, "media-test-admin");
    const names = ["MEDIA_STORAGE_RUNTIME", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_ENDPOINT"] as const;
    const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
    Object.assign(process.env, { MEDIA_STORAGE_RUNTIME: "r2", R2_ACCOUNT_ID: "synthetic", R2_ACCESS_KEY_ID: "synthetic", R2_SECRET_ACCESS_KEY: "synthetic", R2_BUCKET_NAME: "synthetic", R2_ENDPOINT: "https://synthetic.r2.cloudflarestorage.com" });
    const product = await getCatalogProduct(slug);
    for (const name of names) { const value = previous[name]; if (value === undefined) delete process.env[name]; else process.env[name] = value; }
    expect(product?.images?.some((image) => image.id === approved.id && image.src === `/api/media/${approved.id}`)).toBe(true);
    expect((await readMediaContent(approved.id, false, { admin: false }, storage)).body.length).toBeGreaterThan(0);
    await expect(removeMedia(approved.id, "media-test-admin", storage)).rejects.toMatchObject({ code: "MEDIA_IN_USE" });
    await detachMedia("product", productId, approved.id, "media-test-admin");
    expect(await prisma.mediaAsset.findUnique({ where: { id: approved.id } })).toMatchObject({ state: "APPROVED" });
    await detachMedia("variant", variantId, approved.id, "media-test-admin");
    await removeMedia(approved.id, "media-test-admin", storage);
    expect(await prisma.mediaAsset.findUnique({ where: { id: approved.id } })).toMatchObject({ state: "PURGED" });
    expect(storage.objects.size).toBe(0);
  });

  it("records a recoverable orphan and removes partial objects when upload fails", async () => {
    const storage = new FakeStorage(); storage.failPutNumber = 2;
    const input = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#242424" } }).png().toBuffer();
    await expect(createStagedMedia({ buffer: input, declaredMime: "image/png", actorId: `failed-${token}` }, storage)).rejects.toMatchObject({ code: "MEDIA_UPLOAD_FAILED" });
    const row = await prisma.mediaAsset.findFirst({ where: { ownerAuthUserId: `failed-${token}` }, orderBy: { createdAt: "desc" } });
    expect(row).toMatchObject({ state: "ORPHANED", processingErrorCode: "R2_UPLOAD_FAILED" });
    expect(storage.objects.size).toBe(0);
  });

  it("preserves deterministic gallery ordering when a different image becomes main", async () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const first = await prisma.mediaAsset.create({ data: { objectKey: `public/${stamp}/${randomUUID()}/main.webp`, mime: "image/webp", width: 100, height: 100, bytes: 100, state: "APPROVED" } });
    const second = await prisma.mediaAsset.create({ data: { objectKey: `public/${stamp}/${randomUUID()}/main.webp`, mime: "image/webp", width: 100, height: 100, bytes: 100, state: "APPROVED" } });
    await attachProductMedia(productId, { mediaId: first.id, altText: "First", sortOrder: 0 }, "media-test-admin");
    await attachProductMedia(productId, { mediaId: second.id, altText: "Second", sortOrder: 1 }, "media-test-admin");
    await attachProductMedia(productId, { mediaId: second.id, altText: "Second", sortOrder: 0 }, "media-test-admin");
    const ordered = await prisma.productMedia.findMany({ where: { productId }, orderBy: [{ sortOrder: "asc" }, { mediaId: "asc" }] });
    expect(ordered.map((item) => [item.mediaId, item.sortOrder])).toEqual([[second.id, 0], [first.id, 1]]);
    await detachMedia("product", productId, first.id, "media-test-admin");
    await detachMedia("product", productId, second.id, "media-test-admin");
  });

  it("reconciles a stale database record whose staged objects are missing", async () => {
    const stamp = new Date(Date.now() - 2 * 60 * 60_000);
    const row = await prisma.mediaAsset.create({ data: { objectKey: `staging/${stamp.toISOString().slice(0, 10)}/${randomUUID()}/main.webp`, mime: "image/webp", width: 10, height: 10, bytes: 20, state: "PENDING", createdAt: stamp, ownerAuthUserId: `stale-${token}` } });
    const result = await reconcileMedia("media-test-admin", new FakeStorage());
    expect(result.staleOrphans).toBeGreaterThanOrEqual(1);
    expect(await prisma.mediaAsset.findUnique({ where: { id: row.id } })).toMatchObject({ state: "PURGED" });
  });
});
