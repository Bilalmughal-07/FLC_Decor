import { NextResponse } from "next/server";
import { categories, products } from "@/lib/catalog";
import { listCatalog } from "@/lib/catalog-store";
import { errorResponse } from "@/lib/backend-validation";
export async function GET(request: Request) {
  if (process.env.CATALOG_RUNTIME !== "database") return NextResponse.json({ categories, products, sampleData: true });
  try { return NextResponse.json(await listCatalog(new URL(request.url).searchParams)); } catch (error) { return errorResponse(error); }
}
