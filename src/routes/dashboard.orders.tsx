import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/orders")({
  head: () => ({ meta: [{ title: "Orders — Client Dashboard" }, { name: "robots", content: "noindex" }] }),
  component: OrdersPage,
});

type OrderRow = {
  id: string;
  order_number: string;
  item_name: string;
  status: string;
  total: number;
  created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  production: "bg-brand-blue/10 text-brand-blue",
  ready: "bg-brand-orange/10 text-brand-orange",
  delivered: "bg-green-100 text-green-700",
  pending: "bg-muted text-muted-foreground",
};

const FILTERS = ["All", "Production", "Ready", "Delivered"] as const;

async function fetchOrders(userId: string): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, item_name, status, total, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatKsh(num: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(num);
}

function OrdersPage() {
  const { session } = useAuth();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [query, setQuery] = useState("");

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ["dashboard-orders", session?.user?.id],
    queryFn: () => fetchOrders(session!.user.id),
    enabled: !!session?.user?.id,
  });

  const filtered = (orders ?? []).filter((o) => {
    const matchesFilter = filter === "All" || o.status.toLowerCase() === filter.toLowerCase();
    const matchesQuery = (o.order_number + o.item_name).toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  return (
    <>
      {/* Page Header Section */}
      <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-brand-navy">Orders</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Track production fulfillment timelines and delivery updates.</p>
        </div>
      </div>

      {/* Control Block and Data Table */}
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="p-5 flex flex-wrap items-center gap-3 border-b border-border bg-white">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  filter === f ? "bg-brand-navy text-white" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="sm:ml-auto relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search order ID or item"
              className="pl-9 pr-3 py-2 w-full sm:w-64 rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-brand-navy" />
            <p className="text-xs text-muted-foreground">Loading orders...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center px-5">
            <p className="text-sm font-semibold text-brand-navy">Failed to load orders</p>
            <p className="text-xs text-muted-foreground mt-1">
              {error instanceof Error ? error.message : "Please try again shortly."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground bg-muted/20 border-b border-border/50">
                  <th className="py-3 pl-5 whitespace-nowrap">Order</th>
                  <th className="whitespace-nowrap">Item</th>
                  <th className="whitespace-nowrap">Date</th>
                  <th className="whitespace-nowrap">Status</th>
                  <th className="pr-5 text-right whitespace-nowrap">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 pl-5 font-mono text-xs">{o.order_number}</td>
                    <td className="pr-4 min-w-50">{o.item_name}</td>
                    <td className="text-muted-foreground whitespace-nowrap">{formatDate(o.created_at)}</td>
                    <td className="whitespace-nowrap">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[o.status.toLowerCase()] ?? STATUS_STYLE.pending}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="pr-5 text-right font-semibold whitespace-nowrap">{formatKsh(o.total)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-muted-foreground text-sm bg-white">
                      No orders match that search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-sm text-muted-foreground px-1">
        Need to order this again?{" "}
        <Link to="/dashboard/reorder" className="text-brand-blue font-semibold hover:underline">
          Reorder a past item
        </Link>
        .
      </p>
    </>
  );
}