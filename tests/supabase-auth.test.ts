import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  resend: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/supabase/route-client", () => ({
  createSupabaseRouteClient: () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY === "NOT_CONFIGURED" ? null : ({ client: { auth }, apply: (response: Response) => response }),
}));

import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as google } from "@/app/api/auth/oauth/google/route";
import { GET as callback } from "@/app/auth/callback/route";
import { authRedirectUrl, getCustomerAuthRuntime, getSupabasePublicConfig, safeNextPath } from "@/lib/supabase/config";
import { getSupabaseCustomer } from "@/lib/supabase/identity";

function request(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("Supabase customer authentication boundary", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("AUTH_RUNTIME", "supabase");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test-only");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost");
    for (const stub of Object.values(auth)) stub.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("fails closed when Supabase configuration is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NOT_CONFIGURED");
    expect(getSupabasePublicConfig()).toBeNull();
    const response = await login(request("/api/auth/login", { email: "person@example.test", password: "correct horse battery staple" }));
    expect(response.status).toBe(503);
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("validates registration before invoking the provider", async () => {
    const response = await register(request("/api/auth/register", { email: "person@example.test", password: "correct horse battery staple", passwordConfirmation: "different password" }));
    expect(response.status).toBe(400);
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("creates an email-verification registration without inventing a local session", async () => {
    auth.signUp.mockResolvedValue({ data: { user: { id: "auth-user", email: "person@example.test" }, session: null }, error: null });
    const response = await register(request("/api/auth/register", { displayName: "Test Person", email: "Person@Example.test", password: "correct horse battery staple", passwordConfirmation: "correct horse battery staple" }));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ verificationRequired: true });
    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: "person@example.test", options: expect.objectContaining({ emailRedirectTo: "http://localhost/auth/callback?next=%2Faccount" }) }));
  });

  it("returns a controlled login error rather than provider details", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { status: 400, message: "provider-specific detail" } });
    const response = await login(request("/api/auth/login", { email: "person@example.test", password: "correct horse battery staple" }));
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain("provider-specific detail");
  });

  it("converts provider transport failures into controlled unavailable responses", async () => {
    auth.signInWithPassword.mockRejectedValue(new Error("socket and credential detail"));
    const response = await login(request("/api/auth/login", { email: "person@example.test", password: "correct horse battery staple" }));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("socket and credential detail");
  });

  it("fails closed when server-side identity verification cannot reach Supabase", async () => {
    auth.getUser.mockRejectedValue(new Error("provider transport detail"));
    await expect(getSupabaseCustomer(new Request("http://localhost/api/account/profile"))).resolves.toBeNull();
  });

  it("keeps OAuth and callback redirects on the configured application origin", async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.google.test/authorize" }, error: null });
    const oauthResponse = await google(request("/api/auth/oauth/google", { next: "//attacker.example/path" }));
    expect(oauthResponse.status).toBe(200);
    expect(auth.signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ redirectTo: "http://localhost/auth/callback?next=%2Faccount" }) }));

    auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    const callbackResponse = await callback(new Request("http://localhost/auth/callback?code=test-code&next=https://attacker.example"));
    expect(callbackResponse.headers.get("location")).toBe("http://localhost/account");

    auth.exchangeCodeForSession.mockRejectedValue(new Error("provider callback detail"));
    const failedCallback = await callback(new Request("http://localhost/auth/callback?code=test-code"));
    expect(failedCallback.headers.get("location")).toBe("http://localhost/account/login?error=auth_callback");
  });

  it("normalizes runtime and redirect helpers", () => {
    expect(getCustomerAuthRuntime()).toBe("supabase");
    expect(safeNextPath("/account/orders")).toBe("/account/orders");
    expect(safeNextPath("\\attacker.example")).toBe("/account");
    expect(authRedirectUrl("http://ignored.test", "/auth/callback")).toBe("http://localhost/auth/callback");
  });
});
