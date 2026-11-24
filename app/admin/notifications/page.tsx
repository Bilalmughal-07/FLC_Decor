import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { requirePersistentAdminPermission } from "@/lib/admin-auth";
import { listNotificationOperations } from "@/lib/notification-service";
import { NotificationQueueClient } from "./notification-queue-client";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const requestHeaders = await headers();
  const request = new Request("http://internal.local/admin/notifications", { headers: { cookie: requestHeaders.get("cookie") ?? "" } });
  if (!(await requirePersistentAdminPermission(request, "notifications.read"))) redirect("/admin/login");
  const data = await listNotificationOperations(1);
  return <PageShell><div className="admin-page"><div className="admin-top"><div><p className="eyebrow">FLC Decor / Admin</p><h1>Notification operations.</h1></div><span className="admin-lock">Database session · MFA verified</span></div><NotificationQueueClient events={data.outbox.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() }))} /></div></PageShell>;
}
