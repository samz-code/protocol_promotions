import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import {
  AdminHeader, AdminLoading, AdminError, AdminEmpty, StatusBadge,
  ConfirmDialog, AdminField, inputCls, kes, ago,
} from "@/lib/admin-ui";
import {
  Plus, Trash2, Pencil, X, Loader2, Check, User, Search, Wallet,
  Clock, Inbox, Settings2, Smartphone, Building2, FileText, GripVertical,
  CheckCircle2, XCircle, CreditCard, Eye, EyeOff,
} from "lucide-react";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "Payments | Admin" }] }),
  component: PaymentsPage,
});

/* ------------------------------------------------------------------ types */

type Payment = {
  id: string;
  amount: number;
  method: string;
  status: string;
  reference: string | null;
  mpesa_receipt: string | null;
  paid_at: string | null;
  created_at: string;
  order_id: string | null;
  orders: { order_number: string; customer_name: string } | null;
};

type Submission = {
  id: string;
  user_id: string | null;
  order_id: string | null;
  channel_kind: string | null;
  amount: number | null;
  mpesa_code: string | null;
  reference: string | null;
  paid_at: string | null;
  raw_message: string | null;
  status: string;
  review_note: string | null;
  created_at: string;
  orders: { order_number: string; customer_name: string } | null;
};

type Channel = {
  id: string;
  kind: string;
  label: string;
  account_name: string | null;
  identifier: string | null;
  extra: string | null;
  instructions: string | null;
  sort_order: number;
  is_active: boolean;
};

type OrderOption = {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
};

const CHANNEL_KINDS = [
  { value: "paybill", label: "M-Pesa Paybill" },
  { value: "till", label: "Lipa na M-Pesa Till" },
  { value: "send_money", label: "M-Pesa Send Money" },
  { value: "bank", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
];

/**
 * payment_channels.kind has more granularity (paybill / till / send_money)
 * than the payments.method DB enum, which only knows about
 * mpesa / cash / bank_transfer / cheque / card. Every M-Pesa-family channel
 * kind must collapse down to "mpesa" here, or inserting a payment record
 * from a confirmed submission throws "invalid input value for enum
 * payment_method".
 */
const CHANNEL_TO_METHOD: Record<string, string> = {
  paybill: "mpesa",
  till: "mpesa",
  send_money: "mpesa",
  bank: "bank_transfer",
  cheque: "cheque",
  card: "card",
};

function methodForChannelKind(kind: string | null): string {
  if (!kind) return "mpesa";
  return CHANNEL_TO_METHOD[kind] ?? "mpesa";
}

const KIND_ICON: Record<string, typeof Smartphone> = {
  paybill: Smartphone,
  till: Smartphone,
  send_money: Smartphone,
  bank: Building2,
  cheque: FileText,
  card: CreditCard,
};

/** Logo files live in /public. Spaces are encoded so the URL resolves. */
const KIND_LOGO: Record<string, string> = {
  paybill: "/paybill.png",
  till: "/till.png",
  send_money: "/M-pesa.png",
  bank: "/Equitybank.png",
  cheque: "/Cheque.png",
};

/** Shows the real logo, falling back to an icon if the file is missing. */
function ChannelLogo({
  kind, label, dimmed,
}: {
  kind: string;
  label: string;
  dimmed?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = KIND_LOGO[kind];
  const Icon = KIND_ICON[kind] ?? Smartphone;

  if (!src || failed) {
    return (
      <div
        className={`grid h-12 w-12 shrink-0 place-items-center border-2 ${
          dimmed ? "border-brand-navy/10 bg-white" : "border-brand-navy/15 bg-brand-surface"
        }`}
      >
        <Icon className={`h-4 w-4 ${dimmed ? "text-brand-navy/30" : "text-brand-navy"}`} />
      </div>
    );
  }

  return (
    <div
      className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden border-2 bg-white p-1.5 ${
        dimmed ? "border-brand-navy/10 opacity-45" : "border-brand-navy/15"
      }`}
    >
      <img
        src={src}
        alt={label}
        onError={() => setFailed(true)}
        className="h-full w-full object-contain"
      />
    </div>
  );
}

/* --------------------------------------------------------------- queries */

async function fetchPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, amount, method, status, reference, mpesa_receipt, paid_at, created_at, order_id, orders(order_number, customer_name)"
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as unknown as Payment[];
}

async function fetchSubmissions(): Promise<Submission[]> {
  const { data, error } = await supabase
    .from("payment_submissions")
    .select(
      "id, user_id, order_id, channel_kind, amount, mpesa_code, reference, paid_at, raw_message, status, review_note, created_at, orders(order_number, customer_name)"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as Submission[];
}

async function fetchChannels(): Promise<Channel[]> {
  const { data, error } = await supabase
    .from("payment_channels")
    .select("id, kind, label, account_name, identifier, extra, instructions, sort_order, is_active")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Channel[];
}

async function fetchOrderOptions(): Promise<OrderOption[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, total")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as OrderOption[];
}

/* ------------------------------------------------------------------- page */

type Tab = "payments" | "submissions" | "channels";

function PaymentsPage() {
  const [tab, setTab] = useState<Tab>("payments");

  const submissions = useQuery({ queryKey: ["admin", "payment-submissions"], queryFn: fetchSubmissions });
  const pendingCount = (submissions.data ?? []).filter((s) => s.status === "pending").length;

  const TABS: { id: Tab; label: string; icon: typeof Wallet; badge?: number }[] = [
    { id: "payments", label: "Payments", icon: Wallet },
    { id: "submissions", label: "To review", icon: Inbox, badge: pendingCount },
    { id: "channels", label: "How customers pay", icon: Settings2 },
  ];

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Payments"
        subtitle="Record money received, review customer notifications, and manage how people can pay you."
      />

      <nav className="flex flex-wrap gap-1 border-b-2 border-brand-navy/15">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-0.5 inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black uppercase tracking-wide transition-colors ${
              tab === t.id
                ? "border-brand-orange text-brand-navy"
                : "border-transparent text-brand-navy/40 hover:text-brand-navy"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {t.badge ? (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-orange px-1 text-[10px] font-black text-white">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {tab === "payments" && <PaymentsTab />}
      {tab === "submissions" && <SubmissionsTab query={submissions} />}
      {tab === "channels" && <ChannelsTab />}
    </div>
  );
}

/* --------------------------------------------------------- payments tab */

function PaymentsTab() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "payments"], queryFn: fetchPayments });
  const orders = useQuery({ queryKey: ["admin", "order-options"], queryFn: fetchOrderOptions });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [search, setSearch] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "payments"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => setErr(e.message),
  });

  const all = query.data ?? [];

  const stats = useMemo(() => {
    const paid = all.filter((p) => p.status === "paid" && p.amount > 0);
    return {
      collected: paid.reduce((s, p) => s + Number(p.amount), 0),
      count: all.length,
      pending: all.filter((p) => p.status !== "paid").length,
    };
  }, [all]);

  const rows = useMemo(() => {
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      (p) =>
        (p.orders?.order_number ?? "").toLowerCase().includes(q) ||
        (p.orders?.customer_name ?? "").toLowerCase().includes(q) ||
        (p.mpesa_receipt ?? "").toLowerCase().includes(q) ||
        (p.reference ?? "").toLowerCase().includes(q)
    );
  }, [all, search]);

  if (query.isLoading) return <AdminLoading />;
  if (query.isError) return <AdminError message={(query.error as Error).message} />;

  return (
    <div className="space-y-5">
      {err && <AdminError message={err} />}

      <div className="grid gap-px border border-brand-navy/15 bg-brand-navy/15 sm:grid-cols-3">
        <MiniStat label="Collected" value={kes(stats.collected)} accent />
        <MiniStat label="Payment records" value={String(stats.count)} />
        <MiniStat label="Not yet paid" value={String(stats.pending)} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order, customer or receipt"
            className={`${inputCls} pl-9`}
          />
        </div>
        <button
          type="button"
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="inline-flex items-center justify-center gap-2 bg-brand-navy px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] transition-all hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          Record payment
        </button>
      </div>

      {rows.length === 0 ? (
        <AdminEmpty
          text={
            search
              ? "No payments match that search."
              : "No payments recorded yet. Add one when money lands."
          }
        />
      ) : (
        <>
          {/* Cards on mobile */}
          <div className="space-y-2.5 lg:hidden">
            {rows.map((p) => (
              <div key={p.id} className="border-2 border-brand-navy/12 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-brand-navy">
                      {p.orders?.customer_name ?? "Direct payment"}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-brand-orange">
                      {p.orders?.order_number ?? "Unlinked"}
                    </div>
                    {(p.mpesa_receipt || p.reference) && (
                      <div className="mt-1 font-mono text-[11px] text-brand-navy/45">
                        {p.mpesa_receipt ?? p.reference}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-black tabular-nums text-brand-navy">
                    {kes(Number(p.amount))}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-brand-navy/8 pt-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge label={p.method} />
                    <StatusBadge label={p.status} tone={p.status === "paid" ? "good" : "warn"} />
                  </div>
                  <div className="flex gap-1">
                    <IconBtn onClick={() => { setEditing(p); setFormOpen(true); }} label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn onClick={() => setDeleteTarget(p)} label="Delete" danger>
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconBtn>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Table on desktop */}
          <div className="hidden overflow-x-auto border-2 border-brand-navy lg:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-brand-navy text-[11px] font-black uppercase tracking-widest text-white">
                  <th className="px-4 py-3">Customer / Order</th>
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="w-24 px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-navy/10">
                {rows.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-brand-surface/40">
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-navy">
                        <User className="h-3 w-3 text-brand-navy/35" />
                        {p.orders?.customer_name ?? "Direct payment"}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] font-black text-brand-orange">
                        {p.orders?.order_number ?? "Unlinked"}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-brand-navy/60">
                      {p.mpesa_receipt ?? p.reference ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={p.method} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={p.status} tone={p.status === "paid" ? "good" : "warn"} />
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-navy/50">
                      {ago(p.paid_at ?? p.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right font-black tabular-nums text-brand-navy">
                      {kes(Number(p.amount))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex gap-1">
                        <IconBtn onClick={() => { setEditing(p); setFormOpen(true); }} label="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn onClick={() => setDeleteTarget(p)} label="Delete" danger>
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {formOpen && (
        <PaymentForm
          existing={editing}
          orders={orders.data ?? []}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin", "payments"] });
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this payment record?"
          body={`This removes the ${kes(Number(deleteTarget.amount))} record permanently. The order itself is not affected, but your books will no longer show this money.`}
          confirmLabel="Delete record"
          isPending={del.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => del.mutate(deleteTarget.id)}
        />
      )}
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-white p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-brand-navy/50">
        {label}
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

function IconBtn({
  onClick, children, label, danger,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`grid h-8 w-8 place-items-center border-2 border-transparent text-brand-navy/50 transition-colors ${
        danger
          ? "hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          : "hover:border-brand-navy/15 hover:bg-brand-surface hover:text-brand-navy"
      }`}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------- payment create/edit */

function PaymentForm({
  existing, orders, onClose, onSaved,
}: {
  existing: Payment | null;
  orders: OrderOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [method, setMethod] = useState(existing?.method ?? "mpesa");
  const [status, setStatus] = useState(existing?.status ?? "paid");
  const [orderId, setOrderId] = useState(existing?.order_id ?? "");
  const [reference, setReference] = useState(existing?.mpesa_receipt ?? existing?.reference ?? "");
  const [orderSearch, setOrderSearch] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const matches = useMemo(() => {
    if (!orderSearch.trim()) return orders.slice(0, 8);
    const q = orderSearch.toLowerCase();
    return orders
      .filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [orders, orderSearch]);

  const chosen = orders.find((o) => o.id === orderId) ?? null;

  const save = useMutation({
    mutationFn: async () => {
      const value = parseFloat(amount);
      if (isNaN(value) || value <= 0) throw new Error("Enter an amount greater than zero.");

      const row = {
        amount: value,
        method,
        status,
        order_id: orderId || null,
        reference: reference.trim() || null,
        mpesa_receipt: method === "mpesa" ? reference.trim() || null : null,
        paid_at: status === "paid" ? new Date().toISOString() : null,
      };

      if (existing) {
        const { error } = await supabase.from("payments").update(row).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payments").insert(row);
        if (error) throw error;
      }

      // Settle the order when this payment covers it.
      if (orderId && status === "paid") {
        const order = orders.find((o) => o.id === orderId);
        if (order && value >= Number(order.total)) {
          await supabase
            .from("orders")
            .update({ payment_status: "paid", status: "paid" })
            .eq("id", orderId);
        }
      }
    },
    onSuccess: onSaved,
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-brand-navy/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="my-auto flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden border-2 border-brand-navy bg-white shadow-[8px_8px_0_0_var(--color-brand-navy)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b-2 border-brand-navy px-5 py-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-brand-navy">
            {existing ? "Edit payment" : "Record a payment"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center border-2 border-brand-navy/20 text-brand-navy transition-colors hover:border-brand-navy"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-5">
          {err && <AdminError message={err} />}

          <AdminField id="pf-amount" label="Amount received" required>
            <input
              id="pf-amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5000"
              className={`${inputCls} text-lg font-bold tabular-nums`}
            />
          </AdminField>

          {/* Order picker, searchable rather than a raw UUID box */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-brand-navy">
              Against which order
            </label>

            {chosen ? (
              <div className="flex items-center justify-between gap-3 border-2 border-brand-navy bg-brand-surface px-3 py-2.5">
                <div className="min-w-0">
                  <div className="font-mono text-xs font-bold text-brand-navy">
                    {chosen.order_number}
                  </div>
                  <div className="truncate text-[11px] text-brand-navy/55">
                    {chosen.customer_name} · {kes(chosen.total)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setOrderId(""); setOrderSearch(""); }}
                  className="shrink-0 text-brand-navy/40 hover:text-brand-orange"
                  aria-label="Clear order"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy/40" />
                  <input
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search order number or customer"
                    className={`${inputCls} pl-9`}
                  />
                </div>
                {matches.length > 0 && (
                  <ul className="mt-1.5 max-h-44 overflow-y-auto border-2 border-brand-navy/15">
                    {matches.map((o) => (
                      <li key={o.id}>
                        <button
                          type="button"
                          onClick={() => setOrderId(o.id)}
                          className="flex w-full items-center justify-between gap-3 border-b border-brand-navy/8 px-3 py-2 text-left transition-colors last:border-0 hover:bg-brand-surface"
                        >
                          <span className="min-w-0">
                            <span className="block font-mono text-xs font-bold text-brand-navy">
                              {o.order_number}
                            </span>
                            <span className="block truncate text-[11px] text-brand-navy/55">
                              {o.customer_name}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-bold tabular-nums text-brand-navy/70">
                            {kes(o.total)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-1.5 text-[11px] text-brand-navy/45">
                  Leave empty for a payment not tied to an order.
                </p>
              </>
            )}
          </div>

          <AdminField id="pf-method" label="Method">
            <select
              id="pf-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className={inputCls}
            >
              <option value="mpesa">M-Pesa</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="cheque">Cheque</option>
              <option value="card">Card</option>
            </select>
          </AdminField>

          <AdminField
            id="pf-ref"
            label={method === "mpesa" ? "M-Pesa code" : "Reference"}
            hint="The receipt or transaction number"
          >
            <input
              id="pf-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value.toUpperCase())}
              placeholder={method === "mpesa" ? "SJK7HG92LM" : "Cheque or transfer ref"}
              className={`${inputCls} font-mono`}
            />
          </AdminField>

          <AdminField id="pf-status" label="Status">
            <select
              id="pf-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputCls}
            >
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </AdminField>

          {orderId && status === "paid" && (
            <p className="border-l-2 border-brand-orange/40 pl-2.5 text-xs leading-relaxed text-brand-navy/55">
              If this covers the order total, the order is marked paid automatically.
            </p>
          )}

          <button
            type="button"
            onClick={() => { setErr(null); save.mutate(); }}
            disabled={save.isPending}
            className="inline-flex w-full items-center justify-center gap-2 bg-brand-navy py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:brightness-110 disabled:opacity-50"
          >
            {save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {existing ? "Update record" : "Save payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------ submissions tab */

function SubmissionsTab({ query }: { query: ReturnType<typeof useQuery<Submission[]>> }) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const review = useMutation({
    mutationFn: async ({
      sub, decision, note,
    }: {
      sub: Submission;
      decision: "verified" | "rejected";
      note?: string;
    }) => {
      const { error } = await supabase
        .from("payment_submissions")
        .update({
          status: decision,
          reviewed_by: profile?.id ?? null,
          reviewed_at: new Date().toISOString(),
          review_note: note ?? null,
        })
        .eq("id", sub.id);
      if (error) throw error;

      // Confirming a submission books the money as a real payment.
      if (decision === "verified") {
        const { error: payErr } = await supabase.from("payments").insert({
          order_id: sub.order_id,
          amount: sub.amount ?? 0,
          method: methodForChannelKind(sub.channel_kind),
          status: "paid",
          reference: sub.mpesa_code ?? sub.reference,
          mpesa_receipt: sub.mpesa_code,
          paid_at: sub.paid_at ? new Date(sub.paid_at).toISOString() : new Date().toISOString(),
        });
        if (payErr) throw payErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "payment-submissions"] });
      qc.invalidateQueries({ queryKey: ["admin", "payments"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  if (query.isLoading) return <AdminLoading />;
  if (query.isError) return <AdminError message={(query.error as Error).message} />;

  const all = query.data ?? [];
  const list = filter === "pending" ? all.filter((s) => s.status === "pending") : all;

  return (
    <div className="space-y-5">
      {err && <AdminError message={err} />}

      <div className="flex items-center gap-3">
        <p className="flex-1 text-sm text-brand-navy/60">
          Customers tell you here when they have paid. Confirm one and it is booked as a payment
          automatically.
        </p>
        <button
          type="button"
          onClick={() => setFilter(filter === "pending" ? "all" : "pending")}
          className="shrink-0 border-2 border-brand-navy/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-navy transition-colors hover:border-brand-navy"
        >
          {filter === "pending" ? "Show all" : "Pending only"}
        </button>
      </div>

      {list.length === 0 ? (
        <AdminEmpty
          text={
            filter === "pending"
              ? "Nothing waiting. Customer payment notifications appear here."
              : "No payment notifications yet."
          }
        />
      ) : (
        <ul className="space-y-3">
          {list.map((s) => (
            <SubmissionCard
              key={s.id}
              sub={s}
              busy={review.isPending}
              onVerify={() => review.mutate({ sub: s, decision: "verified" })}
              onReject={(note) => review.mutate({ sub: s, decision: "rejected", note })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SubmissionCard({
  sub, busy, onVerify, onReject,
}: {
  sub: Submission;
  busy: boolean;
  onVerify: () => void;
  onReject: (note: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const pending = sub.status === "pending";

  return (
    <li className="border-2 border-brand-navy/12 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-black text-brand-navy">
              {sub.mpesa_code ?? sub.reference ?? "No code given"}
            </span>
            <StatusBadge
              label={
                sub.status === "verified" ? "Confirmed" : sub.status === "rejected" ? "Rejected" : "Pending"
              }
              tone={sub.status === "verified" ? "good" : sub.status === "rejected" ? "neutral" : "warn"}
            />
          </div>

          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-brand-navy/55">
            <span>{sub.orders?.customer_name ?? "Unknown customer"}</span>
            {sub.orders?.order_number && (
              <span className="font-mono text-brand-orange">{sub.orders.order_number}</span>
            )}
            {sub.channel_kind && <span className="capitalize">{sub.channel_kind.replace("_", " ")}</span>}
            <span>{ago(sub.created_at)}</span>
          </div>

          {sub.raw_message && (
            <p className="mt-2.5 border-l-2 border-brand-navy/15 bg-brand-surface/50 px-3 py-2 text-[11px] leading-relaxed text-brand-navy/70">
              {sub.raw_message}
            </p>
          )}

          {sub.review_note && (
            <p className="mt-2 text-[11px] text-brand-navy/50">Note: {sub.review_note}</p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div className="text-lg font-black tabular-nums text-brand-navy">
            {sub.amount != null ? kes(sub.amount) : "No amount"}
          </div>
          {sub.paid_at && (
            <div className="mt-0.5 text-[11px] text-brand-navy/45">
              Paid {new Date(sub.paid_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
            </div>
          )}
        </div>
      </div>

      {pending && (
        <div className="border-t border-brand-navy/10 bg-brand-surface/40 p-3">
          {rejecting ? (
            <div className="space-y-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why does this not match? The customer sees this."
                className={inputCls}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onReject(note)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 bg-red-600 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-white transition-all hover:brightness-110 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
                <button
                  type="button"
                  onClick={() => setRejecting(false)}
                  className="border-2 border-brand-navy/20 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-brand-navy"
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onVerify}
                disabled={busy}
                className="inline-flex items-center gap-1.5 bg-brand-navy px-4 py-2 text-[11px] font-black uppercase tracking-wide text-white transition-all hover:brightness-110 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Confirm and book payment
              </button>
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className="border-2 border-brand-navy/20 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-brand-navy transition-colors hover:border-red-300 hover:text-red-600"
              >
                Does not match
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/* ---------------------------------------------------------- channels tab */

function ChannelsTab() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "payment-channels"], queryFn: fetchChannels });
  const [editing, setEditing] = useState<Channel | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Channel | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const toggle = useMutation({
    mutationFn: async (c: Channel) => {
      const { error } = await supabase
        .from("payment_channels")
        .update({ is_active: !c.is_active })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "payment-channels"] }),
    onError: (e: Error) => setErr(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_channels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "payment-channels"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => setErr(e.message),
  });

  if (query.isLoading) return <AdminLoading />;
  if (query.isError) return <AdminError message={(query.error as Error).message} />;

  const channels = query.data ?? [];

  return (
    <div className="space-y-5">
      {err && <AdminError message={err} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-brand-navy/60">
          These are the ways customers can pay you. They appear on the client dashboard exactly as
          set here.
        </p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 bg-brand-navy px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] transition-all hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> Add channel
        </button>
      </div>

      {channels.length === 0 ? (
        <AdminEmpty text="No payment channels set up. Add your paybill, till or bank details so customers know how to pay." />
      ) : (
        <ul className="space-y-2.5">
          {channels.map((c) => {
            return (
              <li
                key={c.id}
                className={`flex items-start gap-4 border-2 p-4 transition-colors ${
                  c.is_active ? "border-brand-navy/12 bg-white" : "border-brand-navy/8 bg-brand-surface/40"
                }`}
              >
                <GripVertical className="mt-1 hidden h-4 w-4 shrink-0 text-brand-navy/15 sm:block" />
                <ChannelLogo kind={c.kind} label={c.label} dimmed={!c.is_active} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-bold ${c.is_active ? "text-brand-navy" : "text-brand-navy/45"}`}>
                      {c.label}
                    </span>
                    {!c.is_active && (
                      <span className="border border-brand-navy/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-navy/45">
                        Hidden
                      </span>
                    )}
                  </div>
                  {c.identifier && (
                    <div className="mt-1 font-mono text-sm font-bold text-brand-navy/70">
                      {c.identifier}
                    </div>
                  )}
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-brand-navy/45">
                    {c.account_name && <span>{c.account_name}</span>}
                    {c.extra && <span>{c.extra}</span>}
                  </div>
                </div>

                <div className="flex shrink-0 gap-1">
                  <IconBtn
                    onClick={() => toggle.mutate(c)}
                    label={c.is_active ? "Hide from customers" : "Show to customers"}
                  >
                    {c.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </IconBtn>
                  <IconBtn onClick={() => setEditing(c)} label="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </IconBtn>
                  <IconBtn onClick={() => setDeleteTarget(c)} label="Delete" danger>
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconBtn>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {(creating || editing) && (
        <ChannelForm
          existing={editing}
          nextOrder={channels.length + 1}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin", "payment-channels"] });
            qc.invalidateQueries({ queryKey: ["payment-channels"] });
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Remove ${deleteTarget.label}?`}
          body="Customers will no longer see this way of paying. If you only want to hide it temporarily, use the eye icon instead."
          confirmLabel="Remove channel"
          isPending={del.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => del.mutate(deleteTarget.id)}
        />
      )}
    </div>
  );
}

function ChannelForm({
  existing, nextOrder, onClose, onSaved,
}: {
  existing: Channel | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState(existing?.kind ?? "paybill");
  const [label, setLabel] = useState(existing?.label ?? "");
  const [accountName, setAccountName] = useState(existing?.account_name ?? "");
  const [identifier, setIdentifier] = useState(existing?.identifier ?? "");
  const [extra, setExtra] = useState(existing?.extra ?? "");
  const [instructions, setInstructions] = useState(existing?.instructions ?? "");
  const [active, setActive] = useState(existing?.is_active ?? true);
  const [err, setErr] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      if (!label.trim()) throw new Error("Give this channel a label customers will recognise.");

      const row = {
        kind,
        label: label.trim(),
        account_name: accountName.trim() || null,
        identifier: identifier.trim() || null,
        extra: extra.trim() || null,
        instructions: instructions.trim() || null,
        is_active: active,
        sort_order: existing?.sort_order ?? nextOrder,
      };

      if (existing) {
        const { error } = await supabase.from("payment_channels").update(row).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payment_channels").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: onSaved,
    onError: (e: Error) => setErr(e.message),
  });

  const idLabel =
    kind === "paybill" ? "Paybill number"
    : kind === "till" ? "Till number"
    : kind === "send_money" ? "Phone number"
    : kind === "bank" ? "Account number"
    : "Identifier";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-brand-navy/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="my-auto flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden border-2 border-brand-navy bg-white shadow-[8px_8px_0_0_var(--color-brand-navy)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b-2 border-brand-navy px-5 py-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-brand-navy">
            {existing ? "Edit channel" : "Add payment channel"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center border-2 border-brand-navy/20 text-brand-navy transition-colors hover:border-brand-navy"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-5">
          {err && <AdminError message={err} />}

          <div className="flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <AdminField id="ch-kind" label="Type" hint="Sets which logo customers see">
                <select
                  id="ch-kind"
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value);
                    if (!label) {
                      setLabel(CHANNEL_KINDS.find((k) => k.value === e.target.value)?.label ?? "");
                    }
                  }}
                  className={inputCls}
                >
                  {CHANNEL_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </AdminField>
            </div>
            <div className="pb-6">
              <ChannelLogo kind={kind} label={label || kind} />
            </div>
          </div>

          <AdminField id="ch-label" label="Label" required hint="What the customer sees as the heading">
            <input
              id="ch-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="M-Pesa Paybill"
              className={inputCls}
            />
          </AdminField>

          <AdminField id="ch-account" label="Account name" hint="The name money should be paid to">
            <input
              id="ch-account"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Protocol Promotions Ltd"
              className={inputCls}
            />
          </AdminField>

          {kind !== "cheque" && (
            <AdminField id="ch-id" label={idLabel} hint="Customers tap this to copy it">
              <input
                id="ch-id"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={kind === "paybill" ? "123456" : kind === "till" ? "654321" : "0123456789"}
                className={`${inputCls} font-mono text-base font-bold`}
              />
            </AdminField>
          )}

          <AdminField
            id="ch-extra"
            label="Extra detail"
            hint="Bank branch, account reference guidance, anything short"
          >
            <input
              id="ch-extra"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="Account number: use your order number"
              className={inputCls}
            />
          </AdminField>

          <AdminField
            id="ch-inst"
            label="Step by step instructions"
            hint="Shown when the customer taps How to pay"
          >
            <textarea
              id="ch-inst"
              rows={5}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Go to M-Pesa, select Lipa na M-Pesa, then Pay Bill. Enter the business number, use your order number as the account number, enter the amount and confirm."
              className={`${inputCls} leading-relaxed`}
            />
          </AdminField>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-navy"
            />
            <span>
              <span className="block text-sm font-bold text-brand-navy">Show to customers</span>
              <span className="mt-0.5 block text-xs text-brand-navy/50">
                Uncheck to hide it without deleting the details
              </span>
            </span>
          </label>

          <button
            type="button"
            onClick={() => { setErr(null); save.mutate(); }}
            disabled={save.isPending}
            className="inline-flex w-full items-center justify-center gap-2 bg-brand-navy py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:brightness-110 disabled:opacity-50"
          >
            {save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {existing ? "Update channel" : "Add channel"}
          </button>
        </div>
      </div>
    </div>
  );
}