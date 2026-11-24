import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 does not load Next.js `.env.local` semantics. Load `.env` by
// default, or an explicitly selected uncommitted file for controlled local/CI
// operations. Process-level variables keep precedence.
loadEnv({ path: process.env.PRISMA_ENV_FILE?.trim() || ".env", override: false });

const migrationUrl = process.env.DIRECT_DATABASE_URL?.trim();
if (!migrationUrl) {
  throw new Error("DIRECT_DATABASE_URL is required for Prisma CLI operations");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: migrationUrl },
});
