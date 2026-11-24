import { allowRequest, checkSameOrigin, requireCustomer } from "@/lib/auth";
import { DomainError } from "@/lib/backend-validation";
import { getCustomerAuthRuntime } from "@/lib/supabase/config";
import { getSupabaseCustomer } from "@/lib/supabase/identity";

export async function accountActor(request: Request, mutate = false) {
  if (!allowRequest(request, "account-storage", 100)) throw new DomainError("RATE_LIMITED", "Too many requests.", 429);
  if (mutate && !checkSameOrigin(request)) throw new DomainError("INVALID_ORIGIN", "Invalid request origin.", 403);
  if (getCustomerAuthRuntime() === "supabase") {
    const customer = await getSupabaseCustomer(request);
    if (!customer) throw new DomainError("UNAUTHORIZED", "Sign in to manage your account.", 401);
    return customer;
  }
  const session = requireCustomer(request);
  if (!session) throw new DomainError("UNAUTHORIZED", "Sign in to manage your account.", 401);
  return { id: session.user.id, email: session.user.email };
}
