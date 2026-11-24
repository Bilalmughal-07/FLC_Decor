import { adminActor } from "@/lib/admin-api";
import { DomainError, errorResponse } from "@/lib/backend-validation";
import { processNotificationBatch } from "@/lib/notification-service";

export async function POST(request: Request) {
  try {
    await adminActor(request, "notifications.retry", true);
    if (process.env.NODE_ENV === "production" || process.env.NOTIFICATION_RUNTIME !== "development-memory") throw new DomainError("DELIVERY_NOT_CONFIGURED", "Development notification processing is not configured.", 503);
    return Response.json(await processNotificationBatch(20), { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
