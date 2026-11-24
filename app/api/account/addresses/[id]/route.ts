import { accountActor } from "@/lib/account-api";
import { errorResponse } from "@/lib/backend-validation";
import { deleteAddress, setDefaultAddress } from "@/lib/account-store";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) { try { await deleteAddress(await accountActor(request, true), (await context.params).id); return new Response(null, { status: 204 }); } catch (error) { return errorResponse(error); } }
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { return Response.json({ address: await setDefaultAddress(await accountActor(request, true), (await context.params).id) }, { headers: { "cache-control": "no-store" } }); } catch (error) { return errorResponse(error); } }
