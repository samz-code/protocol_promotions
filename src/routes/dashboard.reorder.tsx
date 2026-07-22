import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Check, Loader2, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/reorder")({
  head: () => ({ 
    meta: [{ title: "Reorder — Client Dashboard" }, { name: "robots", content: "noindex" }] 
  }),
  component: ReorderPage,
});

async function fetchPastOrders(userId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, item_name, total, currency, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
    
  if (error) throw error;
  return data;
}

function ReorderPage() {
  const { session } = useAuth();
  const [added, setAdded] = useState<string[]>([]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["reorder-history", session?.user?.id],
    queryFn: () => fetchPastOrders(session!.user.id),
    enabled: !!session?.user?.id,
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-brand-navy/10 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-brand-navy uppercase tracking-wider">Reorder</h1>
          <p className="text-xs text-brand-navy/60 mt-0.5">
            Quickly add past items back to your cart with one click.
          </p>
        </div>
      </div>

      <div className="rounded-xl border-2 border-brand-navy bg-white divide-y-2 divide-brand-navy/5 shadow-[4px_4px_0_0_rgba(10,37,64,1)] overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-brand-navy" /></div>
        ) : !orders || orders.length === 0 ? (
          <div className="p-12 text-center text-xs font-black uppercase text-brand-navy/30">No order history found</div>
        ) : (
          orders.map((o) => {
            const isAdded = added.includes(o.id);
            return (
              <div key={o.id} className="p-5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 hover:bg-brand-surface/30 transition-colors">
                <div className="min-w-0">
                  <span className="font-mono text-[10px] font-black text-brand-navy/40 uppercase">{o.order_number}</span>
                  <div className="text-sm font-bold text-brand-navy">{o.item_name}</div>
                  <div className="text-[10px] text-brand-navy/50 font-medium mt-1">
                    Ordered {new Date(o.created_at).toLocaleDateString()} · {new Intl.NumberFormat("en-KE", { style: "currency", currency: o.currency }).format(o.total)}
                  </div>
                </div>
                <button
                  onClick={() => setAdded((prev) => [...prev, o.id])}
                  disabled={isAdded}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
                    isAdded
                      ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-200"
                      : "bg-brand-navy text-white hover:bg-brand-orange"
                  }`}
                >
                  {isAdded ? <Check className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                  {isAdded ? "Added to cart" : "Reorder"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}