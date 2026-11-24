import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

export type StoredObject = {
  body: Buffer;
  contentType: string;
  cacheControl: string;
  metadata?: Record<string, string>;
};

export interface MediaStorage {
  put(key: string, object: StoredObject): Promise<void>;
  head(key: string): Promise<{ bytes: number; contentType?: string; metadata?: Record<string, string> }>;
  get(key: string): Promise<{ body: Buffer; contentType?: string; cacheControl?: string }>;
  copy(sourceKey: string, destinationKey: string, options: { contentType: string; cacheControl: string }): Promise<void>;
  delete(key: string): Promise<void>;
}

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  publicBaseUrl: string | null;
};

function configured(value: string | undefined) {
  return Boolean(value && value !== "NOT_CONFIGURED");
}

type Environment = Readonly<Record<string, string | undefined>>;

export function readR2Config(environment: Environment = process.env): R2Config | null {
  if (environment.MEDIA_STORAGE_RUNTIME !== "r2") return null;
  const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_ENDPOINT"] as const;
  if (required.some((key) => !configured(environment[key]))) return null;
  const endpoint = new URL(environment.R2_ENDPOINT!);
  if (endpoint.protocol !== "https:") return null;
  const publicBase = configured(environment.R2_PUBLIC_BASE_URL) ? new URL(environment.R2_PUBLIC_BASE_URL!) : null;
  if (publicBase && publicBase.protocol !== "https:") return null;
  return {
    accountId: environment.R2_ACCOUNT_ID!,
    accessKeyId: environment.R2_ACCESS_KEY_ID!,
    secretAccessKey: environment.R2_SECRET_ACCESS_KEY!,
    bucket: environment.R2_BUCKET_NAME!,
    endpoint: endpoint.href.replace(/\/$/, ""),
    publicBaseUrl: publicBase?.href.replace(/\/$/, "") ?? null,
  };
}

function assertObjectKey(key: string) {
  if (!/^(staging|public)\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\/(main|thumb)\.webp$/.test(key)) throw new Error("UNSAFE_MEDIA_OBJECT_KEY");
  return key;
}

export function createMediaObjectKeys(now = new Date(), id = randomUUID()) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("INVALID_MEDIA_KEY_ID");
  const date = now.toISOString().slice(0, 10);
  const base = `staging/${date}/${id}`;
  return { main: `${base}/main.webp`, thumbnail: `${base}/thumb.webp` };
}

export function thumbnailObjectKey(mainKey: string) {
  return assertObjectKey(mainKey).replace(/\/main\.webp$/, "/thumb.webp");
}

export function publicObjectKey(stagingKey: string) {
  const safe = assertObjectKey(stagingKey);
  if (!safe.startsWith("staging/")) throw new Error("MEDIA_NOT_STAGED");
  return `public/${safe.slice("staging/".length)}`;
}

export function stagingObjectKey(publicKey: string) {
  const safe = assertObjectKey(publicKey);
  if (!safe.startsWith("public/")) throw new Error("MEDIA_NOT_PUBLIC");
  return `staging/${safe.slice("public/".length)}`;
}

export function publicMediaUrl(mediaId: string, objectKey: string, thumbnail = false, environment: Environment = process.env) {
  const key = thumbnail ? thumbnailObjectKey(objectKey) : assertObjectKey(objectKey);
  const config = readR2Config(environment);
  if (config?.publicBaseUrl && key.startsWith("public/")) return `${config.publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
  return `/api/media/${encodeURIComponent(mediaId)}${thumbnail ? "?kind=thumbnail" : ""}`;
}

export function createR2Storage(config = readR2Config()): MediaStorage {
  if (!config) throw new Error("R2_NOT_CONFIGURED");
  const client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  const bucket = config.bucket;
  return {
    async put(key, object) {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: assertObjectKey(key), Body: object.body, ContentType: object.contentType, CacheControl: object.cacheControl, Metadata: object.metadata }));
    },
    async head(key) {
      const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: assertObjectKey(key) }));
      return { bytes: result.ContentLength ?? 0, contentType: result.ContentType, metadata: result.Metadata };
    },
    async get(key) {
      const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: assertObjectKey(key) }));
      if (!result.Body) throw new Error("R2_OBJECT_EMPTY");
      return { body: Buffer.from(await result.Body.transformToByteArray()), contentType: result.ContentType, cacheControl: result.CacheControl };
    },
    async copy(sourceKey, destinationKey, options) {
      await client.send(new CopyObjectCommand({
        Bucket: bucket,
        Key: assertObjectKey(destinationKey),
        CopySource: `${encodeURIComponent(bucket)}/${assertObjectKey(sourceKey).split("/").map(encodeURIComponent).join("/")}`,
        MetadataDirective: "REPLACE",
        ContentType: options.contentType,
        CacheControl: options.cacheControl,
      }));
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: assertObjectKey(key) }));
    },
  };
}
