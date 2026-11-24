import { adminActor } from "@/lib/admin-api";
import { errorResponse } from "@/lib/backend-validation";
import { listAuditEvents } from "@/lib/admin-store";

export async function GET(request: Request) { try { await adminActor(request, "audit.read"); return Response.json(await listAuditEvents(Number(new URL(request.url).searchParams.get("page") ?? "1"))); } catch (error) { return errorResponse(error); } }
