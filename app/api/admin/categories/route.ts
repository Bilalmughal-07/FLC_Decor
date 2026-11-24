import { adminActor } from "@/lib/admin-api";
import { errorResponse, jsonBody } from "@/lib/backend-validation";
import { createCategory } from "@/lib/catalog-store";
import { getPrisma } from "@/lib/prisma";

export async function GET(request: Request) { try { await adminActor(request, "catalog.read"); return Response.json({ categories: await getPrisma().category.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }) }); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) { try { const actor = await adminActor(request, "catalog.write", true); return Response.json({ category: await createCategory(await jsonBody(request), actor) }, { status: 201 }); } catch (error) { return errorResponse(error); } }
