import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { requirePersistentAdminPermission } from "@/lib/admin-auth";
import { listAdminCustomers } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const requestHeaders = await headers();
  const request = new Request("http://internal.local/admin/customers", { headers: { cookie: requestHeaders.get("cookie") ?? "" } });
  if (!(await requirePersistentAdminPermission(request, "customers.read"))) redirect("/admin/login");
  const params = await searchParams;
  const data = await listAdminCustomers(Number(params.page ?? "1"), params.q ?? "");
  return <PageShell><div className="admin-page"><div className="admin-top"><div><p className="eyebrow">FLC Decor / Admin</p><h1>Customer accounts.</h1></div><span className="admin-lock">Minimized view · MFA verified</span></div><form className="standalone-form" action="/admin/customers"><label>Search email<input type="search" name="q" defaultValue={params.q ?? ""} maxLength={120} /></label><button className="button button-dark">Search</button></form><section className="admin-panel"><div className="section-heading"><div><p className="eyebrow">{data.total} profiles</p><h2>Registered customers</h2></div></div>{data.customers.length ? data.customers.map((customer) => <div className="admin-row" key={customer.id}><div><strong>{customer.normalizedEmail ?? "Email unavailable"}</strong><small>Created {customer.createdAt.toLocaleDateString("en-PK")}</small></div><span>{customer._count.orders} orders</span><span>{customer._count.addresses} addresses</span><span className="status-pill">{customer.status}</span></div>) : <p className="empty-copy">No customer profiles match this search.</p>}</section></div></PageShell>;
}
