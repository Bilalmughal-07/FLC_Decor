import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { formatPrice } from "@/lib/catalog";
import { requirePersistentAdminPermission } from "@/lib/admin-auth";
import { salesAnalytics } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const requestHeaders = await headers();
  const request = new Request("http://internal.local/admin/analytics", { headers: { cookie: requestHeaders.get("cookie") ?? "" } });
  if (!(await requirePersistentAdminPermission(request, "analytics.read"))) redirect("/admin/login");
  const params = await searchParams;
  const data = await salesAnalytics(params.from ?? null, params.to ?? null);
  return <PageShell><div className="admin-page"><div className="admin-top"><div><p className="eyebrow">FLC Decor / Admin</p><h1>Sales and stock.</h1></div><span className="admin-lock">Database aggregates · MFA verified</span></div><form className="standalone-form" action="/admin/analytics"><div className="form-grid"><label>From<input type="date" name="from" defaultValue={params.from} /></label><label>To<input type="date" name="to" defaultValue={params.to} /></label></div><button className="button button-dark">Apply range</button></form><div className="admin-stats"><div><span>Orders</span><strong>{data.orders}</strong></div><div><span>Collected revenue</span><strong>{formatPrice(data.collectedRevenueMinor)}</strong></div><div><span>Placed value</span><strong>{formatPrice(data.placedValueMinor)}</strong></div><div><span>Low / sold out</span><strong>{data.inventory.lowStock} / {data.inventory.soldOut}</strong></div></div><section className="admin-panel"><h2>Definitions</h2><p><strong>Collected revenue:</strong> {data.definitions.collectedRevenue}.</p><p><strong>Placed value:</strong> {data.definitions.placedValue}.</p>{Object.entries(data.statuses).map(([status, count]) => <div className="admin-row" key={status}><strong>{status}</strong><span>{count}</span></div>)}</section></div></PageShell>;
}
