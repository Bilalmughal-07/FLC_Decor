import { accountActor } from "@/lib/account-api";
import { errorResponse, jsonBody } from "@/lib/backend-validation";
import { createAddress, listAddresses } from "@/lib/account-store";

export async function GET(request: Request) { try { return Response.json({ addresses: await listAddresses(await accountActor(request)) }, { headers: { "cache-control": "no-store" } }); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) { try { return Response.json({ address: await createAddress(await accountActor(request, true), await jsonBody(request)) }, { status: 201, headers: { "cache-control": "no-store" } }); } catch (error) { return errorResponse(error); } }
