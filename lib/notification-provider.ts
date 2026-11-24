import { randomUUID } from "node:crypto";
import type { NotificationMessage } from "@/lib/notification-catalog";

export type NotificationSend = { recipient: string; message: NotificationMessage; dedupeKey: string };
export type NotificationSendResult = { providerMessageId: string };
export interface NotificationProvider { readonly code: string; send(input: NotificationSend): Promise<NotificationSendResult>; }

type DevelopmentDelivery = NotificationSend & NotificationSendResult & { acceptedAt: string };
const runtime = globalThis as typeof globalThis & { __flcDevelopmentNotifications?: Map<string, DevelopmentDelivery> };
const inbox = runtime.__flcDevelopmentNotifications ?? (runtime.__flcDevelopmentNotifications = new Map());

export class NotificationProviderError extends Error {
  constructor(readonly category: string) { super(category); this.name = "NotificationProviderError"; }
}

export function createNotificationProvider(): NotificationProvider {
  if (process.env.NODE_ENV === "production" || process.env.NOTIFICATION_RUNTIME !== "development-memory") {
    return { code: "disabled", async send() { throw new NotificationProviderError("PROVIDER_NOT_CONFIGURED"); } };
  }
  return {
    code: "development-memory",
    async send(input) {
      const prior = inbox.get(input.dedupeKey);
      if (prior) return { providerMessageId: prior.providerMessageId };
      const delivery = { ...input, providerMessageId: `dev-${randomUUID()}`, acceptedAt: new Date().toISOString() };
      inbox.set(input.dedupeKey, delivery);
      return { providerMessageId: delivery.providerMessageId };
    },
  };
}

export function developmentNotificationInbox() {
  if (process.env.NODE_ENV === "production") return [];
  return [...inbox.values()];
}

export function clearDevelopmentNotificationInbox() {
  if (process.env.NODE_ENV !== "production") inbox.clear();
}
