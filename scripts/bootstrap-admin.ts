import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });

import { bootstrapInitialAdmin } from "../lib/admin-auth";
import { getPrisma } from "../lib/prisma";

bootstrapInitialAdmin()
  .then(() => { process.stdout.write("Initial administrator created. Bootstrap is now permanently disabled for this database.\n"); })
  .catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : "Administrator bootstrap failed."}\n`); process.exitCode = 1; })
  .finally(async () => { await getPrisma().$disconnect().catch(() => undefined); });
