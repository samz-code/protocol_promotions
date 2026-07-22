import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Smartphone, Building2, FileText, Loader2, AlertCircle, Receipt, X,
  CheckCircle2, Copy, Check, Send, Clock, CreditCard, ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/payments")({
  head: () => ({
    meta: [
      { title: "Payments | Client Dashboard" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentsPage,
});

type Channel = {
  id: string;
  kind: string;
  label: string;
  account_name: string | null;
  identifier: string | null;
  extra: string | null;
  instructions: string | null;
};

type PaymentRow = {
  id: string;
  order_id: string;
  method: string;
  reference: string | null;
  mpesa_receipt: string | null;
  paid_at: string | null;
  amount: number;
  order_number: string;
  currency: string;
};

type Submission = {
  id: string;
  amount: number | null;
  mpesa_code: string | null;
  reference: string | null;
  status: string;
  created_at: string;
  review_note: string | null;
  channel_kind: string | null;
};

type OpenOrder = { id: string; order_number: string; total: number };

/** Logo files live in /public. Spaces are encoded so the URL resolves. */
const KIND_LOGO: Record<string, string> = {
  paybill: "/paybill.png",
  till: "/till.png",
  send_money: "/M-pesa.png",
  bank: "/Equitybank.png",
  cheque: "/Cheque.png",
};

/** Fallback icon when a channel kind has no logo file. */
const KIND_ICON: Record<string, typeof Smartphone> = {
  paybill: Smartphone,
  till: Smartphone,
  send_money: Smartphone,
  bank: Building2,
  cheque: FileText,
  card: CreditCard,
};

function ChannelLogo({ kind, label }: { kind: string; label: string }) {
  const [failed, setFailed] = useState(false);
  const src = KIND_LOGO[kind];
  const Icon = KIND_ICON[kind] ?? Smartphone;

  if (!src || failed) {
    return (
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-brand-surface">
        <Icon className="h-4 w-4 text-brand-navy" />
      </div>
    );
  }

  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md border border-brand-navy/10 bg-white p-1">
      <img
        src={src}
        alt={label}
        onError={() => setFailed(true)}
        className="h-full w-full object-contain"
      />
    </div>
  );
}

async function fetchChannels(): Promise<Channel[]> {
  const { data, error } = await supabase
    .from("payment_channels")
    .select("id, kind, label, account_name, identifier, extra, instructions")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Channel[];
}

async function fetchPayments(userId: string): Promise<PaymentRow[]> {
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, order_number, currency")
    .eq("user_id", userId);
  if (ordersError) throw ordersError;
  if (!orders || orders.length === 0) return [];

  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const { data: payments, error } = await supabase
    .from("payments")
    .select("id, order_id, method, reference, mpesa_receipt, paid_at, amount")
    .in("order_id", orders.map((o) => o.id))
    .order("paid_at", { ascending: false });
  if (error) throw error;

  return (payments ?? []).map((p) => ({
    id: p.id,
    order_id: p.order_id,
    method: p.method,
    reference: p.reference,
    mpesa_receipt: p.mpesa_receipt,
    paid_at: p.paid_at,
    amount: Number(p.amount),
    order_number: orderMap.get(p.order_id)?.order_number ?? "-",
    currency: orderMap.get(p.order_id)?.currency ?? "KES",
  }));
}

async function fetchSubmissions(userId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from("payment_submissions")
    .select("id, amount, mpesa_code, reference, status, created_at, review_note, channel_kind")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Submission[];
}

async function fetchOpenOrders(userId: string): Promise<OpenOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, total")
    .eq("user_id", userId)
    .neq("payment_status", "paid")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OpenOrder[];
}

function money(amount: number, currency = "KES") {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function dateTime(s: string | null) {
  if (!s) return "-";
  return new Date(s).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function PaymentsPage() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const userId = session?.user?.id;

  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const channels = useQuery({ queryKey: ["payment-channels"], queryFn: fetchChannels });
  const payments = useQuery({
    queryKey: ["dashboard-payments", userId],
    queryFn: () => fetchPayments(userId!),
    enabled: !!userId,
  });
  const submissions = useQuery({
    queryKey: ["payment-submissions", userId],
    queryFn: () => fetchSubmissions(userId!),
    enabled: !!userId,
  });
  const openOrders = useQuery({
    queryKey: ["open-orders", userId],
    queryFn: () => fetchOpenOrders(userId!),
    enabled: !!userId,
  });

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  }

  const pendingCount = (submissions.data ?? []).filter((s) => s.status === "pending").length;

  return (
    <div className="space-y-6">
      <header className="border-b border-brand-navy/10 pb-5">
        <h1 className="text-xl font-bold text-brand-navy">Payments</h1>
        <p className="mt-1 text-sm text-brand-navy/55">
          How to pay us, and a record of what you have paid.
        </p>
      </header>

      {pendingCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            You have {pendingCount} payment {pendingCount === 1 ? "notification" : "notifications"}{" "}
            awaiting confirmation. We check these during working hours and will update your order
            once verified.
          </p>
        </div>
      )}

      {/* How to pay */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-brand-navy">How to pay</h2>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-orange px-3.5 py-2 text-xs font-bold text-white transition hover:brightness-95"
          >
            <Send className="h-3.5 w-3.5" /> I have paid
          </button>
        </div>

        {channels.isLoading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-brand-navy/40" />
          </div>
        ) : channels.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load payment details. Please refresh, or contact us directly.
          </div>
        ) : (channels.data ?? []).length === 0 ? (
          <div className="rounded-lg border border-dashed border-brand-navy/20 p-6 text-center text-sm text-brand-navy/50">
            Payment details are being set up. Please contact us to arrange payment.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(channels.data ?? []).map((c) => (
              <ChannelCard key={c.id} channel={c} copied={copied} onCopy={copy} />
            ))}
          </div>
        )}
      </section>

      {/* Submitted proof awaiting review */}
      {(submissions.data ?? []).length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold text-brand-navy">Your payment notifications</h2>
          <ul className="space-y-2">
            {(submissions.data ?? []).map((s) => (
              <li
                key={s.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-brand-navy/12 bg-white p-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-navy">
                      {s.mpesa_code ?? s.reference ?? "No code given"}
                    </span>
                    <SubmissionPill status={s.status} />
                  </div>
                  <div className="mt-1 text-[11px] text-brand-navy/45">
                    Submitted {dateTime(s.created_at)}
                  </div>
                  {s.review_note && (
                    <p className="mt-1.5 border-l-2 border-brand-orange/40 pl-2 text-xs text-brand-navy/60">
                      {s.review_note}
                    </p>
                  )}
                </div>
                {s.amount != null && (
                  <span className="shrink-0 text-sm font-bold tabular-nums text-brand-navy">
                    {money(s.amount)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Confirmed payment history */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-brand-navy">Confirmed payments</h2>

        {payments.isLoading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-brand-navy/40" />
          </div>
        ) : payments.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="mt-2 text-sm font-semibold text-brand-navy">
              We could not load your payment history
            </p>
            <p className="mt-1 text-xs text-brand-navy/60">
              {payments.error instanceof Error ? payments.error.message : "Please try again."}
            </p>
          </div>
        ) : (payments.data ?? []).length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-brand-navy/15 bg-white p-10 text-center">
            <Receipt className="mx-auto h-7 w-7 text-brand-navy/25" />
            <p className="mt-3 text-sm font-semibold text-brand-navy/60">No payments yet</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-brand-navy/45">
              Once we confirm a payment against your order, it appears here with its receipt number.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2 sm:hidden">
              {(payments.data ?? []).map((p) => (
                <div key={p.id} className="rounded-lg border border-brand-navy/12 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-bold text-brand-navy">
                        {p.mpesa_receipt ?? p.reference ?? p.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-brand-navy/45">
                        {p.order_number}
                      </div>
                      <div className="mt-1 text-[11px] text-brand-navy/45">
                        {dateTime(p.paid_at)}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-brand-navy">
                      {money(p.amount, p.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-lg border border-brand-navy/12 bg-white sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-navy/10 bg-brand-surface/50 text-left text-[11px] font-bold uppercase tracking-wider text-brand-navy/45">
                    <th className="py-3 pl-4">Receipt</th>
                    <th className="px-3">Order</th>
                    <th className="px-3">Method</th>
                    <th className="px-3">Date</th>
                    <th className="pr-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-navy/8">
                  {(payments.data ?? []).map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-brand-surface/40">
                      <td className="py-3.5 pl-4 font-mono text-xs font-bold text-brand-navy">
                        {p.mpesa_receipt ?? p.reference ?? p.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-3 font-mono text-xs text-brand-navy/60">{p.order_number}</td>
                      <td className="px-3 text-xs capitalize text-brand-navy/70">{p.method}</td>
                      <td className="px-3 text-xs text-brand-navy/55">{dateTime(p.paid_at)}</td>
                      <td className="pr-4 text-right text-sm font-bold tabular-nums text-brand-navy">
                        {money(p.amount, p.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {showForm && (
        <ProofForm
          userId={userId!}
          orders={openOrders.data ?? []}
          channels={channels.data ?? []}
          onClose={() => setShowForm(false)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["payment-submissions", userId] });
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function SubmissionPill({ status }: { status: string }) {
  const cls =
    status === "verified"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "rejected"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-amber-50 text-amber-700 border-amber-200";
  const label = status === "verified" ? "Confirmed" : status === "rejected" ? "Not matched" : "Checking";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${cls}`}>{label}</span>
  );
}

function ChannelCard({
  channel: c, copied, onCopy,
}: {
  channel: Channel;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-brand-navy/12 bg-white">
      <div className="flex items-start gap-3 p-4">
        <ChannelLogo kind={c.kind} label={c.label} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-brand-navy">{c.label}</div>
          {c.account_name && (
            <div className="mt-0.5 text-xs text-brand-navy/55">{c.account_name}</div>
          )}

          {c.identifier && (
            <button
              type="button"
              onClick={() => onCopy(c.identifier!, c.id)}
              className="mt-2 inline-flex items-center gap-2 rounded-md border border-brand-navy/15 bg-brand-surface/50 px-2.5 py-1.5 font-mono text-sm font-bold text-brand-navy transition-colors hover:border-brand-navy"
              title="Copy"
            >
              {c.identifier}
              {copied === c.id ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-brand-navy/40" />
              )}
            </button>
          )}

          {c.extra && <div className="mt-2 text-[11px] text-brand-navy/55">{c.extra}</div>}

          {c.instructions && (
            <>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand-orange"
              >
                How to pay
                <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <p className="mt-2 border-l-2 border-brand-orange/30 pl-2.5 text-xs leading-relaxed text-brand-navy/65">
                  {c.instructions}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProofForm({
  userId, orders, channels, onClose, onDone,
}: {
  userId: string;
  orders: OpenOrder[];
  channels: Channel[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [orderId, setOrderId] = useState("");
  const [kind, setKind] = useState(channels[0]?.kind ?? "paybill");
  const [amount, setAmount] = useState("");
  const [code, setCode] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [raw, setRaw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      if (!code.trim() && !raw.trim()) {
        throw new Error("Add the M-Pesa code, or paste the confirmation message.");
      }
      const { error } = await supabase.from("payment_submissions").insert({
        user_id: userId,
        order_id: orderId || null,
        channel_kind: kind,
        amount: amount ? Number(amount) : null,
        mpesa_code: code.trim() || null,
        reference: code.trim() || null,
        paid_at: paidAt || null,
        raw_message: raw.trim() || null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSent(true);
      setTimeout(onDone, 1800);
    },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-brand-navy/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-brand-navy/15 bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-brand-navy/10 px-5 py-4">
          <h2 className="text-sm font-bold text-brand-navy">Tell us you have paid</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-brand-navy/50 hover:bg-brand-surface"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="mx-auto h-11 w-11 text-emerald-500" />
            <p className="mt-4 text-sm font-bold text-brand-navy">Thank you</p>
            <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-brand-navy/60">
              We will match this against your order and confirm it shortly.
            </p>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <p className="text-xs leading-relaxed text-brand-navy/60">
              Paste your M-Pesa confirmation message or enter the code. We match it against your
              order and mark it paid.
            </p>

            {orders.length > 0 && (
              <Field label="Which order">
                <select
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className={inputStyle}
                >
                  <option value="">Not sure / general payment</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} ({money(o.total)})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="How you paid">
              <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputStyle}>
                {channels.map((c) => (
                  <option key={c.id} value={c.kind}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount paid">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className={`${inputStyle} tabular-nums`}
                />
              </Field>
              <Field label="Date paid">
                <input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className={inputStyle}
                />
              </Field>
            </div>

            <Field label="M-Pesa code or reference">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SJK7HG92LM"
                className={`${inputStyle} font-mono`}
              />
            </Field>

            <Field label="Or paste the full message">
              <textarea
                rows={4}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder="SJK7HG92LM Confirmed. KSh2,800.00 sent to PROTOCOL PROMOTIONS LTD on 7/2/26 at 3:42 PM..."
                className={`${inputStyle} leading-relaxed`}
              />
            </Field>

            {err && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <span className="text-xs font-medium text-red-700">{err}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => { setErr(null); submit.mutate(); }}
              disabled={submit.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-navy px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {submit.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Send confirmation
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle =
  "w-full rounded-md border border-brand-navy/20 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-navy";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-brand-navy/60">
        {label}
      </label>
      {children}
    </div>
  );
}