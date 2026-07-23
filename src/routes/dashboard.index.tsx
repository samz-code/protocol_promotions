import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { KpiCard } from "@/components/dashboard/DashLayout";
import { Loader2, ArrowRight, ShoppingBag, PlusCircle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Client Dashboard | Protocol Promotions" }, 
      { name: "robots", content: "noindex" }
    ]
  }),
  component: DashboardIndex,
});

// TypeScript type definitions for Database payload mapping
type OrderRow = {
  id: string;
  item_name: string;
  status: string;
  total: number;
};

type DashboardStats = {
  activeOrdersCount: number;
  inProductionCount: number;
  pendingQuotesCount: number;
  totalSpend: number;
  savedArtworksCount: number;
  recentOrders: OrderRow[];
};

// Fetch all unified dashboard records for the active authenticated client
async function fetchDashboardMetrics(userId: string): Promise<DashboardStats> {
  // 1. Fetch Orders (Recent & Stats)
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, item_name, status, total")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (ordersError) throw ordersError;

  // 2. Fetch Pending Quotes Count
  const { count: quotesCount, error: quotesError } = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "pending");

  if (quotesError) throw quotesError;

  // 3. Fetch Saved Artworks Count (media table, filtered to this user's uploads)
  const { count: artworksCount, error: artworksError } = await supabase
    .from("media")
    .select("id", { count: "exact", head: true })
    .eq("uploaded_by", userId);

  if (artworksError) throw artworksError;

  // Calculated Order statistics
  const activeOrders = orders?.filter(o => o.status !== "delivered") ?? [];
  const inProduction = orders?.filter(o => o.status === "production") ?? [];
  const spendSum = orders?.reduce((acc, curr) => acc + Number(curr.total || 0), 0) ?? 0;

  return {
    activeOrdersCount: activeOrders.length,
    inProductionCount: inProduction.length,
    pendingQuotesCount: quotesCount ?? 0,
    totalSpend: spendSum,
    savedArtworksCount: artworksCount ?? 0,
    recentOrders: (orders ?? []).slice(0, 3) as OrderRow[], // Grab only the top 3 items
  };
}

function DashboardIndex() {
  const { session, isLoading: authLoading } = useAuth();

  const { data, isLoading: metricsLoading, error } = useQuery({
    queryKey: ["client-dashboard-metrics", session?.user?.id],
    queryFn: () => fetchDashboardMetrics(session!.user.id),
    enabled: !!session?.user?.id,
  });

  if (authLoading || metricsLoading) {
    return (
      <div className="grid min-h-100 place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-navy" />
          <p className="text-xs font-black uppercase tracking-widest text-brand-navy/60">
            Fetching system ledger...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border-2 border-brand-navy bg-white p-8 text-center shadow-[4px_4px_0_0_rgba(10,37,64,1)]">
        <p className="font-black text-brand-navy uppercase tracking-wide">Failed to Sync Live Activity</p>
        <p className="text-xs text-brand-navy/60 mt-2">
          {error instanceof Error ? error.message : "Make sure your database connections and table properties are active."}
        </p>
      </div>
    );
  }

  // Formatting helper for local currency
  const formatKsh = (num: number) => {
    if (num >= 1000) {
      return `KES ${(num / 1000).toFixed(0)}k`;
    }
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(num);
  };

  // Helper utility for dynamic colored badges based on order processing states
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "production":
        return "bg-amber-100 text-amber-700 border-amber-300";
      case "delivered":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "ready":
        return "bg-indigo-100 text-indigo-700 border-indigo-300";
      default:
        return "bg-brand-surface text-brand-navy/60 border-brand-navy/10";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 sm:space-y-8">
      
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
        <KpiCard 
          label="Active orders" 
          value={data.activeOrdersCount.toString()} 
          hint={`${data.inProductionCount} in production`} 
        />
        <KpiCard 
          label="Pending quotes" 
          value={data.pendingQuotesCount.toString()} 
          hint="Awaiting your approval" 
        />
        <KpiCard 
          label="Total spend" 
          value={formatKsh(data.totalSpend)} 
          hint="All time total" 
        />
        <KpiCard 
          label="Saved artwork" 
          value={data.savedArtworksCount.toString()} 
          hint="Active brand vector assets"
        />
      </div>

      {/* Main Content Layout Block */}
      <div className="grid items-start gap-5 lg:grid-cols-3 lg:gap-6">
        
        {/* Recent Orders Table Area */}
        <div className="order-2 rounded-xl border-2 border-brand-navy bg-white p-4 shadow-[4px_4px_0_0_rgba(10,37,64,1)] sm:p-6 lg:order-1 lg:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b-2 border-brand-navy/10">
            <h2 className="text-sm font-black uppercase tracking-wider text-brand-navy sm:text-base">Recent Orders</h2>
            <Link 
              to="/dashboard/orders" 
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-brand-orange hover:text-brand-navy transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          
          {data.recentOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="mx-auto h-8 w-8 text-brand-navy/30" />
              <p className="mt-3 text-xs font-black uppercase tracking-widest text-brand-navy/50">No orders logged yet.</p>
              <Link to="/shop" className="mt-2 inline-block text-xs font-bold text-brand-orange hover:underline">
                Place your first branding run →
              </Link>
            </div>
          ) : (
            <>
              {/* Cards on small screens. A four column table forces horizontal
                  scrolling on a phone, which makes your own orders hard to read. */}
              <ul className="mt-4 space-y-2.5 sm:hidden">
                {data.recentOrders.map((order) => (
                  <li
                    key={order.id}
                    className="rounded-lg border border-brand-navy/12 bg-brand-surface/40 p-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-brand-navy">
                          {order.item_name}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] font-bold text-brand-navy/50">
                          {order.id.slice(0, 8).toUpperCase()}
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-extrabold tabular-nums text-brand-navy">
                        {new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(order.total)}
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Table from sm up, where there is room for four columns */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="mt-4 w-full text-left text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-black uppercase tracking-widest text-brand-navy/40">
                      <th className="py-2.5">Order Code</th>
                      <th>Item Specification</th>
                      <th>Status</th>
                      <th className="text-right">Total Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-navy/5">
                    {data.recentOrders.map((order) => (
                      <tr key={order.id} className="transition-colors hover:bg-brand-surface/50">
                        <td className="py-3.5 font-mono text-xs font-bold text-brand-navy/70">
                          {order.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="font-bold text-brand-navy">{order.item_name}</td>
                        <td>
                          <span className={`inline-block rounded-md border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="text-right font-extrabold tabular-nums text-brand-navy">
                          {new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(order.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Action Controls Side Card */}
        <div className="order-1 rounded-xl border-2 border-brand-navy bg-white p-4 shadow-[4px_4px_0_0_rgba(10,37,64,1)] sm:p-6 lg:order-2">
          <h2 className="border-b-2 border-brand-navy/10 pb-3.5 text-sm font-black uppercase tracking-wider text-brand-navy sm:pb-4 sm:text-base">
            Quick Actions
          </h2>
          <div className="mt-5 space-y-3">
            <Link 
              to="/request-quote" 
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-brand-orange text-white px-4 py-3 text-[11px] font-black uppercase tracking-wider sm:py-3.5 sm:text-xs transition-all border-2 border-brand-navy shadow-[2px_2px_0_0_rgba(10,37,64,1)] hover:-translate-y-0.5"
            >
              <PlusCircle className="h-4 w-4" />
              Request a Quote
            </Link>
            
            <Link 
              to="/shop" 
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-brand-navy text-white px-4 py-3 text-[11px] font-black uppercase tracking-wider sm:py-3.5 sm:text-xs transition-all border-2 border-brand-navy shadow-[2px_2px_0_0_rgba(10,37,64,1)] hover:-translate-y-0.5 hover:brightness-110"
            >
              <ShoppingBag className="h-4 w-4" />
              Shop Products
            </Link>
            
            <Link 
              to="/dashboard/track-production" 
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-white border-2 border-brand-navy px-4 py-3 text-[11px] font-black uppercase tracking-wider sm:py-3.5 sm:text-xs text-brand-navy transition-all shadow-[2px_2px_0_0_rgba(10,37,64,1)] hover:-translate-y-0.5 hover:bg-brand-surface"
            >
              <CheckCircle2 className="h-4 w-4 text-brand-orange" />
              Track Production
            </Link>
          </div>
        </div>
        
      </div>
    </div>
  );
}