import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import {
  AdminHeader, AdminLoading, AdminError, AdminEmpty, StatusBadge,
  ConfirmDialog, AdminField, inputCls, ago,
} from "@/lib/admin-ui";
import {
  Plus, Search, X, Loader2, Check, Send, Trash2, ArrowLeft, Mail,
  Phone, User, Clock, AlertTriangle, LifeBuoy, Lock, MessageSquare,
} from "lucide-react";

export const Route = createFileRoute("/admin/support")({
  head: () => ({ meta: [{ title: "Support | Admin" }] }),
  component: SupportPage,
});

/* ------------------------------------------------------------------ types */

type TicketStatus = "open" | "pending" | "resolved" | "closed";
type TicketPriority = "low" | "normal" | "high" | "urgent";
type TicketSource = "contact_form" | "order_issue" | "quote_question" | "other";

type Ticket = {
  id: string;
  ticket_number: string | null;
  user_id: string | null;
  order_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  subject: string | null;
  body: string | null;
  source: TicketSource | null;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
};

type Reply = {
  id: string;
  ticket_id: string;
  author_name: string | null;
  from_staff: boolean;
  is_internal: boolean;
  body: string;
  created_at: string;
};

type OrderOption = { id: string; order_number: string; customer_name: string };

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  pending: "Waiting on customer",
  resolved: "Resolved",
  closed: "Closed",
};

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

const SOURCE_LABEL: Record<TicketSource, string> = {
  contact_form: "Contact form",
  order_issue: "Order issue",
  quote_question: "Quote question",
  other: "Other",
};

/* --------------------------------------------------------------- queries */

async function fetchTickets(): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from("support_tickets")
    .select(
      "id, ticket_number, user_id, order_id, name, email, phone, subject, body, source, status, priority, created_at, updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as Ticket[];
}

async function fetchReplies(ticketId: string): Promise<Reply[]> {
  const { data, error } = await supabase
    .from("ticket_replies")
    .select("id, ticket_id, author_name, from_staff, is_internal, body, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as Reply[];
}

async function fetchOrderOptions(): Promise<OrderOption[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_name")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return [];
  return (data ?? []) as OrderOption[];
}

/* ------------------------------------------------------------------- page */

function SupportPage() {
  const [openId, setOpenId] = useState<string | null>(null);

  if (openId) {
    return <TicketDetail ticketId={openId} onClose={() => setOpenId(null)} />;
  }
  return <TicketList onOpen={setOpenId} />;
}

/* ------------------------------------------------------------------- list */

type Filter = "active" | "open" | "pending" | "resolved" | "all";

function TicketList({ onOpen }: { onOpen: (id: string) => void }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "tickets"], queryFn: fetchTickets });
  const orders = useQuery({ queryKey: ["admin", "order-options"], queryFn: fetchOrderOptions });

  const [filter, setFilter] = useState<Filter>("active");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const all = query.data ?? [];

  const stats = useMemo(() => ({
    open: all.filter((t) => t.status === "open").length,
    waiting: all.filter((t) => t.status === "pending").length,
    urgent: all.filter((t) => (t.priority === "urgent" || t.priority === "high")
      && t.status !== "resolved" && t.status !== "closed").length,
    resolved: all.filter((t) => t.status === "resolved" || t.status === "closed").length,
  }), [all]);

  const counts = {
    active: all.filter((t) => t.status === "open" || t.status === "pending").length,
    open: stats.open,
    pending: stats.waiting,
    resolved: stats.resolved,
    all: all.length,
  };

  const rows = useMemo(() => {
    let list = all;
    if (filter === "active") list = list.filter((t) => t.status === "open" || t.status === "pending");
    else if (filter !== "all") list = list.filter((t) => t.status === filter || (filter === "resolved" && t.status === "closed"));

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.ticket_number ?? "").toLowerCase().includes(q) ||
          (t.subject ?? "").toLowerCase().includes(q) ||
          (t.name ?? "").toLowerCase().includes(q) ||
          (t.email ?? "").toLowerCase().includes(q) ||
          (t.body ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [all, filter, search]);

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "active", label: "Needs attention" },
    { id: "open", label: "Open" },
    { id: "pending", label: "Waiting" },
    { id: "resolved", label: "Closed" },
    { id: "all", label: "All" },
  ];

  if (query.isLoading) return <AdminLoading />;
  if (query.isError) return <AdminError message={(query.error as Error).message} />;

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Support"
        subtitle="Questions and problems from customers, wherever they came in."
        action={
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-2 bg-brand-navy px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] transition-all hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Log a ticket
          </button>
        }
      />

      {err && <AdminError message={err} />}

      <div className="grid gap-px border border-brand-navy/15 bg-brand-navy/15 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={LifeBuoy} label="Open" value={String(stats.open)} accent={stats.open > 0} />
        <Stat icon={Clock} label="Waiting on customer" value={String(stats.waiting)} />
        <Stat icon={AlertTriangle} label="High or urgent" value={String(stats.urgent)} accent={stats.urgent > 0} />
        <Stat icon={Check} label="Closed" value={String(stats.resolved)} />
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, subject, name or message"
            className={`${inputCls} pl-9`}
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

      {rows.length === 0 ? (
        <AdminEmpty
          text={
            all.length === 0
              ? "No tickets yet. They arrive from the contact form, the client dashboard, or you can log one here for a phone call."
              : "Nothing matches those filters."
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {rows.map((t) => (
            <TicketRow key={t.id} ticket={t} onOpen={() => onOpen(t.id)} />
          ))}
        </ul>
      )}

      {formOpen && (
        <TicketForm
          orders={orders.data ?? []}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
            setFormOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Stat({
  icon: Icon, label, value, accent,
}: {
  icon: typeof LifeBuoy;
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
      <div className={`mt-1.5 text-xl font-black tabular-nums sm:text-2xl ${accent ? "text-brand-orange" : "text-brand-navy"}`}>
        {value}
      </div>
    </div>
  );
}

function PriorityTag({ priority }: { priority: TicketPriority }) {
  if (priority === "normal" || priority === "low") return null;
  const urgent = priority === "urgent";
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
        urgent ? "bg-red-600 text-white" : "border border-brand-orange text-brand-orange"
      }`}
    >
      <AlertTriangle className="h-3 w-3" />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

function TicketRow({ ticket: t, onOpen }: { ticket: Ticket; onOpen: () => void }) {
  const closed = t.status === "resolved" || t.status === "closed";
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`w-full border-2 p-4 text-left transition-all hover:border-brand-navy hover:shadow-[4px_4px_0_0_var(--color-brand-navy)] ${
          closed ? "border-brand-navy/10 bg-brand-surface/40" : "border-brand-navy/12 bg-white"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-brand-navy/60">
                {t.ticket_number ?? "No reference"}
              </span>
              <StatusBadge
                label={STATUS_LABEL[t.status]}
                tone={t.status === "open" ? "solid" : t.status === "pending" ? "warn" : "neutral"}
              />
              <PriorityTag priority={t.priority} />
            </div>

            <div className="mt-1.5 text-sm font-bold text-brand-navy">
              {t.subject ?? "No subject"}
            </div>

            {t.body && (
              <p className="mt-1 line-clamp-1 text-xs text-brand-navy/55">{t.body}</p>
            )}

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-brand-navy/45">
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {t.name ?? t.email ?? "Unknown"}
              </span>
              {t.source && <span>{SOURCE_LABEL[t.source]}</span>}
              <span>{ago(t.updated_at)}</span>
            </div>
          </div>
        </div>
      </button>
    </li>
  );
}

/* ----------------------------------------------------------------- detail */

function TicketDetail({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const ticketQuery = useQuery({
    queryKey: ["admin", "ticket", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", ticketId)
        .single();
      if (error) throw error;
      return data as Ticket;
    },
  });

  const repliesQuery = useQuery({
    queryKey: ["admin", "ticket-replies", ticketId],
    queryFn: () => fetchReplies(ticketId),
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin", "ticket", ticketId] });
    qc.invalidateQueries({ queryKey: ["admin", "ticket-replies", ticketId] });
    qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
  }

  const send = useMutation({
    mutationFn: async () => {
      if (!reply.trim()) throw new Error("Write something before sending.");
      const { error } = await supabase.from("ticket_replies").insert({
        ticket_id: ticketId,
        author_id: profile?.id ?? null,
        author_name: profile?.full_name ?? "Protocol Promotions",
        from_staff: true,
        is_internal: internal,
        body: reply.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply("");
      setInternal(false);
      refresh();
    },
    onError: (e: Error) => setErr(e.message),
  });

  const patch = useMutation({
    mutationFn: async (fields: Partial<Ticket>) => {
      const { error } = await supabase.from("support_tickets").update(fields).eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => setErr(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("support_tickets").delete().eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
      onClose();
    },
    onError: (e: Error) => setErr(e.message),
  });

  if (ticketQuery.isLoading) return <AdminLoading />;
  if (ticketQuery.isError || !ticketQuery.data) {
    return (
      <div className="space-y-5">
        <BackLink onClose={onClose} />
        <AdminError message={(ticketQuery.error as Error)?.message ?? "Ticket not found."} />
      </div>
    );
  }

  const t = ticketQuery.data;
  const replies = repliesQuery.data ?? [];
  const closed = t.status === "resolved" || t.status === "closed";

  return (
    <div className="space-y-6">
      <header className="sticky top-0 z-20 -mx-6 border-b-2 border-brand-navy bg-white px-6 pb-4 pt-5 md:-mx-8 md:px-8">
        <BackLink onClose={onClose} />

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-brand-navy/55">
                {t.ticket_number}
              </span>
              <StatusBadge
                label={STATUS_LABEL[t.status]}
                tone={t.status === "open" ? "solid" : t.status === "pending" ? "warn" : "neutral"}
              />
              <PriorityTag priority={t.priority} />
            </div>
            <h1 className="mt-1.5 text-xl font-extrabold tracking-tight text-brand-navy md:text-2xl">
              {t.subject ?? "No subject"}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {!closed && (
              <button
                type="button"
                onClick={() => patch.mutate({ status: "resolved" })}
                disabled={patch.isPending}
                className="inline-flex items-center gap-1.5 bg-brand-navy px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] transition-all hover:brightness-110 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" /> Mark resolved
              </button>
            )}
            {closed && (
              <button
                type="button"
                onClick={() => patch.mutate({ status: "open" })}
                disabled={patch.isPending}
                className="inline-flex items-center gap-1.5 border-2 border-brand-navy px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-brand-navy transition-colors hover:bg-brand-navy hover:text-white disabled:opacity-50"
              >
                Reopen
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="grid h-10 w-10 place-items-center border-2 border-brand-navy/20 text-brand-navy/50 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
              title="Delete ticket"
              aria-label="Delete ticket"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {err && <AdminError message={err} />}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Conversation */}
        <div className="space-y-4">
          {/* The original message */}
          <article className="border-2 border-brand-navy/12 bg-white p-4">
            <div className="flex items-center justify-between gap-3 border-b border-brand-navy/10 pb-2.5">
              <span className="text-xs font-black uppercase tracking-wide text-brand-navy">
                {t.name ?? "Customer"}
              </span>
              <span className="text-[11px] text-brand-navy/45">{ago(t.created_at)}</span>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-brand-navy/75">
              {t.body ?? "No message body."}
            </p>
          </article>

          {/* Thread */}
          {repliesQuery.isLoading ? (
            <div className="grid place-items-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-brand-navy/40" />
            </div>
          ) : (
            replies.map((r) => (
              <article
                key={r.id}
                className={`border-2 p-4 ${
                  r.is_internal
                    ? "border-dashed border-brand-orange/40 bg-brand-orange/5"
                    : r.from_staff
                      ? "border-brand-navy bg-brand-surface"
                      : "border-brand-navy/12 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-navy/10 pb-2.5">
                  <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-brand-navy">
                    {r.author_name ?? (r.from_staff ? "Staff" : "Customer")}
                    {r.is_internal && (
                      <span className="inline-flex items-center gap-1 bg-brand-orange px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                        <Lock className="h-2.5 w-2.5" /> Internal
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-brand-navy/45">{ago(r.created_at)}</span>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-brand-navy/75">
                  {r.body}
                </p>
              </article>
            ))
          )}

          {/* Reply box */}
          <div className="border-2 border-brand-navy/12 bg-white p-4">
            <label htmlFor="reply" className="mb-2 block text-[11px] font-black uppercase tracking-widest text-brand-navy">
              {internal ? "Internal note" : "Reply to the customer"}
            </label>
            <textarea
              id="reply"
              rows={4}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={
                internal
                  ? "Only staff see this. Useful for context before you answer."
                  : "Your reply is emailed as a notification and shown in their dashboard."
              }
              className={`${inputCls} leading-relaxed`}
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={(e) => setInternal(e.target.checked)}
                  className="h-4 w-4 accent-brand-navy"
                />
                <span className="text-xs font-bold text-brand-navy">Internal note only</span>
              </label>

              <button
                type="button"
                onClick={() => { setErr(null); send.mutate(); }}
                disabled={send.isPending || !reply.trim()}
                className="inline-flex items-center gap-2 bg-brand-navy px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white transition-all hover:brightness-110 disabled:opacity-40"
              >
                {send.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : internal ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {internal ? "Save note" : "Send reply"}
              </button>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <section className="border-2 border-brand-navy/12 bg-white">
            <div className="border-b border-brand-navy/10 bg-brand-surface px-4 py-3">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
                Who raised it
              </h2>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-start gap-2.5">
                <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-navy/35" />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-brand-navy">{t.name ?? "Not given"}</div>
                  {!t.user_id && (
                    <span className="mt-0.5 inline-block text-[10px] font-bold uppercase tracking-wide text-brand-orange">
                      Guest, no account
                    </span>
                  )}
                </div>
              </div>

              {t.email && (
                <a
                  href={`mailto:${t.email}?subject=Re: ${t.ticket_number} ${t.subject ?? ""}`}
                  className="flex items-center gap-2.5 text-brand-navy/70 transition-colors hover:text-brand-orange"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0 text-brand-navy/35" />
                  <span className="min-w-0 truncate font-mono text-xs">{t.email}</span>
                </a>
              )}

              {t.phone && (
                <a
                  href={`tel:${t.phone}`}
                  className="flex items-center gap-2.5 text-brand-navy/70 transition-colors hover:text-brand-orange"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0 text-brand-navy/35" />
                  <span className="font-mono text-xs">{t.phone}</span>
                </a>
              )}
            </div>
          </section>

          <section className="border-2 border-brand-navy/12 bg-white">
            <div className="border-b border-brand-navy/10 bg-brand-surface px-4 py-3">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
                Handling
              </h2>
            </div>
            <div className="space-y-4 p-4">
              <AdminField id="t-status" label="Status">
                <select
                  id="t-status"
                  value={t.status}
                  onChange={(e) => patch.mutate({ status: e.target.value as TicketStatus })}
                  className={inputCls}
                >
                  {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </AdminField>

              <AdminField id="t-priority" label="Priority">
                <select
                  id="t-priority"
                  value={t.priority}
                  onChange={(e) => patch.mutate({ priority: e.target.value as TicketPriority })}
                  className={inputCls}
                >
                  {(Object.keys(PRIORITY_LABEL) as TicketPriority[]).map((p) => (
                    <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                  ))}
                </select>
              </AdminField>

              <div className="border-t border-brand-navy/10 pt-3 text-[11px] text-brand-navy/50">
                <div>Raised {ago(t.created_at)}</div>
                <div className="mt-0.5">Last activity {ago(t.updated_at)}</div>
                {t.source && <div className="mt-0.5">Came in via {SOURCE_LABEL[t.source]}</div>}
              </div>
            </div>
          </section>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${t.ticket_number}?`}
          body="The ticket and its whole conversation are removed permanently. Resolve it instead if you just want it out of the queue."
          confirmLabel="Delete ticket"
          isPending={del.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => del.mutate()}
        />
      )}
    </div>
  );
}

function BackLink({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-navy/60 transition-colors hover:text-brand-orange"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> All tickets
    </button>
  );
}

/* ------------------------------------------------------------------- form */

function TicketForm({
  orders, onClose, onSaved,
}: {
  orders: OrderOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [source, setSource] = useState<TicketSource>("other");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [orderId, setOrderId] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const matches = useMemo(() => {
    if (!orderSearch.trim()) return orders.slice(0, 6);
    const q = orderSearch.toLowerCase();
    return orders
      .filter((o) => o.order_number.toLowerCase().includes(q) || o.customer_name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [orders, orderSearch]);

  const chosen = orders.find((o) => o.id === orderId) ?? null;

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Who is this from?");
      if (!subject.trim()) throw new Error("Give the ticket a subject.");

      const { error } = await supabase.from("support_tickets").insert({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        subject: subject.trim(),
        body: body.trim() || null,
        source,
        priority,
        status: "open",
        order_id: orderId || null,
      });
      if (error) throw error;
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
            Log a ticket
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

          <p className="border-l-2 border-brand-orange/40 pl-2.5 text-xs leading-relaxed text-brand-navy/60">
            For calls and WhatsApp messages, so they land in the same queue as everything else.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <AdminField id="tk-name" label="Name" required>
              <input
                id="tk-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Christine"
                className={inputCls}
              />
            </AdminField>
            <AdminField id="tk-phone" label="Phone">
              <input
                id="tk-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254 7.."
                className={inputCls}
              />
            </AdminField>
          </div>

          <AdminField id="tk-email" label="Email">
            <input
              id="tk-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="them@company.com"
              className={inputCls}
            />
          </AdminField>

          <AdminField id="tk-subject" label="Subject" required>
            <input
              id="tk-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Wants to change the logo placement"
              className={inputCls}
            />
          </AdminField>

          <AdminField id="tk-body" label="What they said">
            <textarea
              id="tk-body"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={`${inputCls} leading-relaxed`}
            />
          </AdminField>

          <div className="grid grid-cols-2 gap-3">
            <AdminField id="tk-source" label="Came in via">
              <select
                id="tk-source"
                value={source}
                onChange={(e) => setSource(e.target.value as TicketSource)}
                className={inputCls}
              >
                {(Object.keys(SOURCE_LABEL) as TicketSource[]).map((s) => (
                  <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
                ))}
              </select>
            </AdminField>
            <AdminField id="tk-priority" label="Priority">
              <select
                id="tk-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className={inputCls}
              >
                {(Object.keys(PRIORITY_LABEL) as TicketPriority[]).map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                ))}
              </select>
            </AdminField>
          </div>

          {/* Optional order link */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-brand-navy">
              Related order
            </label>
            {chosen ? (
              <div className="flex items-center justify-between gap-3 border-2 border-brand-navy bg-brand-surface px-3 py-2.5">
                <div className="min-w-0">
                  <div className="font-mono text-xs font-bold text-brand-navy">
                    {chosen.order_number}
                  </div>
                  <div className="truncate text-[11px] text-brand-navy/55">
                    {chosen.customer_name}
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
                  <ul className="mt-1.5 max-h-36 overflow-y-auto border-2 border-brand-navy/15">
                    {matches.map((o) => (
                      <li key={o.id}>
                        <button
                          type="button"
                          onClick={() => setOrderId(o.id)}
                          className="w-full border-b border-brand-navy/8 px-3 py-2 text-left transition-colors last:border-0 hover:bg-brand-surface"
                        >
                          <span className="block font-mono text-xs font-bold text-brand-navy">
                            {o.order_number}
                          </span>
                          <span className="block truncate text-[11px] text-brand-navy/55">
                            {o.customer_name}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => { setErr(null); save.mutate(); }}
            disabled={save.isPending}
            className="inline-flex w-full items-center justify-center gap-2 bg-brand-navy py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:brightness-110 disabled:opacity-50"
          >
            {save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            Create ticket
          </button>
        </div>
      </div>
    </div>
  );
}