import { accountActor } from "@/lib/account-api";
import { errorResponse, jsonBody } from "@/lib/backend-validation";
import { readProfile, updateProfile } from "@/lib/account-store";

export async function GET(request: Request) { try { return Response.json({ profile: await readProfile(await accountActor(request)) }, { headers: { "cache-control": "no-store" } }); } catch (error) { return errorResponse(error); } }
export async function PATCH(request: Request) { try { return Response.json({ profile: await updateProfile(await accountActor(request, true), await jsonBody(request)) }, { headers: { "cache-control": "no-store" } }); } catch (error) { return errorResponse(error); } }
