import { describe, expect, it } from "vitest";
import { canAccessCustomerResource, checkSameOrigin, createRecoveryCodes, currentSession, loginCustomer, registerCustomer, requireCustomer, sessionCookie, validatePassword } from "@/lib/auth";

describe("local authentication boundary", () => {
  it("accepts only local loopback aliases in development", () => {
    expect(checkSameOrigin(new Request("http://localhost:3100/api/checkout/orders", { headers: { origin: "http://127.0.0.1:3100" } }))).toBe(true);
    expect(checkSameOrigin(new Request("http://localhost:3100/api/checkout/orders", { headers: { origin: "http://evil.example:3100" } }))).toBe(false);
  });
  it("uses a memory-hard encoded password and issues a revocable httpOnly session", () => {
    const previous = process.env.AUTH_RUNTIME; process.env.AUTH_RUNTIME = "demo";
    const email = `customer-${Date.now()}@example.test`;
    const created = registerCustomer(email, "a-strong-demo-password");
    expect(created.kind).toBe("created");
    if (created.kind !== "created") return;
    expect(created.user.role).toBe("CUSTOMER");
    expect(created.user.passwordHash.startsWith("scrypt$")).toBe(true);
    const login = loginCustomer(email, "a-strong-demo-password");
    expect(login.kind).toBe("authenticated");
    if (login.kind !== "authenticated") return;
    const cookie = sessionCookie(login.token);
    expect(cookie.options.httpOnly).toBe(true);
    const request = new Request("http://localhost/account", { headers: { cookie: `${cookie.name}=${cookie.value}` } });
    expect(currentSession(request)?.user.email).toBe(email);
    process.env.AUTH_RUNTIME = previous;
  });

  it("rejects weak passwords and produces one-time recovery-code hashes", () => {
    expect(validatePassword("short")).toBe(false);
    const user = { id: "demo", email: "demo@example.test", passwordHash: "scrypt$invalid$invalid", role: "CUSTOMER" as const, mfaEnabled: false, recoveryCodeHashes: [], createdAt: new Date().toISOString() };
    const codes = createRecoveryCodes(user);
    expect(codes).toHaveLength(8);
    expect(user.recoveryCodeHashes).toHaveLength(8);
    expect(user.recoveryCodeHashes).not.toContain(codes[0]);
  });

  it("binds customer access to the authenticated session rather than a client owner id", () => {
    process.env.AUTH_RUNTIME = "demo";
    const first = registerCustomer(`owner-${Date.now()}@example.test`, "a-strong-demo-password");
    const second = registerCustomer(`other-${Date.now()}@example.test`, "a-strong-demo-password");
    expect(first.kind).toBe("created");
    expect(second.kind).toBe("created");
    if (first.kind !== "created" || second.kind !== "created") return;
    const login = loginCustomer(first.user.email, "a-strong-demo-password");
    expect(login.kind).toBe("authenticated");
    if (login.kind !== "authenticated") return;
    const request = new Request("http://localhost/api/account/orders", { headers: { cookie: `${sessionCookie(login.token).name}=${login.token}` } });
    expect(requireCustomer(request)?.user.id).toBe(first.user.id);
    expect(canAccessCustomerResource(request, first.user.id)).toBe(true);
    expect(canAccessCustomerResource(request, second.user.id)).toBe(false);
  });
});
