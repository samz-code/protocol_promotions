import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminHeader, AdminLoading, AdminError, StatCard, kes } from "@/lib/admin-ui";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics | Admin" }] }),
  component: AnalyticsPage,
});

type Bundle = {
  revenue: number;
  orderCount: number;
  avgOrder: number;
  paidCount: number;
  topProducts: { name: string; qty: number }[];
  statusCounts: { status: string; count: number }[];
  monthly: { month: string; total: number }[];
};

async function fetchAnalytics(): Promise<Bundle> {
  const { data: orders, error: oErr } = await supabase
    .from("orders")
    .select("id, total, status, created_at")
    .limit(2000);
  if (oErr) throw oErr;

  const { data: items } = await supabase
    .from("order_items")
    .select("quantity, products(name)")
    .limit(5000);

  const list = orders ?? [];
  const revenue = list.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const orderCount = list.length;
  const avgOrder = orderCount > 0 ? revenue / orderCount : 0;
  const paidCount = list.filter((o) => ["paid", "completed", "delivered"].includes(o.status)).length;

  // Top products by quantity
  const prodMap = new Map<string, number>();
  for (const it of (items ?? []) as any[]) {
    const name = it.products?.name ?? "Unknown";
    prodMap.set(name, (prodMap.get(name) ?? 0) + (it.quantity ?? 0));
  }
  const topProducts = Array.from(prodMap, ([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Status breakdown
  const statusMap = new Map<string, number>();
  for (const o of list) statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1);
  const statusCounts = Array.from(statusMap, ([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // Monthly revenue (last 6 months)
  const monthMap = new Map<string, number>();
  for (const o of list) {
    const d = new Date(o.created_at);
    const key = d.toLocaleDateString("en-KE", { month: "short", year: "2-digit" });
    monthMap.set(key, (monthMap.get(key) ?? 0) + Number(o.total ?? 0));
  }
  const monthly = Array.from(monthMap, ([month, total]) => ({ month, total })).slice(-6);

  return { revenue, orderCount, avgOrder, paidCount, topProducts, statusCounts, monthly };
}

function AnalyticsPage() {
  const query = useQuery({ queryKey: ["admin", "analytics"], queryFn: fetchAnalytics });

  if (query.isLoading) return <AdminLoading />;
  if (query.isError) return <AdminError message={(query.error as Error).message} />;

  const a = query.data!;
  const maxMonth = Math.max(1, ...a.monthly.map((m) => m.total));
  const maxProd = Math.max(1, ...a.topProducts.map((p) => p.qty));

  return (
    <div className="space-y-10">
      <AdminHeader title="Analytics" subtitle="Derived from orders and line items." />

      <div className="grid gap-px border border-brand-navy/15 bg-brand-navy/15 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={kes(a.revenue)} label="Total revenue" accent />
        <StatCard value={String(a.orderCount)} label="Orders" />
        <StatCard value={kes(a.avgOrder)} label="Average order" />
        <StatCard value={String(a.paidCount)} label="Paid / fulfilled" />
      </div>

      <section>
        <h2 className="border-b-2 border-brand-navy pb-4 text-xl font-extrabold tracking-tight text-brand-navy">Revenue by month</h2>
        {a.monthly.length === 0 ? (
          <p className="py-8 text-sm text-brand-navy/45">No order data yet.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {a.monthly.map((m) => (
              <div key={m.month} className="flex items-center gap-4">
                <span className="w-16 text-xs font-bold uppercase tracking-wide text-brand-navy/60">{m.month}</span>
                <div className="flex-1 h-6 bg-brand-navy/10">
                  <div className="h-full bg-brand-orange" style={{ width: `${(m.total / maxMonth) * 100}%` }} />
                </div>
                <span className="w-28 text-right text-sm font-bold tabular-nums text-brand-navy">{kes(m.total)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="border-b-2 border-brand-navy pb-4 text-xl font-extrabold tracking-tight text-brand-navy">Top products</h2>
          {a.topProducts.length === 0 ? (
            <p className="py-8 text-sm text-brand-navy/45">No line items yet.</p>
          ) : (
            <ul className="mt-6 space-y-3">
              {a.topProducts.map((p) => (
                <li key={p.name} className="flex items-center gap-4">
                  <span className="flex-1 truncate text-sm font-semibold text-brand-navy">{p.name}</span>
                  <div className="w-32 h-4 bg-brand-navy/10">
                    <div className="h-full bg-brand-navy" style={{ width: `${(p.qty / maxProd) * 100}%` }} />
                  </div>
                  <span className="w-12 text-right text-sm font-bold tabular-nums text-brand-navy">{p.qty}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="border-b-2 border-brand-navy pb-4 text-xl font-extrabold tracking-tight text-brand-navy">Orders by status</h2>
          {a.statusCounts.length === 0 ? (
            <p className="py-8 text-sm text-brand-navy/45">No orders yet.</p>
          ) : (
            <ul className="mt-6 divide-y divide-brand-navy/10">
              {a.statusCounts.map((s) => (
                <li key={s.status} className="flex items-center justify-between py-3">
                  <span className="text-sm font-semibold text-brand-navy capitalize">{s.status.replace(/_/g, " ")}</span>
                  <span className="text-sm font-black tabular-nums text-brand-navy">{s.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
