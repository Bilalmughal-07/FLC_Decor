import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/admin/media/route";

describe("admin media route", () => {
  it("rejects upload before reading a file when admin MFA is absent", async () => {
    const form = new FormData();
    form.set("file", new File(["not an image"], "fake.jpg", { type: "image/jpeg" }));
    const response = await POST(new Request("http://localhost/api/admin/media", { method: "POST", body: form, headers: { origin: "http://localhost" } }));
    expect(response.status).toBe(401);
  });
});
