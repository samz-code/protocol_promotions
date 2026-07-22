import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AdminField, ConfirmDialog, inputCls } from "./admin.categories";
import {
  Loader2, AlertCircle, Search, X, ArrowLeft, Printer, Check, Factory,
  CreditCard, User, MapPin, FileText, Clock, ChevronDown, Edit2, Trash2, Plus
} from "lucide-react";

export const Route = createFileRoute("/admin/quotes")({
  component: OrdersPage,
});

/* ------------------------------------------------------------------ types */

type OrderStatus =
  | "pending" | "quotation_requested" | "quotation_approved" | "awaiting_payment"
  | "paid" | "artwork_review" | "in_production" | "quality_check" | "packaging"
  | "ready" | "ready_for_pickup" | "out_for_delivery" | "shipped" | "delivered"
  | "completed" | "cancelled" | "refunded";

type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  created_at: string;
};

type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  selected_color: string | null;
  selected_size: string | null;
  print_method: string | null;
  artwork_url: string | null;
  notes: string | null;
};

type OrderDetail = OrderRow & {
  user_id: string | null;
  customer_phone: string | null;
  company: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_notes: string | null;
  subtotal: number;
  delivery_fee: number;
  currency: string;
  payment_method: string | null;
  payment_ref: string | null;
  internal_notes: string | null;
  invoice_number: string | null;
  updated_at: string;
  order_items: OrderItem[];
};

type Payment = {
  id: string;
  amount: number;
  method: string;
  status: string;
  reference: string | null;
  mpesa_receipt: string | null;
  paid_at: string | null;
  is_refund: boolean;
  created_at: string;
};

type Job = {
  id: string;
  stage: string;
  priority: string;
  expected_at: string | null;
  notes: string | null;
};

/* ------------------------------------------------------------ status data */

const STATUS_LABEL: Record<OrderStatus, string> = {
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

const FLOW: OrderStatus[] = [
  "pending",
  "quotation_requested",
  "quotation_approved",
  "awaiting_payment",
  "paid",
  "artwork_review",
  "in_production",
  "quality_check",
  "packaging",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "completed",
];

const TERMINAL: OrderStatus[] = ["completed", "cancelled", "refunded"];

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

/* --------------------------------------------------------------- helpers */

function kes(n: number) {
  return `KSh ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ago(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

/* --------------------------------------------------------------- queries */

async function fetchOrders(): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, customer_email, total, status, payment_status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OrderRow[];
}

async function fetchOrder(id: string): Promise<OrderDetail> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as OrderDetail;
}

async function fetchPayments(orderId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("id, amount, method, status, reference, mpesa_receipt, paid_at, is_refund, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Payment[];
}

async function fetchJobs(orderId: string): Promise<Job[]> {
  const { data, error } = await supabase
    .from("production_jobs")
    .select("id, stage, priority, expected_at, notes")
    .eq("order_id", orderId);
  if (error) throw error;
  return (data ?? []) as Job[];
}

/* ------------------------------------------------------------------- page */

function OrdersPage() {
  const [openId, setOpenId] = useState<string | null>(null);

  if (openId) {
    return <OrderDetailView orderId={openId} onClose={() => setOpenId(null)} />;
  }
  return <OrderList onOpen={setOpenId} />;
}

/* ------------------------------------------------------------------- list */

type Filter = "all" | "open" | "production" | "unpaid" | "done";

function OrderList({ onOpen }: { onOpen: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const query = useQuery({ queryKey: ["admin", "orders"], queryFn: fetchOrders });
  const all = query.data ?? [];

  const filtered = all.filter((o) => {
    if (search) {
      const q = search.toLowerCase();
      const hit =
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_email.toLowerCase().includes(q);
      if (!hit) return false;
    }

    if (filter === "open") return !TERMINAL.includes(o.status);
    if (filter === "production")
      return ["artwork_review", "in_production", "quality_check", "packaging"].includes(o.status);
    if (filter === "unpaid") return o.payment_status === "unpaid" || o.payment_status === "pending";
    if (filter === "done") return TERMINAL.includes(o.status);
    return true;
  });

  const counts = {
    all: all.length,
    open: all.filter((o) => !TERMINAL.includes(o.status)).length,
    production: all.filter((o) =>
      ["artwork_review", "in_production", "quality_check", "packaging"].includes(o.status)
    ).length,
    unpaid: all.filter((o) => o.payment_status === "unpaid" || o.payment_status === "pending").length,
    done: all.filter((o) => TERMINAL.includes(o.status)).length,
  };

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "open", label: "Open" },
    { id: "production", label: "On the floor" },
    { id: "unpaid", label: "Unpaid" },
    { id: "done", label: "Closed" },
  ];

  return (
    <div className="space-y-8">
      <header className="border-b-2 border-brand-navy pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-navy md:text-4xl">
          Orders & Quotes
        </h1>
        <p className="mt-2 text-sm text-brand-navy/60">
          {counts.open} open, {counts.unpaid} awaiting payment,{" "}
          {kes(all.reduce((s, o) => s + Number(o.total), 0))} booked in total.
        </p>
      </header>

      <div className="flex flex-col gap-4 border-b border-brand-navy/15 pb-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`inline-flex items-baseline gap-1.5 border-b-2 pb-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                filter === f.id
                  ? "border-brand-orange text-brand-navy"
                  : "border-transparent text-brand-navy/45 hover:text-brand-navy"
              }`}
            >
              {f.label}
              <span className="tabular-nums text-brand-navy/40">{counts[f.id]}</span>
            </button>
          ))}
        </div>

        <div className="flex w-full items-center gap-2 border-b border-brand-navy/10 pb-1 lg:ml-auto lg:w-64 lg:border-none">
          <Search className="h-4 w-4 shrink-0 text-brand-navy/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order, name or email..."
            className="w-full bg-transparent pb-1 text-sm font-medium text-brand-navy outline-none placeholder:text-brand-navy/35"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Clear">
              <X className="h-4 w-4 text-brand-navy/40 hover:text-brand-navy" />
            </button>
          )}
        </div>
      </div>

      {query.isLoading ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-brand-navy" />
        </div>
      ) : query.isError ? (
        <ErrorBox message={(query.error as Error).message} />
      ) : filtered.length === 0 ? (
        <p className="py-16 text-sm text-brand-navy/45">
          {search || filter !== "all"
            ? "Nothing matches that."
            : "No orders yet. They will appear here the moment one lands."}
        </p>
      ) : (
        <div className="w-full overflow-x-auto border-2 border-brand-navy shadow-[4px_4px_0_0_rgba(10,37,64,1)]">
          <table className="w-full border-collapse text-left min-w-125">
            <thead>
              <tr className="border-b border-brand-navy bg-brand-navy text-white">
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest">Order</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Customer</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Status</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Payment</th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest">Total</th>
                <th className="py-3 px-4 text-right text-[10px] font-black uppercase tracking-widest">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-navy/10 bg-white">
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => onOpen(o.id)}
                  className="group cursor-pointer hover:bg-brand-surface/20 transition-colors"
                >
                  <td className="py-4 px-4 align-middle">
                    <span className="font-mono text-xs font-black text-brand-orange">
                      {o.order_number}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <div className="text-xs font-bold text-brand-navy">
                      {o.customer_name}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-brand-navy/45">
                      {o.customer_email}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <StatusPill status={o.status} />
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <PaymentPill status={o.payment_status} />
                  </td>
                  <td className="px-4 py-4 text-right align-middle text-xs font-black tabular-nums text-brand-navy">
                    {kes(o.total)}
                  </td>
                  <td className="py-4 px-4 text-right align-middle text-[10px] font-bold text-brand-navy/45">
                    {ago(o.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: OrderStatus }) {
  const isTerminal = TERMINAL.includes(status);
  const isBad = status === "cancelled" || status === "refunded";

  return (
    <span
      className={`inline-block whitespace-nowrap border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider transition-colors ${
        isBad
          ? "border-brand-orange bg-brand-orange text-white"
          : isTerminal
            ? "border-brand-navy bg-brand-navy text-white"
            : "border-brand-navy/25 text-brand-navy/70 bg-brand-surface/40"
      }`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function PaymentPill({ status }: { status: PaymentStatus }) {
  const paid = status === "paid";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] font-black uppercase tracking-wide ${
        paid ? "text-brand-navy" : "text-brand-orange"
      }`}
    >
      <span className={`h-1.5 w-1.5 ${paid ? "bg-brand-navy" : "bg-brand-orange"}`} />
      {PAYMENT_LABEL[status]}
    </span>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex max-w-lg items-start gap-2.5 border border-brand-orange bg-brand-orange/8 p-4">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
      <span className="text-sm font-semibold text-brand-navy">{message}</span>
    </div>
  );
}

/* ----------------------------------------------------------------- detail */

function OrderDetailView({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const order = useQuery({
    queryKey: ["admin", "order", orderId],
    queryFn: () => fetchOrder(orderId),
  });
  const payments = useQuery({
    queryKey: ["admin", "order-payments", orderId],
    queryFn: () => fetchPayments(orderId),
  });
  const jobs = useQuery({
    queryKey: ["admin", "order-jobs", orderId],
    queryFn: () => fetchJobs(orderId),
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin", "order", orderId] });
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    qc.invalidateQueries({ queryKey: ["admin", "metrics"] });
  }

  const setStatus = useMutation({
    mutationFn: async (next: OrderStatus) => {
      const { error: e } = await supabase
        .from("orders")
        .update({ status: next })
        .eq("id", orderId);
      if (e) throw e;

      await supabase.from("activity_log").insert({
        actor_id: profile?.id ?? null,
        actor_name: profile?.full_name ?? null,
        action: "status_change",
        entity: "order",
        entity_id: orderId,
        summary: `${order.data?.order_number} moved to ${STATUS_LABEL[next]}`,
      });
    },
    onSuccess: refresh,
    onError: (e: Error) => setError(e.message),
  });

  const setPaymentStatus = useMutation({
    mutationFn: async (next: PaymentStatus) => {
      const { error: e } = await supabase
        .from("orders")
        .update({ payment_status: next })
        .eq("id", orderId);
      if (e) throw e;
    },
    onSuccess: refresh,
    onError: (e: Error) => setError(e.message),
  });

  const saveNotes = useMutation({
    mutationFn: async (notes: string) => {
      const { error: e } = await supabase
        .from("orders")
        .update({ internal_notes: notes })
        .eq("id", orderId);
      if (e) throw e;
    },
    onSuccess: refresh,
    onError: (e: Error) => setError(e.message),
  });

  const createJob = useMutation({
    mutationFn: async () => {
      const { error: e } = await supabase.from("production_jobs").insert({
        order_id: orderId,
        stage: "artwork_received",
        priority: "normal",
      });
      if (e) throw e;

      await supabase.from("orders").update({ status: "in_production" }).eq("id", orderId);
    },
    onSuccess: () => {
      refresh();
      qc.invalidateQueries({ queryKey: ["admin", "order-jobs", orderId] });
      qc.invalidateQueries({ queryKey: ["admin", "production"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { error: e } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);
      if (e) throw e;

      await supabase.from("activity_log").insert({
        actor_id: profile?.id ?? null,
        actor_name: profile?.full_name ?? null,
        action: "cancel",
        entity: "order",
        entity_id: orderId,
        summary: `${order.data?.order_number} cancelled`,
      });
    },
    onSuccess: () => {
      refresh();
      setConfirmCancel(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  if (order.isLoading) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-brand-navy" />
      </div>
    );
  }

  if (order.isError || !order.data) {
    return <ErrorBox message={(order.error as Error)?.message ?? "Order not found."} />;
  }

  const o = order.data;
  const paid = (payments.data ?? [])
    .filter((p) => p.status === "paid" && !p.is_refund)
    .reduce((s, p) => s + Number(p.amount), 0);
  const balance = Number(o.total) - paid;

  const stepIdx = FLOW.indexOf(o.status);
  const nextStatus = stepIdx >= 0 && stepIdx < FLOW.length - 1 ? FLOW[stepIdx + 1] : null;
  const isTerminal = TERMINAL.includes(o.status);
  const hasJob = (jobs.data ?? []).length > 0;

  return (
    <div className="space-y-10 max-w-full overflow-hidden">
      {/* Styles Injection for High-Quality Invoice Prints */}
      <style>{`
        @media print {
          body { background: white; color: black; font-size: 12px; }
          .no-print { display: none !important; }
          .print-full { width: 100% !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; }
          .print-logo-row { display: flex !important; justify-content: space-between !important; align-items: center !important; margin-bottom: 2rem !important; border-bottom: 2px solid #0a2540 !important; padding-bottom: 1rem !important; }
        }
      `}</style>

      {/* Printable Invoice Header (Hidden on Web Screen view) */}
      <div className="hidden print-logo-row">
        <div>
          <h2 className="text-xl font-black uppercase tracking-wider text-brand-navy">CONFIDENCE INTERNATIONAL</h2>
          <p className="text-[10px] font-bold text-brand-navy/60">Conferencing & Logistics Limited</p>
        </div>
        <div className="text-right">
          <h3 className="text-sm font-black uppercase text-brand-orange">INVOICE</h3>
          <p className="font-mono text-xs font-bold text-brand-navy mt-0.5">{o.order_number}</p>
        </div>
      </div>

      <header className="border-b-2 border-brand-navy pb-6 no-print">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-navy/60 transition-colors hover:text-brand-orange"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All orders
        </button>

        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-mono text-3xl font-extrabold tracking-tight text-brand-navy md:text-4xl">
              {o.order_number}
            </h1>
            <p className="mt-2 text-sm text-brand-navy/60">
              Placed {when(o.created_at)}
              {o.invoice_number && (
                <>
                  {" · Invoice "}
                  <span className="font-mono font-bold text-brand-navy">{o.invoice_number}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 border-2 border-brand-navy px-4 py-2.5 text-xs font-black uppercase tracking-widest text-brand-navy bg-white transition-all hover:bg-brand-surface shadow-[2px_2px_0_0_rgba(10,37,64,1)] active:translate-x-0.5 active:translate-y-0.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>

            {!hasJob && !isTerminal && (
              <button
                type="button"
                onClick={() => createJob.mutate()}
                disabled={createJob.isPending}
                className="inline-flex items-center gap-1.5 border-2 border-brand-navy px-4 py-2.5 text-xs font-black uppercase tracking-widest text-brand-navy bg-white transition-all hover:bg-brand-surface shadow-[2px_2px_0_0_rgba(10,37,64,1)] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
              >
                {createJob.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Factory className="h-3.5 w-3.5" />
                )}
                Send to production
              </button>
            )}

            {nextStatus && !isTerminal && (
              <button
                type="button"
                onClick={() => setStatus.mutate(nextStatus)}
                disabled={setStatus.isPending}
                className="inline-flex items-center gap-1.5 bg-brand-navy border-2 border-brand-navy px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-brand-orange hover:border-brand-orange shadow-[2px_2px_0_0_rgba(10,37,64,1)] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
              >
                {setStatus.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Mark {STATUS_LABEL[nextStatus]}
              </button>
            )}

            {!isTerminal && (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="border-2 border-brand-orange px-4 py-2.5 text-xs font-black uppercase tracking-widest text-brand-orange bg-white transition-all hover:bg-brand-orange/10 shadow-[2px_2px_0_0_rgba(242,100,25,1)] active:translate-x-0.5 active:translate-y-0.5"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </header>

      {error && <ErrorBox message={error} />}

      <div className="no-print">
        <Timeline current={o.status} />
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] print-full">
        <div className="space-y-10 print-full">
          <LineItems items={o.order_items} order={o} paid={paid} balance={balance} refresh={refresh} />
          
          <div className="no-print">
            <PaymentHistory
              query={payments}
              orderId={orderId}
              orderTotal={Number(o.total)}
              balance={balance}
              onDone={() => {
                qc.invalidateQueries({ queryKey: ["admin", "order-payments", orderId] });
                refresh();
              }}
              onError={setError}
            />
          </div>
        </div>

        <div className="space-y-10">
          <CustomerPanel order={o} />
          
          <div className="no-print space-y-10">
            <StatusOverride
              current={o.status}
              paymentStatus={o.payment_status}
              onStatus={(s) => setStatus.mutate(s)}
              onPayment={(p) => setPaymentStatus.mutate(p)}
              isPending={setStatus.isPending || setPaymentStatus.isPending}
            />
            <ProductionPanel query={jobs} />
            <InternalNotes
              initial={o.internal_notes ?? ""}
              onSave={(v) => saveNotes.mutate(v)}
              isSaving={saveNotes.isPending}
            />
          </div>
        </div>
      </div>

      {confirmCancel && (
        <ConfirmDialog
          title={`Cancel ${o.order_number}?`}
          body="The order stays on record but stops moving. If money was taken, refund it separately from the payments panel."
          confirmLabel="Cancel order"
          isPending={cancel.isPending}
          onCancel={() => setConfirmCancel(false)}
          onConfirm={() => cancel.mutate()}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------- timeline */

function Timeline({ current }: { current: OrderStatus }) {
  if (TERMINAL.includes(current) && current !== "completed") {
    return (
      <div className="border border-brand-orange bg-brand-orange/8 p-5">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-orange">
          {STATUS_LABEL[current]}
        </p>
        <p className="mt-1.5 text-sm text-brand-navy/70">
          This order is closed and will not move further.
        </p>
      </div>
    );
  }

  const idx = FLOW.indexOf(current);

  return (
    <div className="overflow-x-auto pb-2">
      <ol className="flex min-w-max items-center gap-1.5">
        {FLOW.map((s, i) => {
          const done = i < idx;
          const active = i === idx;

          return (
            <li key={s} className="flex items-center">
              <div className="flex flex-col items-center px-1">
                <span
                  className={`h-2.5 w-2.5 ${
                    active
                      ? "bg-brand-orange"
                      : done
                        ? "bg-brand-navy"
                        : "border border-brand-navy/25 bg-white"
                  }`}
                />
                <span
                  className={`mt-2 whitespace-nowrap text-[9px] font-black uppercase tracking-wider ${
                    active
                      ? "text-brand-orange"
                      : done
                        ? "text-brand-navy"
                        : "text-brand-navy/30"
                  }`}
                >
                  {STATUS_LABEL[s]}
                </span>
              </div>
              {i < FLOW.length - 1 && (
                <span
                  className={`mb-6 h-px w-6 sm:w-8 ${done ? "bg-brand-navy" : "bg-brand-navy/15"}`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------ line items (CRUD Supported) */

function LineItems({
  items, order, paid, balance, refresh
}: {
  items: OrderItem[];
  order: OrderDetail;
  paid: number;
  balance: number;
  refresh: () => void;
}) {
  const qc = useQueryClient();
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [addingItem, setAddingItem] = useState(false);

  // Form State for CRUD Line Item
  const [prodName, setProdName] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [method, setMethod] = useState("");

  const updateItemsMutation = useMutation({
    mutationFn: async (updatedList: Partial<OrderItem>[]) => {
      // Recalculate totals dynamically
      const lineItems = updatedList.map(item => {
        const line_total = Number(item.quantity || 0) * Number(item.unit_price || 0);
        return { ...item, line_total };
      });

      // Upsert to the order_items table
      const { error: itemErr } = await supabase
        .from("order_items")
        .upsert(lineItems.map(item => ({
          ...item,
          order_id: order.id
        })));
      if (itemErr) throw itemErr;

      const subtotal = lineItems.reduce((acc, item) => acc + (item.line_total || 0), 0);
      const total = subtotal + Number(order.delivery_fee);

      // Update parent Order total amounts
      const { error: orderErr } = await supabase
        .from("orders")
        .update({ subtotal, total })
        .eq("id", order.id);
      if (orderErr) throw orderErr;
    },
    onSuccess: () => {
      closeForm();
      refresh();
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error: delErr } = await supabase
        .from("order_items")
        .delete()
        .eq("id", itemId);
      if (delErr) throw delErr;

      const remainingItems = items.filter(it => it.id !== itemId);
      const subtotal = remainingItems.reduce((acc, item) => acc + item.line_total, 0);
      const total = subtotal + Number(order.delivery_fee);

      const { error: orderErr } = await supabase
        .from("orders")
        .update({ subtotal, total })
        .eq("id", order.id);
      if (orderErr) throw orderErr;
    },
    onSuccess: refresh
  });

  const closeForm = () => {
    setEditingItem(null);
    setAddingItem(false);
    setProdName("");
    setQty(1);
    setPrice(0);
    setColor("");
    setSize("");
    setMethod("");
  };

  const handleEditClick = (it: OrderItem) => {
    setEditingItem(it);
    setProdName(it.product_name);
    setQty(it.quantity);
    setPrice(it.unit_price);
    setColor(it.selected_color || "");
    setSize(it.selected_size || "");
    setMethod(it.print_method || "");
  };

  const handleSave = () => {
    if (!prodName) return;
    const payload: Partial<OrderItem> = {
      product_name: prodName,
      quantity: Number(qty),
      unit_price: Number(price),
      selected_color: color || null,
      selected_size: size || null,
      print_method: method || null,
    };

    if (editingItem) {
      payload.id = editingItem.id;
      const otherItems = items.filter(it => it.id !== editingItem.id);
      updateItemsMutation.mutate([...otherItems, payload]);
    } else {
      updateItemsMutation.mutate([...items, payload]);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between border-b-2 border-brand-navy pb-4">
        <h2 className="text-xl font-extrabold tracking-tight text-brand-navy">
          What was ordered
        </h2>
        <button
          onClick={() => setAddingItem(true)}
          className="no-print inline-flex items-center gap-1 bg-brand-navy text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider hover:bg-brand-orange transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Item
        </button>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full border-collapse text-left text-xs min-w-125">
          <thead>
            <tr className="border-b border-brand-navy/20 text-brand-navy/60 font-bold uppercase tracking-wider">
              <th className="py-3 pr-4">Product Details</th>
              <th className="px-4 py-3 text-right">Quantity & Price</th>
              <th className="py-3 pl-4 text-right">Line Total</th>
              <th className="py-3 pl-4 text-right w-20 no-print">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-navy/10">
            {items.map((it) => (
              <tr key={it.id} className="align-top">
                <td className="py-4 pr-4">
                  <div className="font-extrabold text-brand-navy text-sm">{it.product_name}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {[it.selected_color, it.selected_size, it.print_method]
                      .filter(Boolean)
                      .map((v) => (
                        <span
                          key={v}
                          className="border border-brand-navy/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-navy/60 bg-brand-surface/20"
                        >
                          {v}
                        </span>
                      ))}
                  </div>
                  {it.notes && (
                    <p className="mt-1.5 text-[10px] leading-relaxed text-brand-navy/55">{it.notes}</p>
                  )}
                  {it.artwork_url && (
                    <a
                      href={it.artwork_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-brand-navy hover:text-brand-orange"
                    >
                      <FileText className="h-3 w-3" />
                      Artwork System Link
                    </a>
                  )}
                </td>
                <td className="px-4 py-4 text-right tabular-nums text-brand-navy/60 font-medium">
                  {it.quantity} × {kes(it.unit_price)}
                </td>
                <td className="py-4 pl-4 text-right font-black tabular-nums text-brand-navy">
                  {kes(it.line_total)}
                </td>
                <td className="py-4 pl-4 text-right no-print">
                  <div className="inline-flex items-center gap-1 justify-end">
                    <button
                      onClick={() => handleEditClick(it)}
                      className="p-1 border border-brand-navy/20 hover:border-brand-navy hover:bg-brand-surface transition-colors rounded text-brand-navy"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => deleteItemMutation.mutate(it.id)}
                      disabled={deleteItemMutation.isPending}
                      className="p-1 border border-brand-navy/20 hover:border-brand-orange hover:bg-brand-orange/10 hover:text-brand-orange transition-colors rounded text-brand-navy/50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-brand-navy/10">
              <td colSpan={2} className="py-3 pr-4 text-right text-brand-navy/60 font-bold uppercase">
                Subtotal
              </td>
              <td className="py-3 pl-4 text-right font-bold tabular-nums text-brand-navy">
                {kes(order.subtotal)}
              </td>
              <td className="no-print"></td>
            </tr>
            {Number(order.delivery_fee) > 0 && (
              <tr>
                <td colSpan={2} className="py-1 pr-4 text-right text-brand-navy/60 font-bold uppercase">
                  Delivery
                </td>
                <td className="py-1 pl-4 text-right font-bold tabular-nums text-brand-navy">
                  {kes(order.delivery_fee)}
                </td>
                <td className="no-print"></td>
              </tr>
            )}
            <tr className="border-t-2 border-brand-navy">
              <td colSpan={2} className="py-4 pr-4 text-right text-xs font-black uppercase tracking-wider text-brand-navy">
                Grand Total
              </td>
              <td className="py-4 pl-4 text-right text-lg font-black tabular-nums text-brand-navy">
                {kes(order.total)}
              </td>
              <td className="no-print"></td>
            </tr>
            {paid > 0 && (
              <>
                <tr className="border-t border-dashed border-brand-navy/20">
                  <td colSpan={2} className="py-2 pr-4 text-right text-brand-navy/60 font-bold uppercase">
                    Paid
                  </td>
                  <td className="py-2 pl-4 text-right font-black tabular-nums text-brand-navy">
                    {kes(paid)}
                  </td>
                  <td className="no-print"></td>
                </tr>
                <tr>
                  <td colSpan={2} className="py-1 pr-4 text-right font-black uppercase text-brand-navy">
                    Balance Due
                  </td>
                  <td
                    className={`py-1 pl-4 text-right font-black tabular-nums ${
                      balance > 0 ? "text-brand-orange text-base" : "text-brand-navy"
                    }`}
                  >
                    {kes(balance)}
                  </td>
                  <td className="no-print"></td>
                </tr>
              </>
            )}
          </tfoot>
        </table>
      </div>

      {/* Item Create & Edit Dialog Modal Box */}
      {(addingItem || editingItem) && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-brand-navy/30 backdrop-blur-xs px-4 no-print animate-fade-in">
          <div className="bg-white border-4 border-brand-navy p-6 w-full max-w-md rounded-xl shadow-[6px_6px_0_0_rgba(10,37,64,1)] space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-brand-navy border-b border-brand-navy/10 pb-2">
              {editingItem ? "Edit Line Item" : "Add Line Item"}
            </h3>
            <div className="space-y-3 text-xs font-bold text-brand-navy">
              <div className="space-y-1">
                <label className="uppercase">Product Name</label>
                <input
                  type="text"
                  className={inputCls}
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. Branded Ceramic Mug"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="uppercase">Qty</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="uppercase">Unit Price (KSh)</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="uppercase text-[9px]">Color</label>
                  <input
                    type="text"
                    className={inputCls}
                    value={color}
                    placeholder="e.g. Black"
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="uppercase text-[9px]">Size</label>
                  <input
                    type="text"
                    className={inputCls}
                    value={size}
                    placeholder="e.g. XL"
                    onChange={(e) => setSize(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="uppercase text-[9px]">Print Method</label>
                  <input
                    type="text"
                    className={inputCls}
                    value={method}
                    placeholder="e.g. Silk Screen"
                    onChange={(e) => setMethod(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                onClick={closeForm}
                className="px-4 py-2 border-2 border-brand-navy font-black uppercase text-brand-navy hover:bg-brand-surface/20"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateItemsMutation.isPending}
                className="px-4 py-2 bg-brand-navy border-2 border-brand-navy font-black uppercase text-white hover:bg-brand-orange hover:border-brand-orange transition-colors"
              >
                {updateItemsMutation.isPending ? "Saving..." : "Save Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------- payments */

function PaymentHistory({
  query, orderId, orderTotal, balance, onDone, onError,
}: {
  query: ReturnType<typeof useQuery<Payment[]>>;
  orderId: string;
  orderTotal: number;
  balance: number;
  onDone: () => void;
  onError: (m: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [amount, setAmount] = useState(balance > 0 ? balance : orderTotal);
  const [method, setMethod] = useState("mpesa");
  const [reference, setReference] = useState("");

  const record = useMutation({
    mutationFn: async () => {
      if (amount <= 0) throw new Error("Amount must be greater than zero.");

      const { error } = await supabase.from("payments").insert({
        order_id: orderId,
        amount,
        method,
        status: "paid",
        reference: reference || null,
        mpesa_receipt: method === "mpesa" ? reference || null : null,
        paid_at: new Date().toISOString(),
      });
      if (error) throw error;

      if (amount >= balance) {
        await supabase
          .from("orders")
          .update({ payment_status: "paid", status: "paid" })
          .eq("id", orderId);
      }
    },
    onSuccess: () => {
      setRecording(false);
      setReference("");
      onDone();
    },
    onError: (e: Error) => onError(e.message),
  });

  const payments = query.data ?? [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between border-b-2 border-brand-navy pb-4">
        <h2 className="text-xl font-extrabold tracking-tight text-brand-navy">
          Transaction Logs
        </h2>
        {balance > 0 && !recording && (
          <button
            type="button"
            onClick={() => setRecording(true)}
            className="bg-brand-navy text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider hover:bg-brand-orange transition-colors"
          >
            Record Payment
          </button>
        )}
      </div>

      {recording && (
        <div className="border-2 border-brand-navy p-4 bg-brand-surface/10 space-y-4 animate-fade-in text-xs font-bold text-brand-navy">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="uppercase tracking-wider">Amount (KSh)</label>
              <input
                type="number"
                className={inputCls}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="uppercase tracking-wider">Method</label>
              <select
                className={`${inputCls} bg-white`}
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="mpesa">M-Pesa</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="uppercase tracking-wider">Reference / Receipt No.</label>
              <input
                type="text"
                className={inputCls}
                placeholder="e.g. QX2498FHSD"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setRecording(false)}
              className="px-3 py-1.5 border border-brand-navy uppercase text-[10px] hover:bg-brand-surface/30"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => record.mutate()}
              disabled={record.isPending}
              className="px-4 py-1.5 bg-brand-navy text-white uppercase text-[10px] hover:bg-brand-orange transition-colors"
            >
              {record.isPending ? "Recording..." : "Save Record"}
            </button>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <p className="text-xs text-brand-navy/50 font-bold italic py-4">No payments captured for this reference.</p>
      ) : (
        <div className="w-full overflow-x-auto border border-brand-navy/15 rounded-lg">
          <table className="w-full border-collapse text-left text-xs min-w-100">
            <thead>
              <tr className="border-b border-brand-navy/10 text-brand-navy/50 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Reference</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-navy/5">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 px-3 text-brand-navy/60 font-medium">
                    {ago(p.paid_at || p.created_at)}
                  </td>
                  <td className="py-3 px-3">
                    <span className="uppercase text-[10px] font-black">{p.method}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[10px] font-bold text-brand-navy/60">
                    {p.reference || "None"}
                  </td>
                  <td className="py-3 px-3 text-right font-black tabular-nums text-brand-navy">
                    {kes(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ----------------------------------------------------------- client panel */

function CustomerPanel({ order }: { order: OrderDetail }) {
  return (
    <section className="border-2 border-brand-navy p-5 bg-white shadow-[4px_4px_0_0_rgba(10,37,64,1)] rounded-xl space-y-4">
      <div className="flex items-center gap-2 border-b border-brand-navy/10 pb-3">
        <User className="h-5 w-5 text-brand-navy" />
        <h3 className="text-xs font-black uppercase tracking-wider text-brand-navy">
          Client Information
        </h3>
      </div>
      <div className="space-y-3 text-xs text-brand-navy leading-relaxed">
        <div>
          <div className="font-black text-sm">{order.customer_name}</div>
          <div className="text-brand-navy/60 font-semibold">{order.customer_email}</div>
          {order.customer_phone && (
            <div className="text-brand-navy/60 font-semibold mt-0.5">{order.customer_phone}</div>
          )}
        </div>
        {order.company && (
          <div className="border-t border-brand-navy/5 pt-2">
            <span className="text-[9px] font-black uppercase text-brand-navy/40">Company</span>
            <div className="font-bold">{order.company}</div>
          </div>
        )}
        <div className="border-t border-brand-navy/5 pt-2 space-y-2">
          <div className="flex items-start gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-brand-navy/40 shrink-0 mt-0.5" />
            <div>
              <span className="text-[9px] font-black uppercase text-brand-navy/40">Delivery Destination</span>
              <div className="font-bold leading-normal">
                {order.delivery_address || "Collection / Store pickup"}
                {order.delivery_city ? `, ${order.delivery_city}` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- status override */

function StatusOverride({
  current, paymentStatus, onStatus, onPayment, isPending
}: {
  current: OrderStatus;
  paymentStatus: PaymentStatus;
  onStatus: (s: OrderStatus) => void;
  onPayment: (p: PaymentStatus) => void;
  isPending: boolean;
}) {
  return (
    <section className="border-2 border-brand-navy p-5 bg-white shadow-[4px_4px_0_0_rgba(10,37,64,1)] rounded-xl space-y-4">
      <div className="flex items-center gap-2 border-b border-brand-navy/10 pb-3">
        <Clock className="h-5 w-5 text-brand-navy" />
        <h3 className="text-xs font-black uppercase tracking-wider text-brand-navy">
          Status Overrides
        </h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 text-xs font-bold text-brand-navy">
        <div className="space-y-1">
          <label className="uppercase text-[9px] text-brand-navy/50">Workflow State</label>
          <div className="relative">
            <select
              className="w-full border-2 border-brand-navy p-2 uppercase bg-white cursor-pointer"
              value={current}
              disabled={isPending}
              onChange={(e) => onStatus(e.target.value as OrderStatus)}
            >
              {Object.entries(STATUS_LABEL).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="uppercase text-[9px] text-brand-navy/50">Settlement Status</label>
          <div className="relative">
            <select
              className="w-full border-2 border-brand-navy p-2 uppercase bg-white cursor-pointer"
              value={paymentStatus}
              disabled={isPending}
              onChange={(e) => onPayment(e.target.value as PaymentStatus)}
            >
              {Object.entries(PAYMENT_LABEL).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ production */

function ProductionPanel({ query }: { query: ReturnType<typeof useQuery<Job[]>> }) {
  const jobs = query.data ?? [];

  return (
    <section className="border-2 border-brand-navy p-5 bg-white shadow-[4px_4px_0_0_rgba(10,37,64,1)] rounded-xl space-y-4">
      <div className="flex items-center gap-2 border-b border-brand-navy/10 pb-3">
        <Factory className="h-5 w-5 text-brand-navy" />
        <h3 className="text-xs font-black uppercase tracking-wider text-brand-navy">
          Floor Production State
        </h3>
      </div>
      {jobs.length === 0 ? (
        <p className="text-xs text-brand-navy/50 font-bold italic">This order is currently offline / not on the floor.</p>
      ) : (
        <div className="space-y-3 text-xs text-brand-navy">
          {jobs.map((j) => (
            <div key={j.id} className="border border-brand-navy/10 p-3 bg-brand-surface/10 space-y-1.5">
              <div className="flex justify-between font-black uppercase">
                <span>Stage: {j.stage.replace("_", " ")}</span>
                <span className="text-brand-orange">Priority: {j.priority}</span>
              </div>
              {j.notes && <p className="text-[10px] text-brand-navy/70 leading-relaxed font-semibold">{j.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------- internal notes */

function InternalNotes({
  initial, onSave, isSaving
}: {
  initial: string;
  onSave: (v: string) => void;
  isSaving: boolean;
}) {
  const [val, setVal] = useState(initial);

  return (
    <section className="border-2 border-brand-navy p-5 bg-white shadow-[4px_4px_0_0_rgba(10,37,64,1)] rounded-xl space-y-4">
      <div className="flex items-center gap-2 border-b border-brand-navy/10 pb-3">
        <FileText className="h-5 w-5 text-brand-navy" />
        <h3 className="text-xs font-black uppercase tracking-wider text-brand-navy">
          Administrative Logs / Notes
        </h3>
      </div>
      <div className="space-y-3 text-xs">
        <textarea
          className="w-full h-24 border-2 border-brand-navy p-2 outline-none font-medium text-brand-navy bg-white focus:bg-brand-surface/15 resize-none"
          placeholder="Log updates, quotes specifications or instructions..."
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
        <div className="flex justify-end">
          <button
            type="button"
            disabled={isSaving || val === initial}
            onClick={() => onSave(val)}
            className="px-4 py-1.5 bg-brand-navy text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand-orange disabled:opacity-40 transition-colors"
          >
            {isSaving ? "Saving Logs..." : "Save Notes"}
          </button>
        </div>
      </div>
    </section>
  );
}