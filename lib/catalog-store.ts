import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { DomainError, boolean, id, integer, keys, object, optionalString, slug, string } from "@/lib/backend-validation";
import type { Product as StorefrontProduct } from "@/lib/catalog";
import { publicMediaUrl, readR2Config } from "@/lib/r2-storage";

const productInclude = { primaryCategory: true, placements: { include: { category: true } }, variants: { include: { balances: true, media: { include: { media: true } } } }, media: { include: { media: true } } } satisfies Prisma.ProductInclude;
type FullProduct = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

export async function listCatalog(params: URLSearchParams) {
  const page = Number(params.get("page") ?? "1");
  const limit = Number(params.get("limit") ?? "24");
  if (!Number.isInteger(page) || page < 1 || page > 100000 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new DomainError("VALIDATION_ERROR", "Invalid pagination.");
  const q = (params.get("q") ?? "").trim().toLowerCase();
  if (q.length > 120) throw new DomainError("VALIDATION_ERROR", "Search is too long.");
  const category = params.get("category") ?? "all", color = params.get("color") ?? "all", size = params.get("size") ?? "all", stock = params.get("stock") ?? "all", price = params.get("price") ?? "all", sort = params.get("sort") ?? "featured";
  if (!["all", "in", "out"].includes(stock) || !["all", "under500", "500to800", "over800"].includes(price) || !["featured", "newest", "price-low", "price-high", "alphabetical"].includes(sort)) throw new DomainError("VALIDATION_ERROR", "Invalid catalog filter.");
  if ([category, color, size].some((value) => value.length > 100)) throw new DomainError("VALIDATION_ERROR", "Invalid catalog filter.");
  const prisma = getPrisma();
  const productFilters: Prisma.Sql[] = [Prisma.sql`p."status" = 'PUBLISHED'`];
  if (q) productFilters.push(Prisma.sql`p."name" ILIKE ${`%${q}%`}`);
  if (category !== "all") productFilters.push(Prisma.sql`(EXISTS (SELECT 1 FROM "Category" pc WHERE pc."id" = p."primaryCategoryId" AND pc."slug" = ${category}) OR EXISTS (SELECT 1 FROM "ProductCategory" placement JOIN "Category" c ON c."id" = placement."categoryId" WHERE placement."productId" = p."id" AND c."slug" = ${category}))`);
  const variantFilters: Prisma.Sql[] = [Prisma.sql`v."productId" = p."id"`, Prisma.sql`v."active" = true`];
  if (color !== "all") variantFilters.push(Prisma.sql`v."colorLabel" = ${color}`);
  if (size !== "all") variantFilters.push(Prisma.sql`v."sizeLabel" = ${size}`);
  if (price === "under500") variantFilters.push(Prisma.sql`COALESCE(v."salePriceMinor", v."regularPriceMinor") < 500000`);
  if (price === "500to800") variantFilters.push(Prisma.sql`COALESCE(v."salePriceMinor", v."regularPriceMinor") BETWEEN 500000 AND 800000`);
  if (price === "over800") variantFilters.push(Prisma.sql`COALESCE(v."salePriceMinor", v."regularPriceMinor") > 800000`);
  if (stock === "in") variantFilters.push(Prisma.sql`COALESCE((SELECT SUM(b."onHand" - b."reserved") FROM "InventoryBalance" b WHERE b."variantId" = v."id"), 0) > 0`);
  if (stock === "out") variantFilters.push(Prisma.sql`COALESCE((SELECT SUM(b."onHand" - b."reserved") FROM "InventoryBalance" b WHERE b."variantId" = v."id"), 0) = 0`);
  productFilters.push(Prisma.sql`EXISTS (SELECT 1 FROM "Variant" v WHERE ${Prisma.join(variantFilters, " AND ")})`);
  const orderBy = sort === "alphabetical" ? Prisma.sql`p."name" ASC, p."id" ASC`
    : sort === "newest" ? Prisma.sql`p."createdAt" DESC, p."id" ASC`
    : sort === "price-low" ? Prisma.sql`(SELECT MIN(COALESCE(v."salePriceMinor", v."regularPriceMinor")) FROM "Variant" v WHERE v."productId" = p."id" AND v."active" = true) ASC, p."id" ASC`
    : sort === "price-high" ? Prisma.sql`(SELECT MIN(COALESCE(v."salePriceMinor", v."regularPriceMinor")) FROM "Variant" v WHERE v."productId" = p."id" AND v."active" = true) DESC, p."id" ASC`
    : Prisma.sql`p."featured" DESC, p."featuredRank" ASC NULLS LAST, p."createdAt" DESC, p."id" ASC`;
  const [matches, categories, colorRows, sizeRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; total: bigint }>>(Prisma.sql`SELECT p."id", COUNT(*) OVER()::bigint AS "total" FROM "Product" p WHERE ${Prisma.join(productFilters, " AND ")} ORDER BY ${orderBy} OFFSET ${(page - 1) * limit} LIMIT ${limit}`),
    prisma.category.findMany({ where: { status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.variant.findMany({ where: { active: true, colorLabel: { not: null }, product: { status: "PUBLISHED" } }, distinct: ["colorLabel"], select: { colorLabel: true }, orderBy: { colorLabel: "asc" } }),
    prisma.variant.findMany({ where: { active: true, sizeLabel: { not: null }, product: { status: "PUBLISHED" } }, distinct: ["sizeLabel"], select: { sizeLabel: true }, orderBy: { sizeLabel: "asc" } }),
  ]);
  const fetched = matches.length ? await prisma.product.findMany({ where: { id: { in: matches.map((row) => row.id) } }, include: productInclude }) : [];
  const byId = new Map(fetched.map((row) => [row.id, row]));
  const rows = matches.map((row) => byId.get(row.id)).filter((row): row is FullProduct => Boolean(row));
  return { categories: categories.map((row) => ({ id: row.id, parentId: row.parentId, name: row.name, slug: row.slug, sortOrder: row.sortOrder })), facets: { colors: colorRows.map((row) => row.colorLabel!).filter(Boolean), sizes: sizeRows.map((row) => row.sizeLabel!).filter(Boolean) }, products: rows.map(toStorefrontProduct), total: Number(matches[0]?.total ?? 0), page, limit, sampleData: false };
}

function toStorefrontProduct(row: FullProduct): StorefrontProduct {
  const publicUrl = (mediaId: string, objectKey: string) => { if (!readR2Config()) return null; try { return publicMediaUrl(mediaId, objectKey); } catch { return null; } };
  const thumbnailUrl = (mediaId: string, objectKey: string) => { if (!readR2Config()) return undefined; try { return publicMediaUrl(mediaId, objectKey, true); } catch { return undefined; } };
  const images = [
    ...row.media.filter((entry) => entry.media.state === "APPROVED").sort((a, b) => a.sortOrder - b.sortOrder).map((entry) => ({ id: entry.mediaId, src: publicUrl(entry.mediaId, entry.media.objectKey), thumbnailSrc: thumbnailUrl(entry.mediaId, entry.media.objectKey), alt: entry.altText, width: entry.media.width, height: entry.media.height })),
    ...row.variants.flatMap((variant) => variant.media.filter((entry) => entry.media.state === "APPROVED").sort((a, b) => a.sortOrder - b.sortOrder).map((entry) => ({ id: entry.mediaId, src: publicUrl(entry.mediaId, entry.media.objectKey), thumbnailSrc: thumbnailUrl(entry.mediaId, entry.media.objectKey), alt: `${row.name} in ${variant.colorLabel ?? "original finish"}`, variantId: variant.id, width: entry.media.width, height: entry.media.height }))),
  ].filter((entry): entry is typeof entry & { src: string } => entry.src !== null);
  return { id: row.id, slug: row.slug, name: row.name, description: row.description, category: row.primaryCategory.name, categorySlug: row.primaryCategory.slug, materialNote: "", featured: row.featured, createdAt: row.createdAt.toISOString(), art: "arch", images, variants: row.variants.filter((variant) => variant.active).map((variant) => ({ id: variant.id, sku: variant.sku, size: variant.sizeLabel ?? "Standard", color: variant.colorLabel ?? "Original", regularPrice: variant.regularPriceMinor, ...(variant.salePriceMinor == null ? {} : { salePrice: variant.salePriceMinor }), stock: variant.balances.reduce((sum, balance) => sum + Math.max(0, balance.onHand - balance.reserved), 0) })) };
}

export async function getCatalogProduct(productSlug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productSlug) || productSlug.length > 100) return null;
  const row = await getPrisma().product.findFirst({ where: { slug: productSlug, status: "PUBLISHED" }, include: productInclude });
  return row && row.variants.some((variant) => variant.active) ? toStorefrontProduct(row) : null;
}

export async function resolveCatalogVariants(rawIds: unknown) {
  if (!Array.isArray(rawIds) || rawIds.length > 30 || rawIds.some((value) => typeof value !== "string" || value.length > 60)) throw new DomainError("VALIDATION_ERROR", "Invalid variant selection.");
  const ids = [...new Set(rawIds as string[])];
  const rows = await getPrisma().product.findMany({ where: { status: "PUBLISHED", variants: { some: { id: { in: ids }, active: true } } }, include: productInclude });
  return rows.map(toStorefrontProduct);
}

export async function listAdminProducts() { return getPrisma().product.findMany({ include: productInclude, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 100 }); }
export async function getAdminProduct(productId: string) { return getPrisma().product.findUnique({ where: { id: id(productId) }, include: productInclude }); }

export async function createCategory(input: unknown, actorId: string) {
  const data = object(input); keys(data, ["name", "slug", "parentId", "sortOrder"]);
  const parentId = data.parentId == null ? null : id(data.parentId);
  return getPrisma().$transaction(async (tx) => {
    if (parentId) { const parent = await tx.category.findUnique({ where: { id: parentId } }); if (!parent || parent.parentId) throw new DomainError("INVALID_PARENT", "A category can have only one parent level.", 409); }
    const category = await tx.category.create({ data: { name: string(data.name, "Name", 120), slug: slug(data.slug), parentId, sortOrder: data.sortOrder == null ? 0 : integer(data.sortOrder, "Sort order", -100000, 100000) } });
    await tx.auditEvent.create({ data: { actorType: "ADMIN", actorId, action: "CATEGORY_CREATED", targetType: "CATEGORY", targetId: category.id } });
    return category;
  });
}

export async function updateCategory(categoryId: string, input: unknown, actorId: string) {
  const data = object(input); keys(data, ["name", "slug", "parentId", "sortOrder", "status"]);
  const targetId = id(categoryId);
  return getPrisma().$transaction(async (tx) => {
    const current = await tx.category.findUnique({ where: { id: targetId }, include: { children: true } });
    if (!current) throw new DomainError("NOT_FOUND", "Category was not found.", 404);
    const parentId = data.parentId === undefined ? current.parentId : data.parentId == null ? null : id(data.parentId);
    if (parentId === targetId) throw new DomainError("INVALID_PARENT", "A category cannot be its own parent.", 409);
    if (parentId) {
      const parent = await tx.category.findUnique({ where: { id: parentId } });
      if (!parent || parent.parentId || current.children.length) throw new DomainError("INVALID_PARENT", "A category can have only one parent level.", 409);
    }
    const status = data.status === undefined ? current.status : string(data.status, "Status", 20);
    if (!["ACTIVE", "INACTIVE"].includes(status)) throw new DomainError("VALIDATION_ERROR", "Invalid category status.");
    const category = await tx.category.update({ where: { id: targetId }, data: { parentId, status, ...(data.name === undefined ? {} : { name: string(data.name, "Name", 120) }), ...(data.slug === undefined ? {} : { slug: slug(data.slug) }), ...(data.sortOrder === undefined ? {} : { sortOrder: integer(data.sortOrder, "Sort order", -100000, 100000) }) } });
    await tx.auditEvent.create({ data: { actorType: "ADMIN", actorId, action: "CATEGORY_UPDATED", targetType: "CATEGORY", targetId } });
    return category;
  });
}

export async function createProduct(input: unknown, actorId: string) {
  const data = object(input); keys(data, ["name", "slug", "description", "primaryCategoryId", "categoryIds"]);
  const primaryCategoryId = id(data.primaryCategoryId);
  const categoryIds = data.categoryIds == null ? [] : Array.isArray(data.categoryIds) ? [...new Set(data.categoryIds.map(id))] : (() => { throw new DomainError("VALIDATION_ERROR", "categoryIds must be an array."); })();
  return getPrisma().$transaction(async (tx) => {
    const found = await tx.category.findMany({ where: { id: { in: [primaryCategoryId, ...categoryIds] }, status: "ACTIVE" } });
    if (found.length !== new Set([primaryCategoryId, ...categoryIds]).size) throw new DomainError("INVALID_CATEGORY", "An active category is required.", 409);
    const product = await tx.product.create({ data: { name: string(data.name, "Name", 180), slug: slug(data.slug), description: string(data.description, "Description", 10000), primaryCategoryId, placements: { create: categoryIds.filter((categoryId) => categoryId !== primaryCategoryId).map((categoryId) => ({ categoryId })) } } });
    await tx.auditEvent.create({ data: { actorType: "ADMIN", actorId, action: "PRODUCT_CREATED", targetType: "PRODUCT", targetId: product.id } });
    return product;
  });
}

export async function updateProduct(productId: string, input: unknown, actorId: string) {
  const data = object(input); keys(data, ["name", "slug", "description", "primaryCategoryId", "categoryIds", "status", "featured", "featuredRank"]);
  const status = data.status == null ? undefined : string(data.status, "Status");
  if (status && !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) throw new DomainError("VALIDATION_ERROR", "Invalid product status.");
  const categoryIds = data.categoryIds == null ? undefined : Array.isArray(data.categoryIds) ? [...new Set(data.categoryIds.map(id))] : (() => { throw new DomainError("VALIDATION_ERROR", "categoryIds must be an array."); })();
  return getPrisma().$transaction(async (tx) => {
    const existing = await tx.product.findUnique({ where: { id: id(productId) }, include: { variants: true } });
    if (!existing) throw new DomainError("NOT_FOUND", "Product was not found.", 404);
    const primaryCategoryId = data.primaryCategoryId == null ? existing.primaryCategoryId : id(data.primaryCategoryId);
    const requestedCategories = [...new Set([primaryCategoryId, ...(categoryIds ?? [])])];
    if (await tx.category.count({ where: { id: { in: requestedCategories }, status: "ACTIVE" } }) !== requestedCategories.length) throw new DomainError("INVALID_CATEGORY", "An active category is required.", 409);
    if (status === "PUBLISHED" && !existing.variants.some((variant) => variant.active && variant.regularPriceMinor > 0)) throw new DomainError("CANNOT_PUBLISH", "An active priced variant is required.", 409);
    if (categoryIds) { await tx.productCategory.deleteMany({ where: { productId } }); await tx.productCategory.createMany({ data: categoryIds.filter((categoryId) => categoryId !== primaryCategoryId).map((categoryId) => ({ productId, categoryId })) }); }
    const product = await tx.product.update({ where: { id: productId }, data: { ...(data.name == null ? {} : { name: string(data.name, "Name", 180) }), ...(data.slug == null ? {} : { slug: slug(data.slug) }), ...(data.description == null ? {} : { description: string(data.description, "Description", 10000) }), primaryCategoryId, ...(status ? { status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED", publishedAt: status === "PUBLISHED" ? existing.publishedAt ?? new Date() : existing.publishedAt } : {}), ...(data.featured == null ? {} : { featured: boolean(data.featured, "Featured") }), ...(data.featuredRank === undefined ? {} : { featuredRank: data.featuredRank == null ? null : integer(data.featuredRank, "Featured rank", 0, 100000) }) } });
    await tx.auditEvent.create({ data: { actorType: "ADMIN", actorId, action: "PRODUCT_UPDATED", targetType: "PRODUCT", targetId: product.id, safeMetadata: { status: product.status, featured: product.featured } } });
    return product;
  });
}

export async function createVariant(productId: string, input: unknown, actorId: string) {
  const data = object(input); keys(data, ["sku", "sizeLabel", "colorLabel", "regularPriceMinor", "salePriceMinor"]);
  const regularPriceMinor = integer(data.regularPriceMinor, "Regular price", 1);
  const salePriceMinor = data.salePriceMinor == null ? null : integer(data.salePriceMinor, "Sale price", 1);
  if (salePriceMinor != null && salePriceMinor > regularPriceMinor) throw new DomainError("INVALID_PRICE", "Sale price cannot exceed regular price.");
  return getPrisma().$transaction(async (tx) => {
    if (!await tx.product.findUnique({ where: { id: id(productId) } })) throw new DomainError("NOT_FOUND", "Product was not found.", 404);
    const variant = await tx.variant.create({ data: { productId, sku: string(data.sku, "SKU", 80), sizeLabel: optionalString(data.sizeLabel, "Size", 80), colorLabel: optionalString(data.colorLabel, "Color", 80), regularPriceMinor, salePriceMinor, availableQty: 0 } });
    await tx.auditEvent.create({ data: { actorType: "ADMIN", actorId, action: "VARIANT_CREATED", targetType: "VARIANT", targetId: variant.id } });
    return variant;
  });
}

export async function updateVariant(variantId: string, input: unknown, actorId: string) {
  const data = object(input); keys(data, ["sku", "sizeLabel", "colorLabel", "regularPriceMinor", "salePriceMinor", "active"]);
  return getPrisma().$transaction(async (tx) => {
    const old = await tx.variant.findUnique({ where: { id: id(variantId) } });
    if (!old) throw new DomainError("NOT_FOUND", "Variant was not found.", 404);
    const regularPriceMinor = data.regularPriceMinor == null ? old.regularPriceMinor : integer(data.regularPriceMinor, "Regular price", 1);
    const salePriceMinor = data.salePriceMinor === undefined ? old.salePriceMinor : data.salePriceMinor == null ? null : integer(data.salePriceMinor, "Sale price", 1);
    if (salePriceMinor != null && salePriceMinor > regularPriceMinor) throw new DomainError("INVALID_PRICE", "Sale price cannot exceed regular price.");
    const variant = await tx.variant.update({ where: { id: variantId }, data: { ...(data.sku == null ? {} : { sku: string(data.sku, "SKU", 80) }), ...(data.sizeLabel === undefined ? {} : { sizeLabel: optionalString(data.sizeLabel, "Size", 80) }), ...(data.colorLabel === undefined ? {} : { colorLabel: optionalString(data.colorLabel, "Color", 80) }), regularPriceMinor, salePriceMinor, ...(data.active === undefined ? {} : { active: boolean(data.active, "Active") }) } });
    if (old.regularPriceMinor !== regularPriceMinor || old.salePriceMinor !== salePriceMinor) await tx.productPriceHistory.create({ data: { variantId, previousPriceMinor: old.salePriceMinor ?? old.regularPriceMinor, newPriceMinor: salePriceMinor ?? regularPriceMinor, actorAuthUserId: actorId, reason: "Admin variant price update" } });
    await tx.auditEvent.create({ data: { actorType: "ADMIN", actorId, action: "VARIANT_UPDATED", targetType: "VARIANT", targetId: variant.id, safeMetadata: { priceChanged: old.regularPriceMinor !== regularPriceMinor || old.salePriceMinor !== salePriceMinor } } });
    return variant;
  });
}

export async function attachProductMedia(productId: string, input: unknown, actorId: string) {
  const data = object(input); keys(data, ["mediaId", "altText", "sortOrder"]);
  const mediaId = id(data.mediaId), targetId = id(productId);
  return getPrisma().$transaction(async (tx) => {
    const [product, media] = await Promise.all([tx.product.findUnique({ where: { id: targetId } }), tx.mediaAsset.findUnique({ where: { id: mediaId } })]);
    if (!product) throw new DomainError("NOT_FOUND", "Product was not found.", 404);
    if (media?.state !== "APPROVED") throw new DomainError("MEDIA_NOT_APPROVED", "Only approved media can be attached.", 409);
    const sortOrder = data.sortOrder == null ? 0 : integer(data.sortOrder, "Sort order", 0, 100000);
    const existing = await tx.productMedia.findUnique({ where: { productId_mediaId: { productId: targetId, mediaId } } });
    if (!existing || existing.sortOrder !== sortOrder) await tx.productMedia.updateMany({ where: { productId: targetId, mediaId: { not: mediaId }, sortOrder: { gte: sortOrder } }, data: { sortOrder: { increment: 1 } } });
    const attachment = await tx.productMedia.upsert({ where: { productId_mediaId: { productId: targetId, mediaId } }, create: { productId: targetId, mediaId, altText: string(data.altText, "Alt text", 240), sortOrder }, update: { altText: string(data.altText, "Alt text", 240), sortOrder } });
    await tx.auditEvent.create({ data: { actorType: "ADMIN", actorId, action: "PRODUCT_MEDIA_ATTACHED", targetType: "PRODUCT", targetId, safeMetadata: { mediaId } } });
    return attachment;
  });
}

export async function attachVariantMedia(variantId: string, input: unknown, actorId: string) {
  const data = object(input); keys(data, ["mediaId", "sortOrder"]);
  const mediaId = id(data.mediaId), targetId = id(variantId);
  return getPrisma().$transaction(async (tx) => {
    const [variant, media] = await Promise.all([tx.variant.findUnique({ where: { id: targetId } }), tx.mediaAsset.findUnique({ where: { id: mediaId } })]);
    if (!variant) throw new DomainError("NOT_FOUND", "Variant was not found.", 404);
    if (media?.state !== "APPROVED") throw new DomainError("MEDIA_NOT_APPROVED", "Only approved media can be attached.", 409);
    const sortOrder = data.sortOrder == null ? 0 : integer(data.sortOrder, "Sort order", 0, 100000);
    const existing = await tx.variantMedia.findUnique({ where: { variantId_mediaId: { variantId: targetId, mediaId } } });
    if (!existing || existing.sortOrder !== sortOrder) await tx.variantMedia.updateMany({ where: { variantId: targetId, mediaId: { not: mediaId }, sortOrder: { gte: sortOrder } }, data: { sortOrder: { increment: 1 } } });
    const attachment = await tx.variantMedia.upsert({ where: { variantId_mediaId: { variantId: targetId, mediaId } }, create: { variantId: targetId, mediaId, sortOrder }, update: { sortOrder } });
    await tx.auditEvent.create({ data: { actorType: "ADMIN", actorId, action: "VARIANT_MEDIA_ATTACHED", targetType: "VARIANT", targetId, safeMetadata: { mediaId } } });
    return attachment;
  });
}

export async function detachMedia(target: "product" | "variant", targetId: string, mediaId: string, actorId: string) {
  const ownerId = id(targetId), assetId = id(mediaId);
  return getPrisma().$transaction(async (tx) => {
    const deleted = target === "product" ? await tx.productMedia.deleteMany({ where: { productId: ownerId, mediaId: assetId } }) : await tx.variantMedia.deleteMany({ where: { variantId: ownerId, mediaId: assetId } });
    if (!deleted.count) throw new DomainError("NOT_FOUND", "Image reference was not found.", 404);
    await tx.auditEvent.create({ data: { actorType: "ADMIN", actorId, action: target === "product" ? "PRODUCT_MEDIA_DETACHED" : "VARIANT_MEDIA_DETACHED", targetType: target.toUpperCase(), targetId: ownerId, safeMetadata: { mediaId: assetId } } });
    // The MediaAsset is shared and intentionally remains intact for a separate
    // reference-counted quarantine/cleanup worker.
  });
}
