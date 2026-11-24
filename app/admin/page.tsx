import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { listDemoOrders } from "@/lib/demo-store";
import { formatPrice } from "@/lib/catalog";
import { requirePersistentAdminPermission } from "@/lib/admin-auth";
import { adminDashboard, listAdminOrders } from "@/lib/admin-store";
import { AdminLogoutButton } from "./admin-logout-button";
import { AdminWorkbench } from "./admin-workbench";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const requestHeaders = await headers();
  const request = new Request("http://internal.local/admin", {
    headers: { cookie: requestHeaders.get("cookie") ?? "" },
  });
  if (!(await requirePersistentAdminPermission(request, "orders.read")))
    redirect("/admin/login");
  const databaseMode = Boolean(process.env.DATABASE_URL);
  const [dashboard, databaseOrders] = databaseMode
    ? await Promise.all([adminDashboard(), listAdminOrders(1)])
    : [null, null];
  const orders =
    databaseOrders?.orders.map((order) => ({
      id: order.id,
      publicOrderNumber: order.publicOrderNumber,
      email: order.guestEmailNormalized,
      createdAt: order.createdAt.toISOString(),
      subtotal: order.subtotalMinor,
      status: order.status,
    })) ?? listDemoOrders();
  return (
    <PageShell>
      <div className="admin-page">
        <div className="admin-top">
          <div>
            <p className="eyebrow">FLC Decor / Admin</p>
            <h1>Control the details.</h1>
          </div>
          <span className="admin-lock">Database session · MFA verified</span>
        </div>
        <div className="admin-session-toolbar">
          <span>Protected administrator workspace</span>
          <AdminLogoutButton />
        </div>
        <div className="admin-stats">
          <div>
            <span>Catalog pieces</span>
            <strong>{dashboard?.products ?? 6}</strong>
          </div>
          <div>
            <span>Draft products</span>
            <strong>{dashboard?.drafts ?? "?"}</strong>
          </div>
          <div>
            <span>Orders</span>
            <strong>{dashboard?.orders ?? orders.length}</strong>
          </div>
          <div>
            <span>Pending outbox</span>
            <strong>{dashboard?.outboxPending ?? "?"}</strong>
          </div>
        </div>
        <div className="admin-grid">
          <section className="admin-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Orders</p>
                <h2>Recent activity</h2>
              </div>
              <span className="status-pill">Database</span>
            </div>
            {orders.length ? (
              orders.map((order) => (
                <div className="admin-row" key={order.id}>
                  <div>
                    <strong>{order.publicOrderNumber}</strong>
                    <small>
                      {order.email} ·{" "}
                      {new Date(order.createdAt).toLocaleString("en-PK")}
                    </small>
                  </div>
                  <span>{formatPrice(order.subtotal)}</span>
                  <span className="status-pill">{order.status}</span>
                </div>
              ))
            ) : (
              <p className="empty-copy">
                No orders yet.
              </p>
            )}
          </section>
          <section className="admin-panel">
            <p className="eyebrow">Controls</p>
            <h2>Operations</h2>
            <div className="admin-links">
              <Link href="/shop">Preview storefront ↗</Link>
              <Link href="/shipping">Configure shipping policy →</Link>
              <Link href="/contact">View public contact →</Link>
              <Link href="/custom-orders">View custom inquiries →</Link>
              <Link href="/admin/notifications">Notification operations →</Link>
              <Link href="/admin/customers">Customer accounts →</Link>
              <Link href="/admin/analytics">Sales and stock analytics →</Link>
            </div>
          </section>
        </div>
        {databaseMode ? <AdminWorkbench /> : null}
      </div>
    </PageShell>
  );
}
