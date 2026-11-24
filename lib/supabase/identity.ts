import { createSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getCustomerAuthRuntime } from "@/lib/supabase/config";

export type CustomerIdentity = { id: string; email: string };

export async function getSupabaseCustomer(request: Request): Promise<CustomerIdentity | null> {
  if (getCustomerAuthRuntime() !== "supabase") return null;
  const routeClient = createSupabaseRouteClient(request);
  if (!routeClient) return null;
  let result;
  try {
    result = await routeClient.client.auth.getUser();
  } catch {
    return null;
  }
  const { data, error } = result;
  const email = data.user?.email?.trim().toLowerCase();
  if (error || !data.user || !email) return null;
  return { id: data.user.id, email };
}
