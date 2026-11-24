import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

type PrismaRuntime = typeof globalThis & { __flcPrisma?: PrismaClient; __flcPgPool?: Pool };

type DatabaseEnvironment = NodeJS.ProcessEnv;

export type RuntimeDatabaseConfig = {
  connectionString: string;
  max: number;
  schema: "public";
};

export function readRuntimeDatabaseConfig(environment: DatabaseEnvironment = process.env): RuntimeDatabaseConfig {
  const connectionString = environment.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL_NOT_CONFIGURED");

  let target: URL;
  try {
    target = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL_INVALID");
  }
  if (!["postgres:", "postgresql:"].includes(target.protocol)) throw new Error("DATABASE_URL_INVALID_PROTOCOL");
  if (target.searchParams.get("schema") !== "public") throw new Error("DATABASE_URL_PUBLIC_SCHEMA_REQUIRED");

  const configuredMax = Number(environment.DATABASE_POOL_MAX ?? "1");
  const max = Number.isInteger(configuredMax) && configuredMax >= 1 && configuredMax <= 50 ? configuredMax : 1;

  if (environment.NODE_ENV === "production") {
    if (target.searchParams.get("sslmode") !== "verify-full" || !target.searchParams.get("sslrootcert")) {
      throw new Error("DATABASE_URL_VERIFIED_TLS_REQUIRED");
    }

    const connectionMode = environment.DATABASE_CONNECTION_MODE?.trim() || "serverless";
    if (connectionMode === "serverless") {
      if (target.port !== "6543" || !target.hostname.endsWith(".pooler.supabase.com")) {
        throw new Error("DATABASE_URL_TRANSACTION_POOLER_REQUIRED");
      }
    } else if (connectionMode === "persistent") {
      if (target.port !== "5432") throw new Error("DATABASE_URL_SESSION_CONNECTION_REQUIRED");
    } else {
      throw new Error("DATABASE_CONNECTION_MODE_INVALID");
    }

    const databaseUser = decodeURIComponent(target.username).split(".", 1)[0];
    if (databaseUser !== "flc_app_server") throw new Error("DATABASE_URL_SERVER_ROLE_REQUIRED");
  }

  return { connectionString, max, schema: "public" };
}

export function getPrisma() {
  const runtime = globalThis as PrismaRuntime;
  if (runtime.__flcPrisma) return runtime.__flcPrisma;
  const { connectionString, max, schema } = readRuntimeDatabaseConfig();
  const pool = runtime.__flcPgPool ?? new Pool({ connectionString, max, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000, keepAlive: true });
  const client = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  runtime.__flcPgPool = pool;
  runtime.__flcPrisma = client;
  return client;
}
