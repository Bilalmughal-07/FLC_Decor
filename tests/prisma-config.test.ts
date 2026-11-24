import { describe, expect, it } from "vitest";
import { readRuntimeDatabaseConfig } from "@/lib/prisma";

const serverlessUrl =
  "postgresql://flc_app_server.synthetic-ref:synthetic-password@aws-0-example.pooler.supabase.com:6543/postgres?schema=public&sslmode=verify-full&sslrootcert=%2Fsecure%2Fsupabase-ca.crt";

describe("Prisma runtime database configuration", () => {
  it("defaults a local pool to one connection and requires public explicitly", () => {
    const parsed = readRuntimeDatabaseConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://flc@127.0.0.1:5433/flcdecor_test?schema=public",
    });

    expect(parsed.max).toBe(1);
    expect(parsed.schema).toBe("public");
    expect(() => readRuntimeDatabaseConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://flc@127.0.0.1:5433/flcdecor_test",
    })).toThrow("DATABASE_URL_PUBLIC_SCHEMA_REQUIRED");
  });

  it("accepts the verified serverless Supabase boundary", () => {
    const parsed = readRuntimeDatabaseConfig({
      NODE_ENV: "production",
      DATABASE_URL: serverlessUrl,
      DATABASE_POOL_MAX: "1",
      DATABASE_CONNECTION_MODE: "serverless",
    });

    expect(parsed.max).toBe(1);
  });

  it("rejects production URLs with the wrong role, pooler, or TLS boundary", () => {
    expect(() => readRuntimeDatabaseConfig({
      NODE_ENV: "production",
      DATABASE_URL: serverlessUrl.replace("flc_app_server", "postgres"),
    })).toThrow("DATABASE_URL_SERVER_ROLE_REQUIRED");

    expect(() => readRuntimeDatabaseConfig({
      NODE_ENV: "production",
      DATABASE_URL: serverlessUrl.replace(":6543", ":5432"),
    })).toThrow("DATABASE_URL_TRANSACTION_POOLER_REQUIRED");

    expect(() => readRuntimeDatabaseConfig({
      NODE_ENV: "production",
      DATABASE_URL: serverlessUrl.replace("sslmode=verify-full&", ""),
    })).toThrow("DATABASE_URL_VERIFIED_TLS_REQUIRED");
  });

  it("allows an explicitly selected persistent port-5432 deployment", () => {
    const parsed = readRuntimeDatabaseConfig({
      NODE_ENV: "production",
      DATABASE_CONNECTION_MODE: "persistent",
      DATABASE_URL:
        "postgresql://flc_app_server:synthetic-password@db.synthetic-ref.supabase.co:5432/postgres?schema=public&sslmode=verify-full&sslrootcert=%2Fsecure%2Fsupabase-ca.crt",
      DATABASE_POOL_MAX: "4",
    });

    expect(parsed.max).toBe(4);
  });
});
