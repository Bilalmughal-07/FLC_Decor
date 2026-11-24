import { adminActor } from "@/lib/admin-api";
import { errorResponse } from "@/lib/backend-validation";
import { listNotificationOperations } from "@/lib/notification-service";

export async function GET(request: Request) {
  try {
    await adminActor(request, "notifications.read");
    return Response.json(await listNotificationOperations(Number(new URL(request.url).searchParams.get("page") ?? "1")), { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
