import { errorResponse, jsonBody, object } from "@/lib/backend-validation";
import { resolveCatalogVariants } from "@/lib/catalog-store";

export async function POST(request: Request) {
  if (process.env.CATALOG_RUNTIME !== "database") return Response.json({ products: [], sampleData: true });
  try { const data = object(await jsonBody(request)); return Response.json({ products: await resolveCatalogVariants(data.variantIds) }); } catch (error) { return errorResponse(error); }
}
