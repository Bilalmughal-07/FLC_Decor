import { allowRequest, checkSameOrigin, type AdminPermission } from "@/lib/auth";
import { requirePersistentAdminPermission } from "@/lib/admin-auth";
import { DomainError } from "@/lib/backend-validation";

export async function adminActor(request: Request, permission: AdminPermission, mutate = false) {
  if (!allowRequest(request, `admin:${permission}`, 100)) throw new DomainError("RATE_LIMITED", "Too many requests.", 429);
  if (mutate && !checkSameOrigin(request)) throw new DomainError("INVALID_ORIGIN", "Invalid request origin.", 403);
  const session = await requirePersistentAdminPermission(request, permission);
  if (!session) throw new DomainError("UNAUTHORIZED", "Administrator MFA and permission are required.", 401);
  if (!process.env.DATABASE_URL) throw new DomainError("DATABASE_NOT_CONFIGURED", "Database operations are not configured.", 503);
  return session.user.id;
}
