import { accountActor } from "@/lib/account-api";
import { getAccountOrder } from "@/lib/account-store";
import { errorResponse } from "@/lib/backend-validation";

export async function GET(request: Request, context: { params: Promise<{ number: string }> }) {
  try {
    const order = await getAccountOrder(await accountActor(request), (await context.params).number);
    return order ? Response.json({ order }, { headers: { "cache-control": "private, no-store" } }) : Response.json({ error: { code: "NOT_FOUND", message: "Order was not found." } }, { status: 404, headers: { "cache-control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
