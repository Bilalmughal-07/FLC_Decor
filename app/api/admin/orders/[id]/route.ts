import { adminActor } from "@/lib/admin-api";
import { errorResponse } from "@/lib/backend-validation";
import { getAdminOrder } from "@/lib/admin-store";
import { jsonBody } from "@/lib/backend-validation";
import { transitionDemoOrder } from "@/lib/order-lifecycle";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) { try { await adminActor(request, "orders.read"); const order = await getAdminOrder((await context.params).id); return order ? Response.json({ order }) : Response.json({ error: { code: "NOT_FOUND", message: "Order was not found." } }, { status: 404 }); } catch (error) { return errorResponse(error); } }
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { const actorId = await adminActor(request, "orders.transition", true); return Response.json(await transitionDemoOrder((await context.params).id, await jsonBody(request), actorId)); } catch (error) { return errorResponse(error); } }
