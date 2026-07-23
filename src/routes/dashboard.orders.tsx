import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Loader2, Package, ChevronRight, X, AlertCircle,
  CheckCircle2, Clock, Truck, Paintbrush, CreditCard, ShoppingBag,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/orders")({
  head: () => ({
    meta: [
      { title: "Orders | Client Dashboard" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

type OrderRow = {
  id: string;
  order_number: string;
  item_name: string | null;
  status: string;
  payment_status: string | null;
  total: number;
  created_at: string;
};

/* ----------------------------------------------------------------
   Customers should never see raw database values. Each status gets
   plain language, a colour, an icon and a position in the journey.
   ---------------------------------------------------------------- */

type StatusInfo = {
  label: string;
  hint: string;
  tone: string;
  icon: typeof Clock;
  step: number;
};

const TOTAL_STEPS = 6;

const STATUS: Record<string, StatusInfo> = {
  pending: {
    label: "Received",
    hint: "We have your order and are confirming the details.",
    tone: "bg-slate-100 text-slate-700 border-slate-200",
    icon: Clock,
    step: 1,
  },
  quotation_requested: {
    label: "Being priced",
    hint: "We are putting your quote together.",
    tone: "bg-slate-100 text-slate-700 border-slate-200",
    icon: Clock,
    step: 1,
  },
  quotation_approved: {
    label: "Quote approved",
    hint: "Thank you. We will raise the invoice next.",
    tone: "bg-blue-50 text-blue-700 border-blue-200",
    icon: CheckCircle2,
    step: 2,
  },
  awaiting_payment: {
    label: "Awaiting payment",
    hint: "Once payment clears we move straight to artwork.",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
    icon: CreditCard,
    step: 2,
  },
  paid: {
    label: "Payment received",
    hint: "Thank you. Your artwork proof is being prepared.",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    step: 3,
  },
  artwork_review: {
    label: "Artwork proof",
    hint: "We are preparing a proof for you to approve.",
    tone: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Paintbrush,
    step: 3,
  },
  in_production: {
    label: "In production",
    hint: "Your order is being made right now.",
    tone: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Package,
    step: 4,
  },
  quality_check: {
    label: "Quality check",
    hint: "We are checking everything against your approved proof.",
    tone: "bg-blue-50 text-blue-700 border-blue-200",
    icon: CheckCircle2,
    step: 4,
  },
  packaging: {
    label: "Packing",
    hint: "Being boxed and labelled for dispatch.",
    tone: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Package,
    step: 4,
  },
  ready: {
    label: "Ready",
    hint: "Finished and waiting to go out.",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    step: 5,
  },
  ready_for_pickup: {
    label: "Ready for pickup",
    hint: "Come and collect whenever suits you.",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: ShoppingBag,
    step: 5,
  },
  out_for_delivery: {
    label: "On the way",
    hint: "With the courier now.",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Truck,
    step: 5,
  },
  shipped: {
    label: "Dispatched",
    hint: "On its way to you.",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Truck,
    step: 5,
  },
  delivered: {
    label: "Delivered",
    hint: "Delivered. We hope it looks great.",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    step: 6,
  },
  completed: {
    label: "Complete",
    hint: "All done. Order again any time.",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    step: 6,
  },
  cancelled: {
    label: "Cancelled",
    hint: "This order was cancelled. Contact us if that is unexpected.",
    tone: "bg-red-50 text-red-700 border-red-200",
    icon: X,
    step: 0,
  },
  refunded: {
    label: "Refunded",
    hint: "This order was refunded.",
    tone: "bg-red-50 text-red-700 border-red-200",
    icon: X,
    step: 0,
  },
};

function statusInfo(raw: string): StatusInfo {
  return (
    STATUS[raw?.toLowerCase()] ?? {
      label: (raw ?? "Processing").replace(/_/g, " "),
      hint: "We are working on this order.",
      tone: "bg-slate-100 text-slate-700 border-slate-200",
      icon: Clock,
      step: 1,
    }
  );
}

/* Groups that mean something to a customer, mapped to real enum values. */
const GROUPS = {
  All: null,
  "In progress": [
    "pending", "quotation_requested", "quotation_approved", "awaiting_payment",
    "paid", "artwork_review", "in_production", "quality_check", "packaging",
  ],
  "On the way": ["ready", "ready_for_pickup", "out_for_delivery", "shipped"],
  Delivered: ["delivered", "completed"],
} as const;

type Filter = keyof typeof GROUPS;

async function fetchOrders(userId: string): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, item_name, status, payment_status, total, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as OrderRow[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatKsh(num: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(num) || 0);
}

function OrdersPage() {
  const { session } = useAuth();
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ["dashboard-orders", session?.user?.id],
    queryFn: () => fetchOrders(session!.user.id),
    enabled: !!session?.user?.id,
  });

  const all = orders ?? [];

  const counts = useMemo(() => {
    const out: Record<Filter, number> = {
      All: all.length,
      "In progress": 0,
      "On the way": 0,
      Delivered: 0,
    };
    for (const o of all) {
      const s = o.status?.toLowerCase();
      for (const key of ["In progress", "On the way", "Delivered"] as const) {
        if ((GROUPS[key] as readonly string[]).includes(s)) out[key] += 1;
      }
    }
    return out;
  }, [all]);

  const filtered = useMemo(() => {
    let list = all;

    const group = GROUPS[filter];
    if (group) {
      list = list.filter((o) => (group as readonly string[]).includes(o.status?.toLowerCase()));
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          (o.item_name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [all, filter, query]);

  // The one thing most people come here to check.
  const active = all.find((o) => {
    const step = statusInfo(o.status).step;
    return step > 0 && step < 6;
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="border-b border-border pb-4">
        <h1 className="text-lg font-bold text-brand-navy sm:text-xl">Your orders</h1>
        <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
          Everything you have ordered, and where each one has got to.
        </p>
      </header>

      {/* Latest active order, surfaced so nobody has to hunt for it */}
      {active && !isLoading && <ActiveOrderCard order={active} />}

      {/* Filters and search */}
      <div className="space-y-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(Object.keys(GROUPS) as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                filter === f
                  ? "bg-brand-navy text-white"
                  : "bg-white text-muted-foreground ring-1 ring-border hover:text-brand-navy"
              }`}
            >
              {f}
              <span className={filter === f ? "ml-1.5 text-white/60" : "ml-1.5 text-muted-foreground/60"}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by order number or item"
            className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-brand-navy"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-brand-navy"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Orders */}
      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-navy/50" />
          <p className="text-xs text-muted-foreground">Loading your orders...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto h-6 w-6 text-red-500" />
          <p className="mt-3 text-sm font-semibold text-brand-navy">We could not load your orders</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {error instanceof Error ? error.message : "Please try again shortly."}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasOrders={all.length > 0} onClear={() => { setFilter("All"); setQuery(""); }} />
      ) : (
        <ul className="space-y-3">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </ul>
      )}

      {/* Reorder, as a real action rather than a sentence */}
      {all.length > 0 && (
        <Link
          to="/dashboard/reorder"
          className="flex items-center justify-between gap-4 rounded-xl border border-border bg-white p-4 transition-colors hover:border-brand-navy/30"
        >
          <div className="min-w-0">
            <div className="text-sm font-bold text-brand-navy">Order something again</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              We keep your artwork on file, so a repeat order takes a minute.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      )}
    </div>
  );
}

/** The order someone is most likely checking on, shown with its progress. */
function ActiveOrderCard({ order }: { order: OrderRow }) {
  const info = statusInfo(order.status);
  const Icon = info.icon;
  const pct = Math.round((info.step / TOTAL_STEPS) * 100);

  return (
    <section className="rounded-xl border-2 border-brand-navy bg-white p-4 shadow-[4px_4px_0_0_rgba(10,37,64,1)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-brand-orange">
            Latest order
          </div>
          <h2 className="mt-1 truncate text-base font-bold text-brand-navy sm:text-lg">
            {order.item_name ?? order.order_number}
          </h2>
          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {order.order_number}
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${info.tone}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {info.label}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-brand-navy/70">{info.hint}</p>

      {info.step > 0 && (
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-brand-navy/10">
            <div
              className="h-full rounded-full bg-brand-orange transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Step {info.step} of {TOTAL_STEPS}</span>
            <span>{formatKsh(order.total)}</span>
          </div>
        </div>
      )}

      <Link
        to="/dashboard/track-production"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-navy px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:brightness-110 sm:w-auto"
      >
        Track this order <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

function OrderCard({ order }: { order: OrderRow }) {
  const info = statusInfo(order.status);
  const Icon = info.icon;
  const unpaid = order.payment_status === "unpaid" || order.payment_status === "pending";

  return (
    <li>
      <Link
        to="/dashboard/track-production"
        className="block rounded-xl border border-border bg-white p-4 transition-all hover:border-brand-navy/30 hover:shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold text-brand-navy">
              {order.item_name ?? "Custom order"}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
              <span className="font-mono">{order.order_number}</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span>{formatDate(order.created_at)}</span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-sm font-bold tabular-nums text-brand-navy">
              {formatKsh(order.total)}
            </div>
            {unpaid && (
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                Unpaid
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${info.tone}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {info.label}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-navy/60">
            View <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
    </li>
  );
}

function EmptyState({ hasOrders, onClear }: { hasOrders: boolean; onClear: () => void }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-border bg-white p-10 text-center sm:p-14">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-surface">
        <Package className="h-5 w-5 text-brand-navy/40" />
      </div>
      <h2 className="mt-4 text-base font-bold text-brand-navy">
        {hasOrders ? "Nothing matches that" : "No orders yet"}
      </h2>
      <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
        {hasOrders
          ? "Try a different search, or show all orders."
          : "When you place an order it appears here, with live updates as it moves through production."}
      </p>
      {hasOrders ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 text-xs font-bold uppercase tracking-wide text-brand-orange hover:text-brand-navy"
        >
          Show all orders
        </button>
      ) : (
        <Link
          to="/shop"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          <ShoppingBag className="h-4 w-4" /> Browse the shop
        </Link>
      )}
    </div>
  );
}