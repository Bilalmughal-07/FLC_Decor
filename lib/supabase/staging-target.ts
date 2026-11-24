export const STAGING_SUPABASE_PROJECT_REF = "ltcgiquvrplfrbojbbbb";
export const ORIGINAL_SUPABASE_PROJECT_REF = "wggnufkrsjsmqyutjmut";

type StagingEnvironment = Record<string, string | undefined>;

type ValidationOptions = {
  certificateFileIsReadable?: (path: string) => boolean;
};

export type StagingTargetSummary = {
  projectRef: typeof STAGING_SUPABASE_PROJECT_REF;
  directPort: "5432";
  psqlPort: "5432";
  runtimePort: "6543";
  runtimeRole: "flc_app_server";
  database: "postgres";
  schema: "public";
  tlsMode: "verify-full";
  poolMax: 1;
};

const PLACEHOLDER_PATTERN = /(?:not_configured|replace|placeholder|your[-_]|project_ref|secret|password)/i;
const ROUTING_OVERRIDE_PARAMETERS = new Set([
  "database",
  "dbname",
  "host",
  "hostaddr",
  "password",
  "port",
  "user",
  "username",
]);

const ALLOWED_QUERY_PARAMETERS = {
  DIRECT_DATABASE_URL: new Set(["application_name", "connect_timeout", "schema", "sslmode", "sslrootcert"]),
  DIRECT_PSQL_URL: new Set(["application_name", "connect_timeout", "schema", "sslmode", "sslrootcert", "target_session_attrs"]),
  DATABASE_URL: new Set(["application_name", "connect_timeout", "schema", "sslmode", "sslrootcert"]),
} as const;

type DatabaseVariable = keyof typeof ALLOWED_QUERY_PARAMETERS;

function fail(code: string): never {
  throw new Error(code);
}

function decode(value: string, code: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    fail(code);
  }
}

function parseDatabaseUrl(name: DatabaseVariable, rawValue: string | undefined) {
  const value = rawValue?.trim();
  if (!value) fail(`${name}_REQUIRED`);
  if (value.toLowerCase().includes(ORIGINAL_SUPABASE_PROJECT_REF)) {
    fail(`${name}_ORIGINAL_PROJECT_REJECTED`);
  }

  let target: URL;
  try {
    target = new URL(value);
  } catch {
    fail(`${name}_INVALID`);
  }

  if (!new Set(["postgres:", "postgresql:"]).has(target.protocol)) {
    fail(`${name}_POSTGRES_PROTOCOL_REQUIRED`);
  }
  if (target.hash) fail(`${name}_FRAGMENT_NOT_ALLOWED`);

  const seen = new Set<string>();
  for (const [parameter] of target.searchParams) {
    const normalized = parameter.toLowerCase();
    if (seen.has(normalized)) fail(`${name}_DUPLICATE_QUERY_PARAMETER`);
    seen.add(normalized);
    if (ROUTING_OVERRIDE_PARAMETERS.has(normalized)) fail(`${name}_ROUTING_OVERRIDE_REJECTED`);
    if (!ALLOWED_QUERY_PARAMETERS[name].has(normalized as never)) {
      fail(`${name}_UNSUPPORTED_QUERY_PARAMETER`);
    }
  }

  const rawAuthority = value.slice(value.indexOf("://") + 3, value.indexOf("@"));
  const rawPassword = rawAuthority.includes(":") ? rawAuthority.slice(rawAuthority.indexOf(":") + 1) : "";
  const withoutEscapes = rawPassword.replace(/%[0-9a-f]{2}/gi, "");
  if (!rawPassword || /%/.test(withoutEscapes) || /[^A-Za-z0-9._~-]/.test(withoutEscapes)) {
    fail(`${name}_PASSWORD_MUST_BE_URL_ENCODED`);
  }

  const username = decode(target.username, `${name}_USERNAME_ENCODING_INVALID`);
  const password = decode(target.password, `${name}_PASSWORD_ENCODING_INVALID`);
  if (!username) fail(`${name}_USERNAME_REQUIRED`);
  if (!password || PLACEHOLDER_PATTERN.test(password)) fail(`${name}_SECRET_REQUIRED`);
  if (target.pathname !== "/postgres") fail(`${name}_POSTGRES_DATABASE_REQUIRED`);
  if (target.searchParams.get("sslmode") !== "verify-full") fail(`${name}_VERIFY_FULL_REQUIRED`);

  const certificatePath = target.searchParams.get("sslrootcert")?.trim();
  if (!certificatePath || PLACEHOLDER_PATTERN.test(certificatePath)) fail(`${name}_ROOT_CERTIFICATE_REQUIRED`);
  if (!certificatePath.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(certificatePath)) {
    fail(`${name}_ROOT_CERTIFICATE_ABSOLUTE_PATH_REQUIRED`);
  }

  return { target, username, certificatePath };
}

export function validateSupabaseStagingTarget(
  environment: StagingEnvironment,
  options: ValidationOptions = {},
): StagingTargetSummary {
  if (environment.SUPABASE_PROJECT_REF?.trim() !== STAGING_SUPABASE_PROJECT_REF) {
    fail("SUPABASE_PROJECT_REF_STAGING_REQUIRED");
  }

  const direct = parseDatabaseUrl("DIRECT_DATABASE_URL", environment.DIRECT_DATABASE_URL);
  const psql = parseDatabaseUrl("DIRECT_PSQL_URL", environment.DIRECT_PSQL_URL);
  const runtime = parseDatabaseUrl("DATABASE_URL", environment.DATABASE_URL);

  const expectedDirectHost = `db.${STAGING_SUPABASE_PROJECT_REF}.supabase.co`;
  for (const [name, parsed] of [["DIRECT_DATABASE_URL", direct], ["DIRECT_PSQL_URL", psql]] as const) {
    if (parsed.target.hostname !== expectedDirectHost || parsed.target.port !== "5432") {
      fail(`${name}_STAGING_DIRECT_ENDPOINT_REQUIRED`);
    }
    if (parsed.username !== "postgres") fail(`${name}_POSTGRES_OWNER_REQUIRED`);
  }

  if (direct.target.searchParams.get("schema") !== "public") {
    fail("DIRECT_DATABASE_URL_PUBLIC_SCHEMA_REQUIRED");
  }
  if (psql.target.searchParams.has("schema")) fail("DIRECT_PSQL_URL_PRISMA_SCHEMA_PARAMETER_REJECTED");

  if (!/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(runtime.target.hostname) || runtime.target.port !== "6543") {
    fail("DATABASE_URL_STAGING_TRANSACTION_POOLER_REQUIRED");
  }
  if (runtime.username !== `flc_app_server.${STAGING_SUPABASE_PROJECT_REF}`) {
    fail("DATABASE_URL_STAGING_SERVER_ROLE_REQUIRED");
  }
  if (runtime.target.searchParams.get("schema") !== "public") fail("DATABASE_URL_PUBLIC_SCHEMA_REQUIRED");

  if (environment.DATABASE_CONNECTION_MODE?.trim() !== "serverless") {
    fail("DATABASE_CONNECTION_MODE_SERVERLESS_REQUIRED");
  }
  if (environment.DATABASE_POOL_MAX?.trim() !== "1") fail("DATABASE_POOL_MAX_ONE_REQUIRED");

  const publicUrl = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (publicUrl && publicUrl !== "NOT_CONFIGURED") {
    if (publicUrl.toLowerCase().includes(ORIGINAL_SUPABASE_PROJECT_REF)) {
      fail("NEXT_PUBLIC_SUPABASE_URL_ORIGINAL_PROJECT_REJECTED");
    }
    let parsedPublicUrl: URL;
    try {
      parsedPublicUrl = new URL(publicUrl);
    } catch {
      fail("NEXT_PUBLIC_SUPABASE_URL_INVALID");
    }
    if (parsedPublicUrl.toString() !== `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co/`) {
      fail("NEXT_PUBLIC_SUPABASE_URL_STAGING_REQUIRED");
    }
  }

  const certificatePaths = new Set([
    direct.certificatePath,
    psql.certificatePath,
    runtime.certificatePath,
  ]);
  if (certificatePaths.size !== 1) fail("STAGING_ROOT_CERTIFICATE_PATHS_MUST_MATCH");
  if (options.certificateFileIsReadable && !options.certificateFileIsReadable(direct.certificatePath)) {
    fail("STAGING_ROOT_CERTIFICATE_NOT_READABLE");
  }

  return {
    projectRef: STAGING_SUPABASE_PROJECT_REF,
    directPort: "5432",
    psqlPort: "5432",
    runtimePort: "6543",
    runtimeRole: "flc_app_server",
    database: "postgres",
    schema: "public",
    tlsMode: "verify-full",
    poolMax: 1,
  };
}
