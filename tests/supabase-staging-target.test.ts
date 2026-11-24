import { describe, expect, it } from "vitest";
import {
  ORIGINAL_SUPABASE_PROJECT_REF,
  STAGING_SUPABASE_PROJECT_REF,
  validateSupabaseStagingTarget,
} from "@/lib/supabase/staging-target";

const certificatePath = "C%3A%5Csecure%5Csupabase-staging-ca.crt";

function stagingEnvironment(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    NODE_ENV: "test",
    SUPABASE_PROJECT_REF: STAGING_SUPABASE_PROJECT_REF,
    DIRECT_DATABASE_URL: `postgresql://postgres:Synthet1c%21Value@db.${STAGING_SUPABASE_PROJECT_REF}.supabase.co:5432/postgres?schema=public&sslmode=verify-full&sslrootcert=${certificatePath}`,
    DIRECT_PSQL_URL: `postgresql://postgres:Synthet1c%21Value@db.${STAGING_SUPABASE_PROJECT_REF}.supabase.co:5432/postgres?sslmode=verify-full&sslrootcert=${certificatePath}`,
    DATABASE_URL: `postgresql://flc_app_server.${STAGING_SUPABASE_PROJECT_REF}:Synthet1c%21Value@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?schema=public&sslmode=verify-full&sslrootcert=${certificatePath}`,
    DATABASE_CONNECTION_MODE: "serverless",
    DATABASE_POOL_MAX: "1",
    NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`,
    ...overrides,
  };
}

const options = { certificateFileIsReadable: () => true };

describe("Supabase staging target validation", () => {
  it("accepts only the approved direct, psql, and transaction-pooler boundary", () => {
    expect(validateSupabaseStagingTarget(stagingEnvironment(), options)).toEqual({
      projectRef: STAGING_SUPABASE_PROJECT_REF,
      directPort: "5432",
      psqlPort: "5432",
      runtimePort: "6543",
      runtimeRole: "flc_app_server",
      database: "postgres",
      schema: "public",
      tlsMode: "verify-full",
      poolMax: 1,
    });
  });

  it("rejects every reference to the original project", () => {
    expect(() => validateSupabaseStagingTarget(stagingEnvironment({
      DIRECT_DATABASE_URL: `postgresql://postgres:Synthet1c%21Value@db.${ORIGINAL_SUPABASE_PROJECT_REF}.supabase.co:5432/postgres?schema=public&sslmode=verify-full&sslrootcert=${certificatePath}`,
    }), options)).toThrow("DIRECT_DATABASE_URL_ORIGINAL_PROJECT_REJECTED");

    expect(() => validateSupabaseStagingTarget(stagingEnvironment({
      DATABASE_URL: `postgresql://flc_app_server.${ORIGINAL_SUPABASE_PROJECT_REF}:Synthet1c%21Value@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?schema=public&sslmode=verify-full&sslrootcert=${certificatePath}`,
    }), options)).toThrow("DATABASE_URL_ORIGINAL_PROJECT_REJECTED");
  });

  it("rejects routing overrides, wrong ports, roles, and Prisma parameters in psql", () => {
    expect(() => validateSupabaseStagingTarget(stagingEnvironment({
      DIRECT_PSQL_URL: `${stagingEnvironment().DIRECT_PSQL_URL}&host=db.${ORIGINAL_SUPABASE_PROJECT_REF}.supabase.co`,
    }), options)).toThrow("DIRECT_PSQL_URL_ORIGINAL_PROJECT_REJECTED");

    expect(() => validateSupabaseStagingTarget(stagingEnvironment({
      DATABASE_URL: stagingEnvironment().DATABASE_URL?.replace(":6543", ":5432"),
    }), options)).toThrow("DATABASE_URL_STAGING_TRANSACTION_POOLER_REQUIRED");

    expect(() => validateSupabaseStagingTarget(stagingEnvironment({
      DATABASE_URL: stagingEnvironment().DATABASE_URL?.replace("flc_app_server", "postgres"),
    }), options)).toThrow("DATABASE_URL_STAGING_SERVER_ROLE_REQUIRED");

    expect(() => validateSupabaseStagingTarget(stagingEnvironment({
      DIRECT_PSQL_URL: `${stagingEnvironment().DIRECT_PSQL_URL}&schema=public`,
    }), options)).toThrow("DIRECT_PSQL_URL_PRISMA_SCHEMA_PARAMETER_REJECTED");
  });

  it("rejects weak TLS, inconsistent certificates, and unsafe pool settings", () => {
    expect(() => validateSupabaseStagingTarget(stagingEnvironment({
      DATABASE_URL: stagingEnvironment().DATABASE_URL?.replace("verify-full", "require"),
    }), options)).toThrow("DATABASE_URL_VERIFY_FULL_REQUIRED");

    expect(() => validateSupabaseStagingTarget(stagingEnvironment({
      DATABASE_POOL_MAX: "2",
    }), options)).toThrow("DATABASE_POOL_MAX_ONE_REQUIRED");

    expect(() => validateSupabaseStagingTarget(stagingEnvironment(), {
      certificateFileIsReadable: () => false,
    })).toThrow("STAGING_ROOT_CERTIFICATE_NOT_READABLE");
  });
});
