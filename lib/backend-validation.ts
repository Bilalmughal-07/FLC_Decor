export class DomainError extends Error {
  constructor(readonly code: string, message: string, readonly status = 400) { super(message); }
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DomainError("VALIDATION_ERROR", "Expected an object.");
  return value as Record<string, unknown>;
}
export function string(value: unknown, label: string, max = 240) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new DomainError("VALIDATION_ERROR", `${label} is required and must be at most ${max} characters.`);
  return value.trim();
}
export function optionalString(value: unknown, label: string, max = 240) { return value == null || value === "" ? null : string(value, label, max); }
export function slug(value: unknown) { const result = string(value, "Slug", 100); if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) throw new DomainError("VALIDATION_ERROR", "Slug must use lowercase letters, numbers and hyphens."); return result; }
export function id(value: unknown) { const result = string(value, "ID", 50); if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(result)) throw new DomainError("VALIDATION_ERROR", "Invalid ID."); return result; }
export function integer(value: unknown, label: string, min = 0, max = 2_000_000_000) { if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) throw new DomainError("VALIDATION_ERROR", `${label} is invalid.`); return value as number; }
export function boolean(value: unknown, label: string) { if (typeof value !== "boolean") throw new DomainError("VALIDATION_ERROR", `${label} must be a boolean.`); return value; }
export function keys(value: Record<string, unknown>, allowed: string[]) { for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new DomainError("VALIDATION_ERROR", `Unexpected field: ${key}.`); }
export function errorResponse(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    if (error.code === "P2002") return Response.json({ error: { code: "ALREADY_EXISTS", message: "A record with this unique value already exists." } }, { status: 409 });
    if (error.code === "P2003") return Response.json({ error: { code: "IN_USE", message: "This record is still referenced." } }, { status: 409 });
  }
  const issue = error instanceof DomainError ? error : new DomainError("SERVICE_UNAVAILABLE", "The database service is temporarily unavailable.", 503);
  return Response.json({ error: { code: issue.code, message: issue.message } }, { status: issue.status });
}
export async function jsonBody(request: Request) { try { return await request.json() as unknown; } catch { throw new DomainError("VALIDATION_ERROR", "Valid JSON is required."); } }
