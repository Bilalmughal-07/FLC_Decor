import { readFileSync } from "node:fs";
import { config as loadEnv } from "dotenv";
import { validateSupabaseStagingTarget } from "../lib/supabase/staging-target";

const selectedEnvironmentFile = process.env.STAGING_ENV_FILE?.trim();
if (selectedEnvironmentFile) {
  loadEnv({ path: selectedEnvironmentFile, override: false });
}

validateSupabaseStagingTarget(process.env, {
  certificateFileIsReadable(path) {
    try {
      const contents = readFileSync(path, "utf8");
      return contents.includes("-----BEGIN CERTIFICATE-----") && contents.includes("-----END CERTIFICATE-----");
    } catch {
      return false;
    }
  },
});

console.log("Validated the approved FLC Decor staging database targets without connecting.");
