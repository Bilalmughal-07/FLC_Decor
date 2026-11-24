export const notificationEventTypes = [
  "WELCOME_CUSTOMER",
  "ORDER_PLACED",
  "ORDER_CONFIRMED",
  "ORDER_STATUS_CHANGED",
  "ORDER_DISPATCHED",
  "ORDER_CANCELLED",
  "ADMIN_NEW_ORDER",
  "ADMIN_DELIVERY_FAILURE",
] as const;

export type NotificationEventType = typeof notificationEventTypes[number];
export type NotificationMessage = { subject: string; text: string; html: string };

type Payload = Record<string, unknown>;

export function escapeNotificationHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function required(payload: Payload, key: string, max = 200) {
  const value = payload[key];
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("INVALID_NOTIFICATION_PAYLOAD");
  return value.trim();
}

function optional(payload: Payload, key: string, max = 200) {
  const value = payload[key];
  if (value == null) return null;
  if (typeof value !== "string" || value.length > max) throw new Error("INVALID_NOTIFICATION_PAYLOAD");
  return value.trim() || null;
}

function applicationLink(pathname: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured || configured === "NOT_CONFIGURED") return null;
  const origin = new URL(configured);
  if (origin.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && origin.protocol === "http:")) throw new Error("INVALID_NOTIFICATION_LINK_ORIGIN");
  return new URL(pathname, origin.origin).toString();
}

function message(subject: string, lead: string, detail: string, linkPath?: string): NotificationMessage {
  const link = linkPath ? applicationLink(linkPath) : null;
  const text = [lead, detail, link ? `Open: ${link}` : null].filter(Boolean).join("\n\n");
  const safeSubject = escapeNotificationHtml(subject);
  const safeLead = escapeNotificationHtml(lead);
  const safeDetail = escapeNotificationHtml(detail);
  const safeLink = link ? escapeNotificationHtml(link) : null;
  const html = `<h1>${safeSubject}</h1><p>${safeLead}</p><p>${safeDetail}</p>${safeLink ? `<p><a href="${safeLink}">View securely on FLC Decor</a></p>` : ""}`;
  return { subject, text, html };
}

export function isNotificationEventType(value: string): value is NotificationEventType {
  return (notificationEventTypes as readonly string[]).includes(value);
}

export function renderNotification(eventType: NotificationEventType, payload: Payload): NotificationMessage {
  switch (eventType) {
    case "WELCOME_CUSTOMER": {
      const name = optional(payload, "displayName", 120);
      return message("Welcome to FLC Decor", name ? `Welcome, ${name}.` : "Welcome to FLC Decor.", "Your customer account is ready.", "/account");
    }
    case "ORDER_PLACED": {
      const orderNumber = required(payload, "orderNumber", 80);
      return message(`Order ${orderNumber} received`, "Thank you. We received your cash-on-delivery order.", "Payment remains pending until the approved collection step. We will notify you when the order status changes.", `/track-order?order=${encodeURIComponent(orderNumber)}`);
    }
    case "ORDER_CONFIRMED": {
      const orderNumber = required(payload, "orderNumber", 80);
      return message(`Order ${orderNumber} confirmed`, "Your order has been confirmed.", "Preparation is underway. No online payment has been recorded for this cash-on-delivery order.", `/track-order?order=${encodeURIComponent(orderNumber)}`);
    }
    case "ORDER_STATUS_CHANGED": {
      const orderNumber = required(payload, "orderNumber", 80);
      const status = required(payload, "status", 80);
      return message(`Order ${orderNumber} updated`, "Your order status changed.", `Current status: ${status}.`, `/track-order?order=${encodeURIComponent(orderNumber)}`);
    }
    case "ORDER_DISPATCHED": {
      const orderNumber = required(payload, "orderNumber", 80);
      return message(`Order ${orderNumber} dispatched`, "Your order has left our workshop.", "Courier tracking is shown only when an approved courier integration supplies it.", `/track-order?order=${encodeURIComponent(orderNumber)}`);
    }
    case "ORDER_CANCELLED": {
      const orderNumber = required(payload, "orderNumber", 80);
      return message(`Order ${orderNumber} cancelled`, "The order has been cancelled.", "If this was unexpected, contact FLC Decor through the contact details published on the website.", "/contact");
    }
    case "ADMIN_NEW_ORDER": {
      const orderNumber = required(payload, "orderNumber", 80);
      return message(`New order ${orderNumber}`, "A new order needs review.", "Open the protected administrator workspace to review it.", "/admin");
    }
    case "ADMIN_DELIVERY_FAILURE": {
      const event = required(payload, "failedEventType", 100);
      return message("Notification delivery needs review", `Delivery failed for ${event}.`, "Inspect the protected notification queue before retrying.", "/admin/notifications");
    }
  }
}
