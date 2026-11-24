import { adminActor } from "@/lib/admin-api";
import { errorResponse } from "@/lib/backend-validation";
import { adminDashboard } from "@/lib/admin-store";

export async function GET(request: Request) { try { await adminActor(request, "analytics.read"); return Response.json(await adminDashboard()); } catch (error) { return errorResponse(error); } }
