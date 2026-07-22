import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { supabase } from "@/lib/supabase";
import { formatKes } from "@/components/shop/ProductConfigurator";
import { Search, Loader2, PackageX, XCircle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/track-order")({
  head: () => ({
    meta: [
      { title: "Track Order — Protocol Promotions" },
      { name: "description", content: "Follow your order through every production stage: from artwork approval to delivery." },
      { property: "og:title", content: "Track Order — Protocol Promotions" },
      { property: "og:description", content: "Real-time production tracking." },
    ],
  }),
  component: TrackPage,
});

/* ================================================================
   Status mapping
   ================================================================ */

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  delivery_city: string | null;
  delivery_address: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  currency: string;
  created_at: string;
};

type ItemRow = {
  id: string;
  product_name: string;
  quantity: number;
  line_total: number;
};

// Canonical, linear journey shown to the client. Several raw order_status
// enum values collapse onto the same visible stage (see STATUS_ALIASES) —
// the DB has more granularity than a client needs to see.
const STAGE_FLOW: { key: string; label: string }[] = [
  { key: "pending", label: "Order received" },
  { key: "quotation_approved", label: "Quote approved" },
  { key: "awaiting_payment", label: "Awaiting payment" },
  { key: "paid", label: "Paid" },
  { key: "artwork_review", label: "Artwork review" },
  { key: "in_production", label: "In production" },
  { key: "quality_check", label: "Quality check" },
  { key: "packaging", label: "Packaging" },
  { key: "ready_for_pickup", label: "Ready" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

// Raw DB statuses that don't have their own step map onto the nearest one.
const STATUS_ALIASES: Record<string, string> = {
  quotation_requested: "pending",
  production: "in_production",
  ready: "ready_for_pickup",
  shipped: "out_for_delivery",
  completed: "delivered",
};

const TERMINAL_STOP_STATUSES = new Set(["cancelled", "refunded"]);

function resolveStageIndex(status: string): number {
  const canonical = STATUS_ALIASES[status] ?? status;
  const idx = STAGE_FLOW.findIndex((s) => s.key === canonical);
  return idx === -1 ? 0 : idx;
}

/* ================================================================
   Data
   ================================================================ */

async function fetchOrderByNumber(orderNumber: string) {
  // Direct table selects are blocked by RLS for anonymous/other-user
  // lookups (that's why "found in the DB but shows as not found" happens).
  // This RPC is security-definer and looks up strictly by exact
  // order_number, so it's safe to expose without a broad SELECT policy.
  const { data, error } = await supabase.rpc("get_order_for_tracking", {
    p_order_number: orderNumber,
  });

  if (error) throw error;
  if (!data || !data.order) return null;

  return {
    order: data.order as OrderRow,
    items: (data.items ?? []) as ItemRow[],
  };
}

/* ================================================================
   Page
   ================================================================ */

function TrackPage() {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["track-order", submitted],
    queryFn: () => fetchOrderByNumber(submitted!),
    enabled: !!submitted,
  });

  if (isError) {
    // Surfaced in dev so a permission/RLS error doesn't look identical to a
    // genuine "no such order" — check here before assuming the order number is wrong.
    console.error("Order lookup failed:", error);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim().toUpperCase();
    if (!trimmed) return;
    setSubmitted(trimmed);
  };

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Track Order"
        title="Where is your order?"
        description="Enter your order number to see live production status."
      />
      <section className="container-page py-14 md:py-20 max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="flex gap-2 rounded-xl border border-border bg-white p-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. PP-20260717-4821"
            className="flex-1 px-3 py-2.5 rounded-md text-sm focus:outline-none"
          />
          <button
            type="submit"
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-md bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60 transition"
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Track
          </button>
        </form>

        {/* Nothing searched yet */}
        {!submitted && (
          <p className="mt-6 text-sm text-brand-navy/50 text-center">
            Your order number was emailed to you when your order was placed.
          </p>
        )}

        {/* Loading */}
        {submitted && isFetching && (
          <div className="mt-10 flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-brand-navy/40" />
          </div>
        )}

        {/* Real query error (e.g. RLS/permission block) — distinct from "not found" */}
        {submitted && !isFetching && isError && (
          <div className="mt-10 rounded-xl border border-red-100 bg-red-50 p-8 text-center">
            <PackageX className="h-8 w-8 text-red-400 mx-auto" />
            <p className="mt-3 text-sm font-semibold text-red-700">
              Something went wrong looking up that order
            </p>
            <p className="mt-1 text-sm text-red-700/70">
              {error instanceof Error ? error.message : "Unknown error. Check the browser console for details."}
            </p>
          </div>
        )}

        {/* Genuinely no matching order */}
        {submitted && !isFetching && !isError && data === null && (
          <div className="mt-10 rounded-xl border border-border bg-white p-8 text-center">
            <PackageX className="h-8 w-8 text-brand-navy/30 mx-auto" />
            <p className="mt-3 text-sm font-semibold text-brand-navy">
              We couldn't find an order matching "{submitted}"
            </p>
            <p className="mt-1 text-sm text-brand-navy/50">
              Double-check the order number and try again, or contact us if you need help.
            </p>
          </div>
        )}

        {/* Found */}
        {submitted && !isFetching && data && (
          <div className="mt-10 space-y-6">
            {/* Summary */}
            <div className="rounded-xl border border-border bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-brand-navy/50">Order</div>
                  <div className="text-lg font-bold text-brand-navy">{data.order.order_number}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-brand-navy/50">Placed</div>
                  <div className="text-sm font-medium text-brand-navy">
                    {new Date(data.order.created_at).toLocaleDateString("en-KE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>

              {data.items.length > 0 && (
                <div className="mt-5 divide-y divide-border border-t border-border pt-4">
                  {data.items.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-4 text-sm">
                      <span className="text-brand-navy/80">
                        {item.product_name} <span className="text-brand-navy/40">× {item.quantity}</span>
                      </span>
                      <span className="font-medium text-brand-navy tabular-nums">
                        {formatKes(item.line_total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm font-semibold text-brand-navy">Total</span>
                <span className="text-lg font-bold text-brand-navy tabular-nums">
                  {formatKes(data.order.total)}
                </span>
              </div>

              {data.order.delivery_city && (
                <p className="mt-3 text-sm text-brand-navy/50">
                  Delivering to {data.order.delivery_address ? `${data.order.delivery_address}, ` : ""}
                  {data.order.delivery_city}
                </p>
              )}
            </div>

            {/* Cancelled / refunded — stop the journey, don't fake progress */}
            {TERMINAL_STOP_STATUSES.has(data.order.status) ? (
              <div className="rounded-xl border border-red-100 bg-red-50 p-6 flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-red-700">
                    This order was {data.order.status === "cancelled" ? "cancelled" : "refunded"}
                  </div>
                  <p className="mt-1 text-sm text-red-700/70">
                    If you believe this is a mistake, please contact us with your order number.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-white p-6">
                <div className="text-sm font-bold text-brand-navy mb-4">Order journey</div>
                <OrderStepper status={data.order.status} />
              </div>
            )}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function OrderStepper({ status }: { status: string }) {
  const currentIndex = resolveStageIndex(status);

  return (
    <ol className="space-y-3">
      {STAGE_FLOW.map((s, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        return (
          <li key={s.key} className="flex items-center gap-3">
            <div
              className={`h-6 w-6 grid place-items-center rounded-full text-[11px] font-bold shrink-0 ${
                done
                  ? "bg-brand-navy text-white"
                  : current
                  ? "bg-brand-orange text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <div className={`text-sm ${done || current ? "font-semibold text-brand-navy" : "text-muted-foreground"}`}>
              {s.label}
              {current && <span className="ml-2 text-xs font-medium text-brand-orange">Current stage</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}