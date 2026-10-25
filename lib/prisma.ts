import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

type PrismaRuntime = typeof globalThis & { __flcPrisma?: PrismaClient; __flcPgPool?: Pool };

export function getPrisma() {
  const runtime = globalThis as PrismaRuntime;
  if (runtime.__flcPrisma) return runtime.__flcPrisma;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL_NOT_CONFIGURED");
  const pool = runtime.__flcPgPool ?? new Pool({ connectionString, max: 10, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000 });
  const client = new PrismaClient({ adapter: new PrismaPg(pool) });
  runtime.__flcPgPool = pool;
  runtime.__flcPrisma = client;
  return client;
}
