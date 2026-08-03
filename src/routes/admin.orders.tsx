import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AdminField, ConfirmDialog, inputCls } from "@/lib/admin-ui";
import { OrderArtworkPanel, ArtworkCount } from "@/components/admin/OrderArtwork";
import {
  Loader2, AlertCircle, Search, X, ArrowLeft, Printer, Check, Factory,
  CreditCard, User, MapPin, FileText, Clock, ChevronDown, ChevronRight,
  Package, Wallet, TrendingUp, Phone, Mail, Building2, AlertTriangle,
  Plus, Trash2, ShoppingBag,
} from "lucide-react";

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

const STATUS_ACTION: Record<OrderStatus, string> = {
  pending: "New order. Confirm the details and send it forward.",
  quotation_requested: "Price this and send the customer a quote.",
  quotation_approved: "Quote accepted. Raise the invoice for payment.",
  awaiting_payment: "Waiting on the customer to pay. Chase if it has been sitting.",
  paid: "Money is in. Move it to artwork review.",
  artwork_review: "Check the artwork and get a proof approved before printing.",
  in_production: "On the floor. Track it from the production page.",
  quality_check: "Inspect against the approved proof before it leaves.",
  packaging: "Being boxed and labelled for dispatch.",
  ready: "Finished and waiting to go out.",
  ready_for_pickup: "Customer is collecting. Let them know it is ready.",
  out_for_delivery: "With the courier. Share tracking if you have it.",
  shipped: "Dispatched to the customer.",
  delivered: "Delivered. Close it off once you are happy.",
  completed: "Job complete. Nothing further needed.",
  cancelled: "Cancelled. Refund separately if money was taken.",
  refunded: "Refunded and closed.",
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
  return `KSh ${Number(n || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

function kesExact(n: number) {
  return `KSh ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
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

function daysOld(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PP-${year}-${rand}`;
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
  const [creating, setCreating] = useState(false);

  if (creating) {
    return <CreateOrderForm onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); setOpenId(id); }} />;
  }

  if (openId) {
    return <OrderDetailView orderId={openId} onClose={() => setOpenId(null)} />;
  }
  return <OrderList onOpen={setOpenId} onCreate={() => setCreating(true)} />;
}

/* ------------------------------------------------------------------- list */

type Filter = "all" | "open" | "production" | "unpaid" | "done";

function OrderList({ onOpen, onCreate }: { onOpen: (id: string) => void; onCreate: () => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const query = useQuery({ queryKey: ["admin", "orders"], queryFn: fetchOrders });
  const all = query.data ?? [];

  const stats = useMemo(() => {
    const open = all.filter((o) => !TERMINAL.includes(o.status));
    const unpaid = all.filter((o) => o.payment_status === "unpaid" || o.payment_status === "pending");
    return {
      openCount: open.length,
      unpaidCount: unpaid.length,
      unpaidValue: unpaid.reduce((s, o) => s + Number(o.total || 0), 0),
      bookedValue: all.reduce((s, o) => s + Number(o.total || 0), 0),
    };
  }, [all]);

  const counts = {
    all: all.length,
    open: all.filter((o) => !TERMINAL.includes(o.status)).length,
    production: all.filter((o) =>
      ["artwork_review", "in_production", "quality_check", "packaging"].includes(o.status)
    ).length,
    unpaid: all.filter((o) => o.payment_status === "unpaid" || o.payment_status === "pending").length,
    done: all.filter((o) => TERMINAL.includes(o.status)).length,
  };

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

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "open", label: "Open" },
    { id: "production", label: "On the floor" },
    { id: "unpaid", label: "Unpaid" },
    { id: "done", label: "Closed" },
  ];

  return (
    <div className="min-w-0 space-y-6">
      <header className="flex flex-col gap-4 border-b-2 border-brand-navy pb-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl md:text-4xl">
            Orders
          </h1>
          <p className="mt-2 text-sm text-brand-navy/60">
            Every job placed, from first enquiry through to delivery.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 bg-brand-navy px-5 py-3 text-xs font-black uppercase tracking-wide text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] transition-all hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" />
          New order
        </button>
      </header>

      <div className="grid gap-px border border-brand-navy/15 bg-brand-navy/15 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Package} label="Open orders" value={String(stats.openCount)} />
        <Stat
          icon={Wallet}
          label="Awaiting payment"
          value={String(stats.unpaidCount)}
          accent={stats.unpaidCount > 0}
        />
        <Stat
          icon={AlertTriangle}
          label="Value unpaid"
          value={kes(stats.unpaidValue)}
          accent={stats.unpaidValue > 0}
        />
        <Stat icon={TrendingUp} label="Booked in total" value={kes(stats.bookedValue)} />
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order number, customer name or email"
            className="w-full border-2 border-brand-navy/20 bg-white py-2.5 pl-9 pr-9 text-sm font-medium text-brand-navy outline-none transition-colors focus:border-brand-navy placeholder:text-brand-navy/35"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-navy/40 hover:text-brand-navy"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`shrink-0 border-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                filter === f.id
                  ? "border-brand-navy bg-brand-navy text-white"
                  : "border-brand-navy/15 bg-white text-brand-navy/60 hover:border-brand-navy/40 hover:text-brand-navy"
              }`}
            >
              {f.label}
              <span className={filter === f.id ? "ml-1.5 text-brand-orange" : "ml-1.5 text-brand-navy/35"}>
                {counts[f.id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-brand-navy" />
        </div>
      ) : query.isError ? (
        <ErrorBox message={(query.error as Error).message} />
      ) : filtered.length === 0 ? (
        <div className="border-2 border-dashed border-brand-navy/20 p-10 text-center sm:p-14">
          <Package className="mx-auto h-8 w-8 text-brand-navy/25" />
          <p className="mt-4 text-sm font-semibold text-brand-navy/60">
            {search || filter !== "all"
              ? "No orders match those filters."
              : "No orders yet. They will appear here the moment one lands."}
          </p>
          {(search || filter !== "all") ? (
            <button
              type="button"
              onClick={() => { setSearch(""); setFilter("all"); }}
              className="mt-4 text-xs font-bold uppercase tracking-wide text-brand-orange hover:text-brand-navy"
            >
              Clear filters
            </button>
          ) : (
            <button
              type="button"
              onClick={onCreate}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-orange hover:text-brand-navy"
            >
              <Plus className="h-3.5 w-3.5" />
              Create the first order
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-2.5 lg:hidden">
            {filtered.map((o) => (
              <OrderCard key={o.id} order={o} onOpen={() => onOpen(o.id)} />
            ))}
          </div>

          <div className="hidden overflow-hidden border-2 border-brand-navy lg:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-brand-navy text-[11px] font-black uppercase tracking-widest text-white">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Placed</th>
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const stale =
                    (o.payment_status === "unpaid" || o.payment_status === "pending") &&
                    daysOld(o.created_at) > 7 &&
                    !TERMINAL.includes(o.status);
                  return (
                    <tr
                      key={o.id}
                      onClick={() => onOpen(o.id)}
                      className="group cursor-pointer border-b border-brand-navy/10 transition-colors hover:bg-brand-surface"
                    >
                      <td className="px-4 py-4 align-middle">
                        <div className="font-mono text-xs font-bold text-brand-navy">
                          {o.order_number}
                        </div>
                        {stale && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-brand-orange">
                            <AlertTriangle className="h-3 w-3" />
                            {daysOld(o.created_at)} days unpaid
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-brand-navy">{o.customer_name}</span>
                          <ArtworkCount orderId={o.id} />
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-brand-navy/45">
                          {o.customer_email}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <StatusPill status={o.status} />
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <PaymentPill status={o.payment_status} />
                      </td>
                      <td className="px-4 py-4 text-right align-middle text-sm font-black tabular-nums text-brand-navy">
                        {kes(o.total)}
                      </td>
                      <td className="px-4 py-4 text-right align-middle text-[11px] text-brand-navy/45">
                        {ago(o.created_at)}
                      </td>
                      <td className="px-2 py-4 align-middle">
                        <ChevronRight className="h-4 w-4 text-brand-navy/25 transition-colors group-hover:text-brand-orange" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  icon: Icon, label, value, accent,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${accent ? "text-brand-orange" : "text-brand-navy/35"}`} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-navy/50">
          {label}
        </span>
      </div>
      <div
        className={`mt-1.5 text-xl font-black tabular-nums sm:text-2xl ${
          accent ? "text-brand-orange" : "text-brand-navy"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function OrderCard({ order: o, onOpen }: { order: OrderRow; onOpen: () => void }) {
  const stale =
    (o.payment_status === "unpaid" || o.payment_status === "pending") &&
    daysOld(o.created_at) > 7 &&
    !TERMINAL.includes(o.status);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full border-2 border-brand-navy/12 bg-white p-4 text-left transition-all hover:border-brand-navy active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-xs font-bold text-brand-navy">{o.order_number}</div>
          <div className="mt-1 truncate text-sm font-bold text-brand-navy">{o.customer_name}</div>
          <div className="truncate text-[11px] text-brand-navy/45">{o.customer_email}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-base font-black tabular-nums text-brand-navy">{kes(o.total)}</div>
          <div className="mt-0.5 text-[10px] text-brand-navy/40">{ago(o.created_at)}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-brand-navy/8 pt-3">
        <StatusPill status={o.status} />
        <PaymentPill status={o.payment_status} />
        {stale && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-brand-orange">
            <AlertTriangle className="h-3 w-3" />
            {daysOld(o.created_at)}d unpaid
          </span>
        )}
      </div>
    </button>
  );
}

function StatusPill({ status }: { status: OrderStatus }) {
  const isBad = status === "cancelled" || status === "refunded";
  const isDone = status === "completed" || status === "delivered";
  return (
    <span
      className={`inline-block whitespace-nowrap border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        isBad
          ? "border-brand-orange bg-brand-orange text-white"
          : isDone
            ? "border-brand-navy bg-brand-navy text-white"
            : "border-brand-navy/25 bg-white text-brand-navy/70"
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
      className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-bold uppercase tracking-wide ${
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
    <div className="flex max-w-lg items-start gap-2.5 border-2 border-brand-orange bg-brand-orange/8 p-4">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
      <span className="text-sm font-semibold text-brand-navy">{message}</span>
    </div>
  );
}

/* ----------------------------------------------------------- create form */

type DraftItem = {
  key: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  selected_color: string;
  selected_size: string;
  print_method: string;
  notes: string;
};

function CreateOrderForm({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [company, setCompany] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [status, setStatus] = useState<OrderStatus>("pending");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [internalNotes, setInternalNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([
    { key: crypto.randomUUID(), product_name: "", quantity: 1, unit_price: 0, selected_color: "", selected_size: "", print_method: "", notes: "" },
  ]);

  const subtotal = items.reduce((s, it) => s + (it.quantity * it.unit_price), 0);
  const total = subtotal + deliveryFee;

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { key: crypto.randomUUID(), product_name: "", quantity: 1, unit_price: 0, selected_color: "", selected_size: "", print_method: "", notes: "" },
    ]);
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!customerName.trim()) throw new Error("The customer needs a name.");
      if (!customerEmail.trim()) throw new Error("The customer needs an email.");

      const validItems = items.filter((it) => it.product_name.trim());
      if (validItems.length === 0) throw new Error("Add at least one line item.");

      let orderNumber = generateOrderNumber();
      let numberOk = false;
      while (!numberOk) {
        const { error: checkErr } = await supabase
          .from("orders")
          .select("id")
          .eq("order_number", orderNumber)
          .maybeSingle();
        if (checkErr) throw checkErr;
        if (!checkErr) {
          numberOk = true;
        } else {
          orderNumber = generateOrderNumber();
        }
      }

      const orderRow = {
        order_number: orderNumber,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        customer_phone: customerPhone.trim() || null,
        company: company.trim() || null,
        delivery_address: deliveryAddress.trim() || null,
        delivery_city: deliveryCity.trim() || null,
        delivery_notes: deliveryNotes.trim() || null,
        delivery_fee: deliveryFee,
        subtotal,
        total,
        currency: "KES",
        status,
        payment_status: paymentStatus,
        internal_notes: internalNotes.trim() || null,
      };

      const { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .insert(orderRow)
        .select("id")
        .single();

      if (orderErr) throw orderErr;
      const orderId = (orderData as { id: string }).id;

      const itemRows = validItems.map((it) => ({
        order_id: orderId,
        product_name: it.product_name.trim(),
        quantity: it.quantity,
        unit_price: it.unit_price,
        line_total: it.quantity * it.unit_price,
        selected_color: it.selected_color || null,
        selected_size: it.selected_size || null,
        print_method: it.print_method || null,
        notes: it.notes || null,
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
      if (itemsErr) throw itemsErr;

      await supabase.from("activity_log").insert({
        actor_id: profile?.id ?? null,
        actor_name: profile?.full_name ?? null,
        action: "create",
        entity: "order",
        entity_id: orderId,
        summary: `${orderNumber} created manually`,
      });

      return orderId;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      qc.invalidateQueries({ queryKey: ["admin", "metrics"] });
      onCreated(id);
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="min-w-0 space-y-6">
      <header className="sticky top-0 z-20 border-b-2 border-brand-navy bg-white pb-4 pt-5">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-navy/60 transition-colors hover:text-brand-orange"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All orders
        </button>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight text-brand-navy sm:text-2xl md:text-3xl">
              New order
            </h1>
            <p className="mt-1.5 text-sm text-brand-navy/55">
              Create an order directly, then add items and payment as you go.
            </p>
          </div>
          <div className="flex shrink-0 gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="border-2 border-brand-navy/20 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-brand-navy transition-colors hover:border-brand-navy"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => create.mutate()}
              disabled={create.isPending}
              className="inline-flex items-center gap-2 bg-brand-navy px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] transition-all hover:brightness-110 disabled:opacity-50"
            >
              {create.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Create order
            </button>
          </div>
        </div>
      </header>

      {error && <ErrorBox message={error} />}

      <SectionCard title="Customer" description="Who is this order for?">
        <div className="grid gap-6 md:grid-cols-2">
          <AdminField id="new-name" label="Name" required>
            <input
              id="new-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={inputCls}
              placeholder="Jane Wanjiku"
            />
          </AdminField>
          <AdminField id="new-email" label="Email" required>
            <input
              id="new-email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className={inputCls}
              placeholder="jane@company.co.ke"
            />
          </AdminField>
          <AdminField id="new-phone" label="Phone">
            <input
              id="new-phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className={`${inputCls} font-mono`}
              placeholder="0712 345 678"
            />
          </AdminField>
          <AdminField id="new-company" label="Company">
            <input
              id="new-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={inputCls}
              placeholder="Acme Ltd"
            />
          </AdminField>
        </div>
      </SectionCard>

      <SectionCard title="Line items" description="What is being ordered. The total updates as you type.">
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.key} className="border-2 border-brand-navy/12 p-3 sm:p-4">
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                <AdminField id={`item-name-${it.key}`} label="Product">
                  <input
                    id={`item-name-${it.key}`}
                    value={it.product_name}
                    onChange={(e) => updateItem(it.key, { product_name: e.target.value })}
                    className={inputCls}
                    placeholder="Embroidered Pique Polo"
                  />
                </AdminField>
                <AdminField id={`item-qty-${it.key}`} label="Qty">
                  <input
                    id={`item-qty-${it.key}`}
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => updateItem(it.key, { quantity: Math.max(1, Number(e.target.value)) })}
                    className={`${inputCls} tabular-nums`}
                  />
                </AdminField>
                <AdminField id={`item-price-${it.key}`} label="Unit price">
                  <input
                    id={`item-price-${it.key}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={it.unit_price}
                    onChange={(e) => updateItem(it.key, { unit_price: Number(e.target.value) })}
                    className={`${inputCls} tabular-nums`}
                  />
                </AdminField>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <AdminField id={`item-color-${it.key}`} label="Colour">
                  <input
                    id={`item-color-${it.key}`}
                    value={it.selected_color}
                    onChange={(e) => updateItem(it.key, { selected_color: e.target.value })}
                    className={inputCls}
                    placeholder="Navy"
                  />
                </AdminField>
                <AdminField id={`item-size-${it.key}`} label="Size">
                  <input
                    id={`item-size-${it.key}`}
                    value={it.selected_size}
                    onChange={(e) => updateItem(it.key, { selected_size: e.target.value })}
                    className={inputCls}
                    placeholder="XL"
                  />
                </AdminField>
                <AdminField id={`item-print-${it.key}`} label="Print method">
                  <input
                    id={`item-print-${it.key}`}
                    value={it.print_method}
                    onChange={(e) => updateItem(it.key, { print_method: e.target.value })}
                    className={inputCls}
                    placeholder="Screen Print"
                  />
                </AdminField>
              </div>

              <div className="mt-3 flex items-start gap-2">
                <textarea
                  value={it.notes}
                  onChange={(e) => updateItem(it.key, { notes: e.target.value })}
                  className={`${inputCls} min-w-0 flex-1`}
                  rows={2}
                  placeholder="Notes for this line item (optional)"
                />
                <button
                  type="button"
                  onClick={() => removeItem(it.key)}
                  disabled={items.length === 1}
                  className="grid h-9 w-9 shrink-0 place-items-center text-brand-navy/50 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-25"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-2 border-t border-brand-navy/8 pt-2 text-right text-sm font-black tabular-nums text-brand-navy">
                {kes(it.quantity * it.unit_price)}
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={addItem}
          className="mt-3 inline-flex items-center gap-1.5 border-2 border-brand-navy px-3 py-2 text-[11px] font-black uppercase tracking-wide text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          Add line item
        </button>
      </SectionCard>

      <SectionCard title="Delivery" description="Where should this order go?">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <AdminField id="new-addr" label="Delivery address">
              <input
                id="new-addr"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className={inputCls}
                placeholder="123 Westlands Road"
              />
            </AdminField>
          </div>
          <AdminField id="new-city" label="City">
            <input
              id="new-city"
              value={deliveryCity}
              onChange={(e) => setDeliveryCity(e.target.value)}
              className={inputCls}
              placeholder="Nairobi"
            />
          </AdminField>
          <AdminField id="new-fee" label="Delivery fee" hint="KES">
            <input
              id="new-fee"
              type="number"
              min={0}
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(Number(e.target.value))}
              className={`${inputCls} tabular-nums`}
            />
          </AdminField>
          <div className="md:col-span-2">
            <AdminField id="new-dnotes" label="Delivery notes">
              <textarea
                id="new-dnotes"
                rows={2}
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                className={inputCls}
                placeholder="Call before delivery"
              />
            </AdminField>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Settings" description="Initial status and internal notes.">
        <div className="grid gap-6 md:grid-cols-2">
          <AdminField id="new-status" label="Order status">
            <select
              id="new-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className={inputCls}
            >
              {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </AdminField>
          <AdminField id="new-paystatus" label="Payment status">
            <select
              id="new-paystatus"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
              className={inputCls}
            >
              {(Object.keys(PAYMENT_LABEL) as PaymentStatus[]).map((p) => (
                <option key={p} value={p}>{PAYMENT_LABEL[p]}</option>
              ))}
            </select>
          </AdminField>
          <div className="md:col-span-2">
            <AdminField id="new-inotes" label="Internal notes" hint="Staff only, customer never sees this">
              <textarea
                id="new-inotes"
                rows={3}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className={inputCls}
                placeholder="VIP client, priority handling"
              />
            </AdminField>
          </div>
        </div>
      </SectionCard>

      <div className="sticky bottom-0 flex items-center justify-between border-t-2 border-brand-navy bg-white py-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-brand-navy/50">Order total</span>
          <div className="text-2xl font-black tabular-nums text-brand-navy">{kes(total)}</div>
        </div>
        <button
          type="button"
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="inline-flex items-center gap-2 bg-brand-navy px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] transition-all hover:brightness-110 disabled:opacity-50"
        >
          {create.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Create order
        </button>
      </div>
    </div>
  );
}

function SectionCard({
  title, description, children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-2 border-brand-navy/12 bg-white p-4 sm:p-6">
      <div className="mb-5 border-b border-brand-navy/10 pb-3">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-brand-navy">{title}</h2>
        {description && <p className="mt-1 text-xs text-brand-navy/50">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/* ----------------------------------------------------------------- detail */

function OrderDetailView({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const order = useQuery({ queryKey: ["admin", "order", orderId], queryFn: () => fetchOrder(orderId) });
  const payments = useQuery({ queryKey: ["admin", "order-payments", orderId], queryFn: () => fetchPayments(orderId) });
  const jobs = useQuery({ queryKey: ["admin", "order-jobs", orderId], queryFn: () => fetchJobs(orderId) });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin", "order", orderId] });
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    qc.invalidateQueries({ queryKey: ["admin", "metrics"] });
  }

  const setStatus = useMutation({
    mutationFn: async (next: OrderStatus) => {
      const { error: e } = await supabase.from("orders").update({ status: next }).eq("id", orderId);
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
      const { error: e } = await supabase.from("orders").update({ payment_status: next }).eq("id", orderId);
      if (e) throw e;
    },
    onSuccess: refresh,
    onError: (e: Error) => setError(e.message),
  });

  const saveNotes = useMutation({
    mutationFn: async (notes: string) => {
      const { error: e } = await supabase.from("orders").update({ internal_notes: notes }).eq("id", orderId);
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
      const { error: e } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
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

  const deleteOrder = useMutation({
    mutationFn: async () => {
      const { error: e } = await supabase.from("orders").delete().eq("id", orderId);
      if (e) throw e;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      qc.invalidateQueries({ queryKey: ["admin", "metrics"] });
      onClose();
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
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-navy/60 hover:text-brand-orange"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All orders
        </button>
        <ErrorBox message={(order.error as Error)?.message ?? "Order not found."} />
      </div>
    );
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
    <div className="min-w-0 space-y-6">
      <header className="sticky top-0 z-20 border-b-2 border-brand-navy bg-white pb-4 pt-5">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-navy/60 transition-colors hover:text-brand-orange"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All orders
        </button>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-mono text-xl font-extrabold tracking-tight text-brand-navy sm:text-2xl md:text-3xl">
              {o.order_number}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <StatusPill status={o.status} />
              <PaymentPill status={o.payment_status} />
              <span className="text-[11px] text-brand-navy/45">{ago(o.created_at)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {nextStatus && !isTerminal && (
              <button
                type="button"
                onClick={() => setStatus.mutate(nextStatus)}
                disabled={setStatus.isPending}
                className="inline-flex items-center gap-1.5 bg-brand-navy px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] transition-all hover:brightness-110 disabled:opacity-50"
              >
                {setStatus.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Mark </span>
                {STATUS_LABEL[nextStatus]}
              </button>
            )}

            {!hasJob && !isTerminal && (
              <button
                type="button"
                onClick={() => createJob.mutate()}
                disabled={createJob.isPending}
                className="inline-flex items-center gap-1.5 border-2 border-brand-navy px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-brand-navy transition-colors hover:bg-brand-navy hover:text-white disabled:opacity-50"
              >
                {createJob.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Factory className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">To production</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="grid h-10 w-10 place-items-center border-2 border-brand-navy/20 text-brand-navy transition-colors hover:border-brand-navy"
              title="Print"
              aria-label="Print"
            >
              <Printer className="h-4 w-4" />
            </button>

            {!isTerminal && (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="grid h-10 w-10 place-items-center border-2 border-brand-navy/20 text-brand-navy/50 transition-colors hover:border-brand-orange hover:bg-brand-orange/8 hover:text-brand-orange"
                title="Cancel order"
                aria-label="Cancel order"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="grid h-10 w-10 place-items-center border-2 border-brand-navy/20 text-brand-navy/50 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
              title="Delete order"
              aria-label="Delete order"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {error && <ErrorBox message={error} />}

      <div className="flex items-start gap-3 border-2 border-brand-navy/12 bg-brand-surface p-4">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
        <div>
          <div className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
            Next step
          </div>
          <p className="mt-1 text-sm text-brand-navy/70">{STATUS_ACTION[o.status]}</p>
        </div>
      </div>

      <div className="grid gap-px border border-brand-navy/15 bg-brand-navy/15 sm:grid-cols-3">
        <Stat icon={FileText} label="Order total" value={kes(o.total)} />
        <Stat icon={Check} label="Paid so far" value={kes(paid)} />
        <Stat
          icon={Wallet}
          label={balance > 0 ? "Balance owing" : "Settled"}
          value={kes(balance > 0 ? balance : 0)}
          accent={balance > 0}
        />
      </div>

      <Timeline current={o.status} />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-8">
        <div className="space-y-6">
          <LineItems items={o.order_items} order={o} />

          <section className="border-2 border-brand-navy/12 bg-white">
            <div className="border-b border-brand-navy/10 bg-brand-surface px-4 py-3">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
                Artwork
              </h2>
              <p className="mt-0.5 text-[11px] text-brand-navy/50">
                Files sent with the order and anything uploaded since.
              </p>
            </div>
            <div className="p-4">
              <OrderArtworkPanel orderId={o.id} />
            </div>
          </section>

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

        <div className="space-y-6">
          <CustomerPanel order={o} />
          <ProductionPanel query={jobs} />
          <InternalNotes
            initial={o.internal_notes ?? ""}
            onSave={(v) => saveNotes.mutate(v)}
            isSaving={saveNotes.isPending}
          />
          <StatusOverride
            current={o.status}
            paymentStatus={o.payment_status}
            onStatus={(s) => setStatus.mutate(s)}
            onPayment={(p) => setPaymentStatus.mutate(p)}
            isPending={setStatus.isPending || setPaymentStatus.isPending}
          />
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

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${o.order_number}?`}
          body="This permanently removes the order and all its line items, payments, production jobs and artwork. This cannot be undone."
          confirmLabel="Delete order"
          isPending={deleteOrder.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => deleteOrder.mutate()}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------- timeline */

function Timeline({ current }: { current: OrderStatus }) {
  if (TERMINAL.includes(current) && current !== "completed") {
    return (
      <div className="border-2 border-brand-orange bg-brand-orange/8 p-4">
        <p className="text-sm font-black uppercase tracking-wide text-brand-orange">
          {STATUS_LABEL[current]}
        </p>
        <p className="mt-1 text-sm text-brand-navy/70">
          This order is closed and will not move further.
        </p>
      </div>
    );
  }

  const idx = FLOW.indexOf(current);
  const pct = idx >= 0 ? ((idx + 1) / FLOW.length) * 100 : 0;

  return (
    <section className="border-2 border-brand-navy/12 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
          Progress
        </span>
        <span className="text-[11px] font-bold tabular-nums text-brand-navy/50">
          Step {idx + 1} of {FLOW.length}
        </span>
      </div>

      <div className="mt-3 h-2 w-full bg-brand-navy/10">
        <div
          className="h-full bg-brand-orange transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-4">
        <span className="text-sm font-bold text-brand-navy">{STATUS_LABEL[current]}</span>
        {idx < FLOW.length - 1 && (
          <span className="text-right text-[11px] text-brand-navy/45">
            Next: {STATUS_LABEL[FLOW[idx + 1]]}
          </span>
        )}
      </div>

      <div className="mt-4 overflow-x-auto border-t border-brand-navy/10 pt-4">
        <ol className="flex min-w-max gap-1">
          {FLOW.map((s, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <li key={s} className="flex items-center gap-1">
                <span
                  className={`whitespace-nowrap px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    active
                      ? "bg-brand-orange text-white"
                      : done
                        ? "bg-brand-navy/10 text-brand-navy/60"
                        : "text-brand-navy/25"
                  }`}
                >
                  {STATUS_LABEL[s]}
                </span>
                {i < FLOW.length - 1 && (
                  <ChevronRight className="h-3 w-3 shrink-0 text-brand-navy/15" />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ line items */

function LineItems({ items, order }: { items: OrderItem[]; order: OrderDetail }) {
  return (
    <section className="border-2 border-brand-navy/12 bg-white">
      <div className="border-b border-brand-navy/10 bg-brand-surface px-4 py-3">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
          What was ordered
        </h2>
      </div>

      {items.length === 0 ? (
        <p className="p-6 text-sm text-brand-navy/45">No line items recorded on this order.</p>
      ) : (
        <ul className="divide-y divide-brand-navy/8">
          {items.map((it) => (
            <li key={it.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-brand-navy">{it.product_name}</div>

                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {[it.selected_color, it.selected_size, it.print_method]
                      .filter(Boolean)
                      .map((v) => (
                        <span
                          key={v}
                          className="border border-brand-navy/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-navy/60"
                        >
                          {v}
                        </span>
                      ))}
                  </div>

                  {it.notes && (
                    <p className="mt-2 text-xs leading-relaxed text-brand-navy/55">{it.notes}</p>
                  )}

                  {it.artwork_url && (
                    <a
                      href={it.artwork_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 border border-brand-navy/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-navy transition-colors hover:border-brand-orange hover:text-brand-orange"
                    >
                      <FileText className="h-3 w-3" />
                      View artwork
                    </a>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-sm font-black tabular-nums text-brand-navy">
                    {kes(it.line_total)}
                  </div>
                  <div className="mt-0.5 text-[11px] tabular-nums text-brand-navy/45">
                    {it.quantity} x {kes(it.unit_price)}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-1.5 border-t-2 border-brand-navy bg-brand-surface px-4 py-4">
        <div className="flex justify-between text-sm">
          <span className="text-brand-navy/60">Subtotal</span>
          <span className="tabular-nums text-brand-navy">{kes(order.subtotal)}</span>
        </div>
        {Number(order.delivery_fee) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-brand-navy/60">Delivery</span>
            <span className="tabular-nums text-brand-navy">{kes(order.delivery_fee)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-brand-navy/15 pt-2">
          <span className="text-xs font-black uppercase tracking-wide text-brand-navy">Total</span>
          <span className="text-lg font-black tabular-nums text-brand-navy">{kes(order.total)}</span>
        </div>
      </div>
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
    <section className="border-2 border-brand-navy/12 bg-white">
      <div className="flex items-center justify-between border-b border-brand-navy/10 bg-brand-surface px-4 py-3">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
          Payments
        </h2>
        {!recording && (
          <button
            type="button"
            onClick={() => {
              setAmount(balance > 0 ? balance : orderTotal);
              setRecording(true);
            }}
            className="inline-flex items-center gap-1.5 border-2 border-brand-navy px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Record
          </button>
        )}
      </div>

      {recording && (
        <div className="border-b border-brand-navy/10 bg-brand-surface/40 p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminField id="pay-amt" label="Amount">
              <input
                id="pay-amt"
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className={`${inputCls} tabular-nums`}
              />
            </AdminField>
            <AdminField id="pay-method" label="Method">
              <select
                id="pay-method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className={inputCls}
              >
                <option value="mpesa">M-Pesa</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="cash">Cash</option>
              </select>
            </AdminField>
            <AdminField id="pay-ref" label="Reference" hint="Receipt or txn ID">
              <input
                id="pay-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className={`${inputCls} font-mono`}
                placeholder="SJK7HG92LM"
              />
            </AdminField>
          </div>

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => record.mutate()}
              disabled={record.isPending}
              className="inline-flex items-center justify-center gap-2 bg-brand-navy px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white transition-all hover:brightness-110 disabled:opacity-50"
            >
              {record.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Save payment
            </button>
            <button
              type="button"
              onClick={() => setRecording(false)}
              className="border-2 border-brand-navy/20 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-brand-navy transition-colors hover:border-brand-navy"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {query.isLoading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-brand-navy/40" />
        </div>
      ) : payments.length === 0 ? (
        <p className="p-6 text-sm text-brand-navy/45">
          Nothing paid yet. Record a payment once the money lands.
        </p>
      ) : (
        <ul className="divide-y divide-brand-navy/8">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-brand-navy/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-navy/60">
                    {p.method}
                  </span>
                  {p.is_refund && (
                    <span className="bg-brand-orange px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                      Refund
                    </span>
                  )}
                  {p.status !== "paid" && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-brand-orange">
                      {p.status}
                    </span>
                  )}
                </div>
                {(p.mpesa_receipt || p.reference) && (
                  <div className="mt-1 font-mono text-[11px] text-brand-navy/50">
                    {p.mpesa_receipt ?? p.reference}
                  </div>
                )}
                <div className="mt-0.5 text-[11px] text-brand-navy/40">
                  {when(p.paid_at ?? p.created_at)}
                </div>
              </div>
              <span
                className={`shrink-0 text-sm font-black tabular-nums ${
                  p.is_refund ? "text-brand-orange" : "text-brand-navy"
                }`}
              >
                {p.is_refund ? "-" : ""}
                {kesExact(p.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* -------------------------------------------------------------- customer */

function CustomerPanel({ order }: { order: OrderDetail }) {
  return (
    <section className="border-2 border-brand-navy/12 bg-white">
      <div className="border-b border-brand-navy/10 bg-brand-surface px-4 py-3">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
          Customer
        </h2>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start gap-2.5">
          <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-navy/35" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-brand-navy">{order.customer_name}</div>
            {order.user_id === null && (
              <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wide text-brand-orange">
                Guest, no account
              </span>
            )}
          </div>
        </div>

        <a
          href={`mailto:${order.customer_email}`}
          className="flex items-center gap-2.5 text-brand-navy/70 transition-colors hover:text-brand-orange"
        >
          <Mail className="h-3.5 w-3.5 shrink-0 text-brand-navy/35" />
          <span className="min-w-0 truncate font-mono text-xs">{order.customer_email}</span>
        </a>

        {order.customer_phone && (
          <a
            href={`tel:${order.customer_phone}`}
            className="flex items-center gap-2.5 text-brand-navy/70 transition-colors hover:text-brand-orange"
          >
            <Phone className="h-3.5 w-3.5 shrink-0 text-brand-navy/35" />
            <span className="font-mono text-xs">{order.customer_phone}</span>
          </a>
        )}

        {order.company && (
          <div className="flex items-center gap-2.5">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-brand-navy/35" />
            <span className="text-xs text-brand-navy/70">{order.company}</span>
          </div>
        )}
      </div>

      {(order.delivery_address || order.delivery_city) && (
        <div className="border-t border-brand-navy/10 p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-navy">
            <MapPin className="h-3.5 w-3.5 text-brand-orange" />
            Delivery
          </div>
          <p className="mt-2 text-sm leading-relaxed text-brand-navy/70">
            {order.delivery_address}
            {order.delivery_city && (
              <>
                <br />
                {order.delivery_city}
              </>
            )}
          </p>
          {order.delivery_notes && (
            <p className="mt-2 border-l-2 border-brand-orange/40 pl-2.5 text-xs leading-relaxed text-brand-navy/55">
              {order.delivery_notes}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------- status override */

function StatusOverride({
  current, paymentStatus, onStatus, onPayment, isPending,
}: {
  current: OrderStatus;
  paymentStatus: PaymentStatus;
  onStatus: (s: OrderStatus) => void;
  onPayment: (p: PaymentStatus) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="border-2 border-brand-navy/12 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between bg-brand-surface px-4 py-3 text-left"
      >
        <h2 className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
          Manual override
        </h2>
        <ChevronDown
          className={`h-4 w-4 text-brand-navy/40 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-brand-navy/10 p-4">
          <AdminField id="ov-status" label="Order status" hint="Jumps outside the normal flow">
            <select
              id="ov-status"
              value={current}
              disabled={isPending}
              onChange={(e) => onStatus(e.target.value as OrderStatus)}
              className={inputCls}
            >
              {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField id="ov-pay" label="Payment status">
            <select
              id="ov-pay"
              value={paymentStatus}
              disabled={isPending}
              onChange={(e) => onPayment(e.target.value as PaymentStatus)}
              className={inputCls}
            >
              {(Object.keys(PAYMENT_LABEL) as PaymentStatus[]).map((p) => (
                <option key={p} value={p}>
                  {PAYMENT_LABEL[p]}
                </option>
              ))}
            </select>
          </AdminField>

          <p className="border-l-2 border-brand-orange/40 pl-2.5 text-xs leading-relaxed text-brand-navy/50">
            Setting payment to Paid here does not record a payment. Use the payments panel so the
            money is on the books.
          </p>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------ production */

const STAGE_LABEL: Record<string, string> = {
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

function ProductionPanel({ query }: { query: ReturnType<typeof useQuery<Job[]>> }) {
  const jobs = query.data ?? [];

  return (
    <section className="border-2 border-brand-navy/12 bg-white">
      <div className="border-b border-brand-navy/10 bg-brand-surface px-4 py-3">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
          Production
        </h2>
      </div>

      {query.isLoading ? (
        <div className="grid place-items-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-brand-navy/40" />
        </div>
      ) : jobs.length === 0 ? (
        <p className="p-4 text-sm text-brand-navy/45">
          Not on the floor yet. Send it to production once the artwork is settled.
        </p>
      ) : (
        <ul className="divide-y divide-brand-navy/8">
          {jobs.map((j) => (
            <li key={j.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Factory className="h-3.5 w-3.5 text-brand-orange" />
                <span className="text-sm font-bold text-brand-navy">
                  {STAGE_LABEL[j.stage] ?? j.stage}
                </span>
                {j.priority !== "normal" && (
                  <span className="bg-brand-orange px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                    {j.priority}
                  </span>
                )}
              </div>
              {j.expected_at && (
                <div className="mt-1.5 flex items-center gap-1 text-[11px] text-brand-navy/50">
                  <Clock className="h-3 w-3" />
                  Due{" "}
                  {new Date(j.expected_at).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              )}
              {j.notes && (
                <p className="mt-1.5 text-xs leading-relaxed text-brand-navy/55">{j.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ----------------------------------------------------------------- notes */

function InternalNotes({
  initial, onSave, isSaving,
}: {
  initial: string;
  onSave: (v: string) => void;
  isSaving: boolean;
}) {
  const [value, setValue] = useState(initial);
  const dirty = value !== initial;

  return (
    <section className="border-2 border-brand-navy/12 bg-white">
      <div className="border-b border-brand-navy/10 bg-brand-surface px-4 py-3">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
          Internal notes
        </h2>
        <p className="mt-0.5 text-[11px] text-brand-navy/50">
          Staff only. The customer never sees this.
        </p>
      </div>

      <div className="p-4">
        <textarea
          rows={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Client wants the logo 10% larger than the proof. Confirmed on the phone."
          className={`${inputCls} leading-relaxed`}
        />

        {dirty && (
          <button
            type="button"
            onClick={() => onSave(value)}
            disabled={isSaving}
            className="mt-3 inline-flex items-center gap-2 bg-brand-navy px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white transition-all hover:brightness-110 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Save note
          </button>
        )}
      </div>
    </section>
  );
}

export const Route = createFileRoute("/admin/orders")({
  component: OrdersPage,
});