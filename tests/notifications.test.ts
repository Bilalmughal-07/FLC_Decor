import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { escapeNotificationHtml, notificationEventTypes, renderNotification } from "@/lib/notification-catalog";
import { clearDevelopmentNotificationInbox, createNotificationProvider, developmentNotificationInbox } from "@/lib/notification-provider";

describe("notification catalog and development provider", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("NOTIFICATION_RUNTIME", "development-memory");
    clearDevelopmentNotificationInbox();
  });
  afterEach(() => { clearDevelopmentNotificationInbox(); vi.unstubAllEnvs(); });

  it("renders every catalog event with text and escaped HTML", () => {
    const payloads: Record<string, Record<string, string>> = {
      WELCOME_CUSTOMER: { displayName: "<script>alert(1)</script>" },
      ORDER_PLACED: { orderNumber: "FL-TEST-1" },
      ORDER_CONFIRMED: { orderNumber: "FL-TEST-1" },
      ORDER_STATUS_CHANGED: { orderNumber: "FL-TEST-1", status: "<img src=x onerror=alert(1)>" },
      ORDER_DISPATCHED: { orderNumber: "FL-TEST-1" },
      ORDER_CANCELLED: { orderNumber: "FL-TEST-1" },
      ADMIN_NEW_ORDER: { orderNumber: "FL-TEST-1" },
      ADMIN_DELIVERY_FAILURE: { failedEventType: "ORDER_PLACED" },
    };
    for (const eventType of notificationEventTypes) {
      const rendered = renderNotification(eventType, payloads[eventType]);
      expect(rendered.subject).toBeTruthy();
      expect(rendered.text).toBeTruthy();
      expect(rendered.html).not.toContain("<script>");
      expect(rendered.html).not.toContain("<img src=x");
    }
    expect(escapeNotificationHtml(`<&>'"`)).toBe("&lt;&amp;&gt;&#39;&quot;");
  });

  it("restricts links to the configured application origin", () => {
    expect(renderNotification("ORDER_PLACED", { orderNumber: "FL-TEST-1" }).html).toContain("http://localhost:3000/track-order");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "javascript:alert(1)");
    expect(() => renderNotification("ORDER_PLACED", { orderNumber: "FL-TEST-1" })).toThrow("INVALID_NOTIFICATION_LINK_ORIGIN");
  });

  it("deduplicates development delivery and never selects it in production", async () => {
    const provider = createNotificationProvider();
    const message = renderNotification("ORDER_PLACED", { orderNumber: "FL-TEST-1" });
    const first = await provider.send({ recipient: "synthetic@example.test", message, dedupeKey: "test:one" });
    const second = await provider.send({ recipient: "synthetic@example.test", message, dedupeKey: "test:one" });
    expect(second.providerMessageId).toBe(first.providerMessageId);
    expect(developmentNotificationInbox()).toHaveLength(1);
    vi.stubEnv("NODE_ENV", "production");
    await expect(createNotificationProvider().send({ recipient: "synthetic@example.test", message, dedupeKey: "test:two" })).rejects.toMatchObject({ category: "PROVIDER_NOT_CONFIGURED" });
  });
});
