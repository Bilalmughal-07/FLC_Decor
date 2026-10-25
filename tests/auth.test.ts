import { describe, expect, it } from "vitest";
import { createRecoveryCodes, currentSession, loginCustomer, registerCustomer, sessionCookie, validatePassword } from "@/lib/auth";

describe("local authentication boundary", () => {
  it("uses a memory-hard encoded password and issues a revocable httpOnly session", () => {
    const previous = process.env.AUTH_RUNTIME; process.env.AUTH_RUNTIME = "demo";
    const email = `customer-${Date.now()}@example.test`;
    const created = registerCustomer(email, "a-strong-demo-password");
    expect(created.kind).toBe("created");
    if (created.kind !== "created") return;
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
});
