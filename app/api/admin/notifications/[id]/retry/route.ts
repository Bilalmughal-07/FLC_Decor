import { adminActor } from "@/lib/admin-api";
import { errorResponse } from "@/lib/backend-validation";
import { retryNotificationOutbox } from "@/lib/notification-service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await adminActor(request, "notifications.retry", true);
    const event = await retryNotificationOutbox((await context.params).id, actorId);
    return Response.json({ event: { id: event.id, state: event.state, availableAt: event.availableAt } }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
