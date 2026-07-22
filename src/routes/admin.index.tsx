import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Loader2, AlertCircle, ArrowRight, Plus, FileText, Package,
  ShoppingCart, AlertTriangle
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
});

type Metrics = {
  today_sales: number;
  month_revenue: number;
  total_orders: number;
  pending_orders: number;
  in_production: number;
  completed_orders: number;
  delivered_orders: number;
  total_customers: number;
  total_products: number;
  pending_quotes: number;
  open_tickets: number;
  pending_reviews: number;
  low_stock_count: number;
  unread_notifications: number;
};

type RecentOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
};

type RecentPayment = {
  id: string;
  amount: number;
  method: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  orders: { order_number: string } | null;
};

type Activity = {
  id: string;
  actor_name: string | null;
  summary: string;
  entity: string;
  created_at: string;
};

type LowStock = {
  id: string;
  sku: string;
  color: string | null;
  size: string | null;
  stock_qty: number;
  low_stock_at: number;
  products: { name: string; slug: string } | null;
};

type ProductionRow = {
  stage: string;
  count: number;
};

const STAGE_LABELS: Record<string, string> = {
  artwork_received: "Artwork received",
  artwork_approval: "Artwork approval",
  printing: "Printing",
  embroidery: "Embroidery",
  laser_engraving: "Laser engraving",
  packaging: "Packaging",
  quality_check: "Quality check",
  ready: "Ready",
  delivered: "Delivered",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  quotation_requested: "Quote requested",
  quotation_approved: "Quote approved",
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  artwork_review: "Artwork review",
  in_production: "In production",
  quality_check: "Quality check",
  packaging: "Packaging",
  ready: "Ready",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

function kes(n: number) {
  return `KSh ${Number(n).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

async function fetchMetrics(): Promise<Metrics> {
  const { data, error } = await supabase.rpc("admin_dashboard_metrics");
  if (error) throw error;
  return data as Metrics;
}

async function fetchRecentOrders(): Promise<RecentOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, total, status, created_at")
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) throw error;
  return (data ?? []) as RecentOrder[];
}

async function fetchRecentPayments(): Promise<RecentPayment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("id, amount, method, status, paid_at, created_at, orders(order_number)")
    .order("created_at", { ascending: false })
    .limit(6);
  if (error) throw error;
  return (data ?? []) as unknown as RecentPayment[];
}

async function fetchActivity(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, actor_name, summary, entity, created_at")
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) throw error;
  return (data ?? []) as Activity[];
}

async function fetchLowStock(): Promise<LowStock[]> {
  const { data, error } = await supabase
    .from("product_variants")
    .select("id, sku, color, size, stock_qty, low_stock_at, products(name, slug)")
    .eq("is_active", true)
    .order("stock_qty", { ascending: true })
    .limit(50);
  if (error) throw error;

  const rows = (data ?? []) as unknown as LowStock[];
  return rows.filter((r) => r.stock_qty <= r.low_stock_at).slice(0, 6);
}

async function fetchProduction(): Promise<ProductionRow[]> {
  const { data, error } = await supabase
    .from("production_jobs")
    .select("stage")
    .neq("stage", "delivered");
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { stage: string }[]) {
    counts.set(row.stage, (counts.get(row.stage) ?? 0) + 1);
  }
  return Array.from(counts, ([stage, count]) => ({ stage, count })).sort(
    (a, b) => b.count - a.count
  );
}

function DashboardPage() {
  const metrics = useQuery({ queryKey: ["admin", "metrics"], queryFn: fetchMetrics });
  const orders = useQuery({ queryKey: ["admin", "recent-orders"], queryFn: fetchRecentOrders });
  const payments = useQuery({ queryKey: ["admin", "recent-payments"], queryFn: fetchRecentPayments });
  const activity = useQuery({ queryKey: ["admin", "activity"], queryFn: fetchActivity });
  const lowStock = useQuery({ queryKey: ["admin", "low-stock"], queryFn: fetchLowStock });
  const production = useQuery({ queryKey: ["admin", "production"], queryFn: fetchProduction });

  if (metrics.isLoading) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-brand-navy" />
      </div>
    );
  }

  if (metrics.isError) {
    return (
      <div className="m-4 max-w-lg border-2 border-brand-orange bg-brand-orange/10 p-6 rounded-xl shadow-[4px_4px_0_0_rgba(10,37,64,1)]">
        <AlertCircle className="h-6 w-6 text-brand-orange" />
        <h2 className="mt-3 text-lg font-bold text-brand-navy">Could not load metrics</h2>
        <p className="mt-1.5 text-xs font-semibold text-brand-navy/70">
          {(metrics.error as Error).message}
        </p>
      </div>
    );
  }

  const m = metrics.data!;

  return (
    <div className="space-y-8 sm:space-y-12 max-w-full overflow-hidden">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-brand-navy pb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-brand-navy sm:text-3xl lg:text-4xl">
            Dashboard
          </h1>
          <p className="mt-1 text-xs font-bold text-brand-navy/60">
            {new Date().toLocaleDateString("en-KE", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <QuickActions />
      </header>

      <MoneyRow m={m} />
      <OrderPipeline m={m} />

      <div className="grid gap-8 xl:grid-cols-[1.35fr_1fr]">
        <RecentOrders query={orders} />
        <div className="space-y-8">
          <ProductionPanel query={production} />
          <LowStockPanel query={lowStock} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <RecentPayments query={payments} />
        <ActivityFeed query={activity} />
      </div>

      <AttentionRow m={m} />
    </div>
  );
}

function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
      <Link
        to="/admin/products"
        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-brand-navy px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-brand-orange border-2 border-brand-navy"
      >
        <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
        Product
      </Link>
      <Link
        to="/admin/orders"
        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 border-2 border-brand-navy px-4 py-2.5 text-xs font-black uppercase tracking-widest text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
      >
        <ShoppingCart className="h-3.5 w-3.5 stroke-[2.5]" />
        Orders
      </Link>
      <Link
        to="/admin/quotes"
        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 border-2 border-brand-navy px-4 py-2.5 text-xs font-black uppercase tracking-widest text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
      >
        <FileText className="h-3.5 w-3.5 stroke-[2.5]" />
        Quotes
      </Link>
    </div>
  );
}

function MoneyRow({ m }: { m: Metrics }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { k: kes(m.today_sales), v: "Sales today", accent: true },
        { k: kes(m.month_revenue), v: "Revenue this month", accent: true },
        { k: String(m.total_orders), v: "Orders, all time", accent: false },
        { k: String(m.total_customers), v: "Registered customers", accent: false },
      ].map((s) => (
        <div 
          key={s.v} 
          className="bg-white p-5 sm:p-6 rounded-xl border-2 border-brand-navy shadow-[4px_4px_0_0_rgba(10,37,64,1)]"
        >
          <div
            className={`text-2xl sm:text-3xl font-black tabular-nums tracking-tight truncate ${
              s.accent ? "text-brand-orange" : "text-brand-navy"
            }`}
          >
            {s.k}
          </div>
          <div className="mt-1.5 text-[10px] font-black uppercase tracking-wider text-brand-navy/50">
            {s.v}
          </div>
        </div>
      ))}
    </section>
  );
}

function OrderPipeline({ m }: { m: Metrics }) {
  const stages = [
    { k: m.pending_orders, v: "Pending", to: "/admin/orders" },
    { k: m.in_production, v: "In production", to: "/admin/production" },
    { k: m.delivered_orders, v: "Delivered", to: "/admin/orders" },
    { k: m.completed_orders, v: "Completed", to: "/admin/orders" },
    { k: m.total_products, v: "Active products", to: "/admin/products" },
    { k: m.pending_quotes, v: "Open quotes", to: "/admin/quotes" },
  ];

  return (
    <section className="space-y-4">
      <h2 className="border-b-2 border-brand-navy pb-3 text-xs font-black uppercase tracking-widest text-brand-navy">
        Pipeline
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {stages.map((s) => (
          <Link
            key={s.v}
            to={s.to as any}
            className="group rounded-xl border-2 border-brand-navy bg-white p-4 transition-all shadow-[2px_2px_0_0_rgba(10,37,64,1)] hover:shadow-[4px_4px_0_0_rgba(10,37,64,1)] hover:bg-brand-surface/10"
          >
            <div className="text-xl sm:text-2xl font-black tabular-nums text-brand-navy">
              {s.k}
            </div>
            <div className="mt-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-brand-navy/50">
              {s.v}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PanelHead({ title, to, cta }: { title: string; to?: string; cta?: string }) {
  return (
    <div className="flex items-end justify-between border-b-2 border-brand-navy pb-3 mb-4">
      <h2 className="text-xs font-black uppercase tracking-widest text-brand-navy">{title}</h2>
      {to && cta && (
        <Link
          to={to as any}
          className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-navy/60 transition-colors hover:text-brand-orange"
        >
          {cta}
          <ArrowRight className="h-3 w-3 stroke-[2.5]" />
        </Link>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-xs font-bold uppercase tracking-wider text-brand-navy/40">{text}</p>;
}

function Spinner() {
  return (
    <div className="grid place-items-center py-8">
      <Loader2 className="h-5 w-5 animate-spin text-brand-navy/50" />
    </div>
  );
}

function RecentOrders({ query }: { query: ReturnType<typeof useQuery<RecentOrder[]>> }) {
  return (
    <section className="rounded-xl border-2 border-brand-navy bg-white p-4 sm:p-6 shadow-[4px_4px_0_0_rgba(10,37,64,1)] overflow-hidden">
      <PanelHead title="Recent orders" to="/admin/orders" cta="All orders" />
      {query.isLoading ? (
        <Spinner />
      ) : !query.data || query.data.length === 0 ? (
        <Empty text="No orders yet." />
      ) : (
        <div className="w-full">
          {/* Mobile view (< 640px) */}
          <div className="block sm:hidden divide-y divide-brand-navy/10">
            {query.data.map((o) => (
              <div key={o.id} className="py-3.5 space-y-2">
                <div className="flex justify-between items-start">
                  <Link to="/admin/orders" className="font-mono text-xs font-black text-brand-orange">
                    {o.order_number}
                  </Link>
                  <span className="text-xs font-black text-brand-navy">
                    {kes(o.total)}
                  </span>
                </div>
                <div className="text-xs font-bold text-brand-navy/80 truncate max-w-37.5">
                  {o.customer_name}
                </div>
                <div className="flex justify-between items-center text-[10px] text-brand-navy/50 font-bold">
                  <span>{ago(o.created_at)}</span>
                  <span className="border border-brand-navy/20 px-1.5 py-0.5 font-black uppercase tracking-wider">
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/Tablet view (>= 640px) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-125">
              <thead>
                <tr className="border-b border-brand-navy/10 text-[10px] font-black uppercase tracking-widest text-brand-navy/40">
                  <th className="pb-2">Order</th>
                  <th className="pb-2 px-4">Customer</th>
                  <th className="pb-2 px-4">Status</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-navy/5">
                {query.data.map((o) => (
                  <tr key={o.id} className="hover:bg-brand-surface/20 transition-colors">
                    <td className="py-3 pr-4 align-middle">
                      <Link to="/admin/orders" className="font-mono text-xs font-bold text-brand-navy hover:text-brand-orange">
                        {o.order_number}
                      </Link>
                      <div className="text-[10px] text-brand-navy/40 font-medium">
                        {ago(o.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-xs font-bold text-brand-navy max-w-37.5 truncate">
                      {o.customer_name}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="inline-block border border-brand-navy/25 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-brand-navy/70 bg-brand-surface/40">
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-right align-middle text-xs font-black tabular-nums text-brand-navy">
                      {kes(o.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function ProductionPanel({ query }: { query: ReturnType<typeof useQuery<ProductionRow[]>> }) {
  const total = (query.data ?? []).reduce((sum, r) => sum + r.count, 0);

  return (
    <section className="rounded-xl border-2 border-brand-navy bg-white p-4 sm:p-6 shadow-[4px_4px_0_0_rgba(10,37,64,1)]">
      <PanelHead title="On the floor" to="/admin/production" cta="Queue" />
      {query.isLoading ? (
        <Spinner />
      ) : !query.data || query.data.length === 0 ? (
        <Empty text="Nothing in production." />
      ) : (
        <ul className="divide-y divide-brand-navy/5">
          {query.data.map((r) => (
            <li key={r.stage} className="flex items-center justify-between gap-4 py-3">
              <span className="text-xs font-bold text-brand-navy truncate max-w-35 sm:max-w-none">
                {STAGE_LABELS[r.stage] ?? r.stage}
              </span>
              <div className="flex items-center gap-3 shrink-0">
                <div className="h-2 w-16 sm:w-24 bg-brand-navy/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-orange"
                    style={{ width: `${total > 0 ? (r.count / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-6 text-right text-xs font-black tabular-nums text-brand-navy">
                  {r.count}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LowStockPanel({ query }: { query: ReturnType<typeof useQuery<LowStock[]>> }) {
  return (
    <section className="rounded-xl border-2 border-brand-navy bg-white p-4 sm:p-6 shadow-[4px_4px_0_0_rgba(10,37,64,1)]">
      <PanelHead title="Running low" to="/admin/products" cta="Inventory" />
      {query.isLoading ? (
        <Spinner />
      ) : !query.data || query.data.length === 0 ? (
        <Empty text="All stocks healthy." />
      ) : (
        <ul className="divide-y divide-brand-navy/5">
          {query.data.map((v) => (
            <li key={v.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-xs font-black text-brand-navy">
                  {v.products?.name ?? "Unlinked variant"}
                </div>
                <div className="mt-0.5 font-mono text-[9px] font-semibold text-brand-navy/40">
                  {v.sku}
                  {v.color ? ` · ${v.color}` : ""}
                  {v.size ? ` · ${v.size}` : ""}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className={`text-xs font-black tabular-nums ${
                    v.stock_qty === 0 ? "text-brand-orange" : "text-brand-navy"
                  }`}
                >
                  {v.stock_qty}
                </div>
                <div className="text-[9px] font-bold text-brand-navy/40">of {v.low_stock_at}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentPayments({ query }: { query: ReturnType<typeof useQuery<RecentPayment[]>> }) {
  return (
    <section className="rounded-xl border-2 border-brand-navy bg-white p-4 sm:p-6 shadow-[4px_4px_0_0_rgba(10,37,64,1)]">
      <PanelHead title="Money in" to="/admin/payments" cta="All payments" />
      {query.isLoading ? (
        <Spinner />
      ) : !query.data || query.data.length === 0 ? (
        <Empty text="No payments recorded." />
      ) : (
        <ul className="divide-y divide-brand-navy/5">
          {query.data.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-xs font-black text-brand-navy">
                    {p.orders?.order_number ?? "Unlinked"}
                  </span>
                  <span className="border border-brand-navy/25 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-brand-navy/50 bg-brand-surface/40">
                    {p.method}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] font-semibold text-brand-navy/45">
                  {ago(p.paid_at ?? p.created_at)}
                  {p.status !== "paid" ? ` · ${p.status}` : ""}
                </div>
              </div>
              <span
                className={`shrink-0 text-xs font-black tabular-nums ${
                  p.status === "paid" ? "text-brand-navy" : "text-brand-navy/40"
                }`}
              >
                {kes(p.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ActivityFeed({ query }: { query: ReturnType<typeof useQuery<Activity[]>> }) {
  return (
    <section className="rounded-xl border-2 border-brand-navy bg-white p-4 sm:p-6 shadow-[4px_4px_0_0_rgba(10,37,64,1)]">
      <PanelHead title="What happened" />
      {query.isLoading ? (
        <Spinner />
      ) : !query.data || query.data.length === 0 ? (
        <Empty text="No logged activity." />
      ) : (
        <ul className="divide-y divide-brand-navy/5">
          {query.data.map((a) => (
            <li key={a.id} className="flex items-start gap-3 py-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-orange" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-relaxed text-brand-navy wrap-break-word">{a.summary}</p>
                <p className="mt-0.5 text-[10px] font-bold text-brand-navy/45">
                  {a.actor_name ?? "System"} · {ago(a.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AttentionRow({ m }: { m: Metrics }) {
  const items = [
    { n: m.pending_quotes, label: "quotes waiting on a price", to: "/admin/quotes" },
    { n: m.pending_reviews, label: "reviews awaiting moderation", to: "/admin/reviews" },
    { n: m.open_tickets, label: "support tickets open", to: "/admin/support" },
    { n: m.low_stock_count, label: "variants below stock threshold", to: "/admin/products" },
  ].filter((i) => i.n > 0);

  if (items.length === 0) {
    return (
      <section className="rounded-xl border-2 border-brand-navy bg-white p-5 shadow-[4px_4px_0_0_rgba(10,37,64,1)]">
        <p className="text-xs font-black uppercase tracking-wider text-brand-navy/50">
          Nothing needs your attention. All operations green.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border-2 border-brand-orange bg-brand-orange/5 p-5 sm:p-6 shadow-[4px_4px_0_0_rgba(10,37,64,1)]">
      <div className="flex items-center gap-2 border-b border-brand-orange/20 pb-3 mb-4">
        <AlertTriangle className="h-5 w-5 text-brand-orange shrink-0" />
        <h2 className="text-xs font-black uppercase tracking-widest text-brand-navy">
          Needs your attention
        </h2>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.label}>
            <Link
              to={i.to as any}
              className="group inline-flex items-baseline gap-2 text-xs font-bold text-brand-navy transition-colors hover:text-brand-orange"
            >
              <span className="text-base sm:text-lg font-black tabular-nums text-brand-orange">{i.n}</span>
              <span>{i.label}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 self-center opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}