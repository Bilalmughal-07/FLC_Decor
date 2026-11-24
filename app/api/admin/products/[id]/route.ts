import { adminActor } from "@/lib/admin-api";
import { errorResponse, jsonBody } from "@/lib/backend-validation";
import { getAdminProduct, updateProduct } from "@/lib/catalog-store";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) { try { await adminActor(request, "catalog.read"); const product = await getAdminProduct((await context.params).id); return product ? Response.json({ product }) : Response.json({ error: { code: "NOT_FOUND", message: "Product was not found." } }, { status: 404 }); } catch (error) { return errorResponse(error); } }
export async function PATCH(request: Request, context: Context) { try { const actor = await adminActor(request, "catalog.write", true); return Response.json({ product: await updateProduct((await context.params).id, await jsonBody(request), actor) }); } catch (error) { return errorResponse(error); } }
