import { adminActor } from "@/lib/admin-api";
import { errorResponse, jsonBody } from "@/lib/backend-validation";
import { createProduct, listAdminProducts } from "@/lib/catalog-store";

export async function GET(request: Request) { try { await adminActor(request, "catalog.read"); return Response.json({ products: await listAdminProducts() }); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) { try { const actor = await adminActor(request, "catalog.write", true); return Response.json({ product: await createProduct(await jsonBody(request), actor) }, { status: 201 }); } catch (error) { return errorResponse(error); } }
