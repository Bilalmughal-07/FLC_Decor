import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { DomainError, id } from "@/lib/backend-validation";
import { validateAndReencodeImage } from "@/lib/media";
import {
  createR2Storage,
  publicMediaUrl,
  publicObjectKey,
  readR2Config,
  stagingObjectKey,
  thumbnailObjectKey,
  type MediaStorage,
} from "@/lib/r2-storage";

const PUBLIC_CACHE = "public, max-age=31536000, immutable";
const PRIVATE_CACHE = "private, no-store";

export function mediaStorageConfigured() {
  return readR2Config() !== null;
}

function storageOrThrow(storage?: MediaStorage) {
  if (storage) return storage;
  try { return createR2Storage(); }
  catch { throw new DomainError("MEDIA_STORAGE_NOT_CONFIGURED", "R2 media storage is not configured.", 503); }
}

export async function createStagedMedia(input: { buffer: Buffer; declaredMime?: string; actorId: string }, storage?: MediaStorage) {
  const objectStore = storageOrThrow(storage);
  const processed = await validateAndReencodeImage(input.buffer, input.declaredMime);
  const prisma = getPrisma();
  const asset = await prisma.$transaction(async (tx) => {
    const row = await tx.mediaAsset.create({ data: { objectKey: processed.objectKey, mime: processed.mime, width: processed.width, height: processed.height, bytes: processed.bytes, state: "PENDING", checksumSha256: processed.checksumSha256, ownerAuthUserId: input.actorId } });
    await tx.auditEvent.create({ data: { actorType: "ADMIN", actorId: input.actorId, action: "MEDIA_UPLOAD_STAGED", targetType: "MEDIA_ASSET", targetId: row.id, safeMetadata: { mime: row.mime, width: row.width, height: row.height, bytes: row.bytes } } });
    return row;
  });
  try {
    await objectStore.put(processed.objectKey, { body: processed.buffer, contentType: processed.mime, cacheControl: PRIVATE_CACHE, metadata: { checksum: processed.checksumSha256, variant: "main" } });
    await objectStore.put(processed.thumbnailObjectKey, { body: processed.thumbnailBuffer, contentType: processed.mime, cacheControl: PRIVATE_CACHE, metadata: { checksum: processed.checksumSha256, variant: "thumbnail" } });
    return asset;
  } catch {
    await Promise.allSettled([objectStore.delete(processed.objectKey), objectStore.delete(processed.thumbnailObjectKey)]);
    await prisma.$transaction([
      prisma.mediaAsset.update({ where: { id: asset.id }, data: { state: "ORPHANED", orphanedAt: new Date(), purgeAfter: new Date(), processingErrorCode: "R2_UPLOAD_FAILED" } }),
      prisma.auditEvent.create({ data: { actorType: "ADMIN", actorId: input.actorId, action: "MEDIA_UPLOAD_FAILED", targetType: "MEDIA_ASSET", targetId: asset.id } }),
    ]).catch(() => undefined);
    throw new DomainError("MEDIA_UPLOAD_FAILED", "The image could not be stored. It is safe to retry.", 502);
  }
}

export async function listAdminMedia() {
  const rows = await getPrisma().mediaAsset.findMany({
    include: { products: { include: { product: { select: { id: true, name: true } } } }, variants: { include: { variant: { select: { id: true, sku: true, productId: true } } } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 200,
  });
  return rows.map((row) => {
    let publicUrl: string | null = null;
    if (row.state === "APPROVED") {
      try { publicUrl = publicMediaUrl(row.id, row.objectKey); }
      catch { publicUrl = null; }
    }
    return { ...row, previewUrl: `/api/admin/media/${row.id}/content?kind=thumbnail`, publicUrl };
  });
}

export async function approveMedia(mediaId: string, actorId: string, storage?: MediaStorage) {
  const assetId = id(mediaId);
  const objectStore = storageOrThrow(storage);
  const prisma = getPrisma();
  const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
  if (!asset) throw new DomainError("NOT_FOUND", "Media asset was not found.", 404);
  if (asset.state === "APPROVED") return asset;
  if (asset.state !== "PENDING") throw new DomainError("MEDIA_NOT_PENDING", "Only a staged image can be approved.", 409);
  const claimed = await prisma.mediaAsset.updateMany({ where: { id: assetId, state: "PENDING", processingErrorCode: null }, data: { processingErrorCode: "PROMOTION_IN_PROGRESS" } });
  if (claimed.count !== 1) {
    const current = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (current?.state === "APPROVED") return current;
    throw new DomainError("MEDIA_BUSY", "This image is already being processed. Retry shortly.", 409);
  }
  const sourceMain = asset.objectKey;
  const sourceThumb = thumbnailObjectKey(sourceMain);
  const targetMain = publicObjectKey(sourceMain);
  const targetThumb = thumbnailObjectKey(targetMain);
  try {
    const [mainHead, thumbHead] = await Promise.all([objectStore.head(sourceMain), objectStore.head(sourceThumb)]);
    if (mainHead.bytes !== asset.bytes || thumbHead.bytes < 1) throw new Error("R2_OBJECT_METADATA_MISMATCH");
    await objectStore.copy(sourceMain, targetMain, { contentType: asset.mime, cacheControl: PUBLIC_CACHE });
    await objectStore.copy(sourceThumb, targetThumb, { contentType: asset.mime, cacheControl: PUBLIC_CACHE });
  } catch {
    await Promise.allSettled([objectStore.delete(targetMain), objectStore.delete(targetThumb)]);
    await prisma.mediaAsset.updateMany({ where: { id: assetId, state: "PENDING", processingErrorCode: "PROMOTION_IN_PROGRESS" }, data: { processingErrorCode: null } });
    throw new DomainError("MEDIA_PROMOTION_FAILED", "The staged image could not be promoted. It is safe to retry.", 502);
  }
  try {
    const approved = await prisma.$transaction(async (tx) => {
      const changed = await tx.mediaAsset.updateMany({ where: { id: assetId, state: "PENDING", processingErrorCode: "PROMOTION_IN_PROGRESS" }, data: { state: "APPROVED", objectKey: targetMain, processingErrorCode: null, orphanedAt: null, purgeAfter: null } });
      if (changed.count !== 1) {
        const current = await tx.mediaAsset.findUnique({ where: { id: assetId } });
        if (current?.state === "APPROVED") return current;
        throw new DomainError("MEDIA_STATE_CONFLICT", "The media state changed while it was being approved.", 409);
      }
      await tx.auditEvent.create({ data: { actorType: "ADMIN", actorId, action: "MEDIA_APPROVED", targetType: "MEDIA_ASSET", targetId: assetId } });
      return tx.mediaAsset.findUniqueOrThrow({ where: { id: assetId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    const cleanup = await Promise.allSettled([objectStore.delete(sourceMain), objectStore.delete(sourceThumb)]);
    if (cleanup.some((result) => result.status === "rejected")) await prisma.mediaAsset.update({ where: { id: assetId }, data: { processingErrorCode: "STAGING_CLEANUP_PENDING" } });
    return approved;
  } catch (error) {
    const current = await prisma.mediaAsset.findUnique({ where: { id: assetId } }).catch(() => null);
    if (current?.state === "APPROVED") return current;
    await Promise.allSettled([objectStore.delete(targetMain), objectStore.delete(targetThumb)]);
    await prisma.mediaAsset.updateMany({ where: { id: assetId, state: "PENDING", processingErrorCode: "PROMOTION_IN_PROGRESS" }, data: { processingErrorCode: null } }).catch(() => undefined);
    throw error;
  }
}

async function purgeMediaObjects(objectKey: string, storage: MediaStorage) {
  await Promise.all([storage.delete(objectKey), storage.delete(thumbnailObjectKey(objectKey))]);
}

export async function removeMedia(mediaId: string, actorId: string, storage?: MediaStorage) {
  const assetId = id(mediaId);
  const objectStore = storageOrThrow(storage);
  const prisma = getPrisma();
  const asset = await prisma.$transaction(async (tx) => {
    const row = await tx.mediaAsset.findUnique({ where: { id: assetId }, include: { _count: { select: { products: true, variants: true } } } });
    if (!row) throw new DomainError("NOT_FOUND", "Media asset was not found.", 404);
    if (row._count.products || row._count.variants) throw new DomainError("MEDIA_IN_USE", "Detach this image from every product and variant before deleting it.", 409);
    if (row.state === "PURGED") return row;
    const updated = await tx.mediaAsset.update({ where: { id: assetId }, data: { state: "ORPHANED", orphanedAt: new Date(), purgeAfter: new Date(), processingErrorCode: "PURGE_PENDING" } });
    await tx.auditEvent.create({ data: { actorType: "ADMIN", actorId, action: "MEDIA_DELETE_REQUESTED", targetType: "MEDIA_ASSET", targetId: assetId } });
    return { ...updated, _count: row._count };
  });
  if (asset.state === "PURGED") return asset;
  try {
    await purgeMediaObjects(asset.objectKey, objectStore);
    return await prisma.$transaction(async (tx) => {
      const purged = await tx.mediaAsset.update({ where: { id: assetId }, data: { state: "PURGED", processingErrorCode: null, purgeAfter: null } });
      await tx.auditEvent.create({ data: { actorType: "ADMIN", actorId, action: "MEDIA_PURGED", targetType: "MEDIA_ASSET", targetId: assetId } });
      return purged;
    });
  } catch {
    await prisma.mediaAsset.update({ where: { id: assetId }, data: { processingErrorCode: "R2_PURGE_FAILED", purgeAfter: new Date(Date.now() + 15 * 60_000) } });
    throw new DomainError("MEDIA_PURGE_FAILED", "The media record is detached and cleanup will need to be retried.", 502);
  }
}

export async function reconcileMedia(actorId: string, storage?: MediaStorage) {
  const objectStore = storageOrThrow(storage);
  const prisma = getPrisma();
  const [orphans, approvedCleanup, stalledPromotions, stalePending] = await Promise.all([
    prisma.mediaAsset.findMany({ where: { state: "ORPHANED", products: { none: {} }, variants: { none: {} }, OR: [{ purgeAfter: null }, { purgeAfter: { lte: new Date() } }] }, take: 50 }),
    prisma.mediaAsset.findMany({ where: { state: "APPROVED", processingErrorCode: "STAGING_CLEANUP_PENDING" }, take: 50 }),
    prisma.mediaAsset.findMany({ where: { state: "PENDING", processingErrorCode: "PROMOTION_IN_PROGRESS", createdAt: { lt: new Date(Date.now() - 15 * 60_000) } }, take: 50 }),
    prisma.mediaAsset.findMany({ where: { state: "PENDING", processingErrorCode: null, createdAt: { lt: new Date(Date.now() - 60 * 60_000) } }, take: 50 }),
  ]);
  let purged = 0, stagingCleaned = 0, staleOrphans = 0, failed = 0;
  for (const asset of orphans) {
    try { await removeMedia(asset.id, actorId, objectStore); purged += 1; } catch { failed += 1; }
  }
  for (const asset of approvedCleanup) {
    try {
      const stagingMain = stagingObjectKey(asset.objectKey);
      await purgeMediaObjects(stagingMain, objectStore);
      await prisma.mediaAsset.update({ where: { id: asset.id }, data: { processingErrorCode: null } });
      stagingCleaned += 1;
    } catch { failed += 1; }
  }
  for (const asset of stalePending) {
    try {
      await Promise.all([objectStore.head(asset.objectKey), objectStore.head(thumbnailObjectKey(asset.objectKey))]);
    } catch {
      await prisma.mediaAsset.updateMany({ where: { id: asset.id, state: "PENDING", processingErrorCode: null }, data: { state: "ORPHANED", orphanedAt: new Date(), purgeAfter: new Date(), processingErrorCode: "STAGED_OBJECT_MISSING" } });
      try { await removeMedia(asset.id, actorId, objectStore); purged += 1; staleOrphans += 1; } catch { failed += 1; }
    }
  }
  if (stalledPromotions.length) await prisma.mediaAsset.updateMany({ where: { id: { in: stalledPromotions.map((asset) => asset.id) }, state: "PENDING", processingErrorCode: "PROMOTION_IN_PROGRESS" }, data: { processingErrorCode: null } });
  await prisma.auditEvent.create({ data: { actorType: "ADMIN", actorId, action: "MEDIA_RECONCILED", targetType: "MEDIA_ASSET", safeMetadata: { purged, stagingCleaned, staleOrphans, promotionsReset: stalledPromotions.length, failed } } });
  return { purged, stagingCleaned, staleOrphans, promotionsReset: stalledPromotions.length, failed };
}

export async function readMediaContent(mediaId: string, thumbnail: boolean, options: { admin: boolean }, storage?: MediaStorage) {
  const objectStore = storageOrThrow(storage);
  const asset = await getPrisma().mediaAsset.findUnique({ where: { id: id(mediaId) } });
  if (!asset || asset.state === "PURGED" || (!options.admin && asset.state !== "APPROVED")) throw new DomainError("NOT_FOUND", "Media was not found.", 404);
  const objectKey = thumbnail ? thumbnailObjectKey(asset.objectKey) : asset.objectKey;
  const object = await objectStore.get(objectKey);
  return { ...object, etag: thumbnail ? null : asset.checksumSha256, public: asset.state === "APPROVED" };
}
