import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import {
  LifeBuoy, Plus, X, Loader2, Send, AlertCircle, CheckCircle2,
  MessageSquare, ArrowLeft, Clock,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/support")({
  head: () => ({
    meta: [
      { title: "Support | Client Dashboard" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SupportPage,
});

type TicketStatus = "open" | "pending" | "resolved" | "closed";

type Ticket = {
  id: string;
  ticket_number: string | null;
  subject: string | null;
  body: string | null;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
};

type Reply = {
  id: string;
  author_name: string | null;
  from_staff: boolean;
  body: string;
  created_at: string;
};

type OrderOption = { id: string; order_number: string };

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "With us",
  pending: "Waiting on you",
  resolved: "Resolved",
  closed: "Closed",
};

const STATUS_TONE: Record<TicketStatus, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-brand-navy/5 text-brand-navy/50 border-brand-navy/15",
};

async function fetchTickets(userId: string): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, ticket_number, subject, body, status, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Ticket[];
}

async function fetchReplies(ticketId: string): Promise<Reply[]> {
  const { data, error } = await supabase
    .from("ticket_replies")
    .select("id, author_name, from_staff, body, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as Reply[];
}

async function fetchMyOrders(userId: string): Promise<OrderOption[]> {
  const { data } = await supabase
    .from("orders")
    .select("id, order_number")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []) as OrderOption[];
}

function when(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function SupportPage() {
  const [openId, setOpenId] = useState<string | null>(null);

  if (openId) return <TicketThread ticketId={openId} onBack={() => setOpenId(null)} />;
  return <TicketList onOpen={setOpenId} />;
}

function TicketList({ onOpen }: { onOpen: (id: string) => void }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const userId = session?.user?.id;
  const [formOpen, setFormOpen] = useState(false);

  const { data: tickets = [], isLoading, error } = useQuery({
    queryKey: ["my-tickets", userId],
    queryFn: () => fetchTickets(userId!),
    enabled: !!userId,
  });

  const openCount = tickets.filter((t) => t.status === "open" || t.status === "pending").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-navy/10 pb-5">
        <div>
          <h1 className="text-xl font-bold text-brand-navy">Support</h1>
          <p className="mt-1 text-sm text-brand-navy/55">
            {openCount > 0
              ? `${openCount} open ${openCount === 1 ? "conversation" : "conversations"} with our team.`
              : "Questions about an order, artwork or anything else."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> New ticket
        </button>
      </header>

      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-navy/50" />
          <p className="text-sm text-brand-navy/50">Loading your tickets...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto h-7 w-7 text-red-500" />
          <p className="mt-3 text-sm font-bold text-brand-navy">We could not load your tickets</p>
          <p className="mt-1 text-xs text-brand-navy/60">
            {error instanceof Error ? error.message : "Please try again shortly."}
          </p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-brand-navy/15 bg-white p-14 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-surface">
            <LifeBuoy className="h-6 w-6 text-brand-navy/35" />
          </div>
          <h2 className="mt-5 text-base font-bold text-brand-navy">No tickets yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-brand-navy/55">
            Raise a ticket if something is wrong with an order, or you need to change artwork after
            approving it. We usually reply within one business day.
          </p>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Raise a ticket
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {tickets.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onOpen(t.id)}
                className="w-full rounded-xl border border-brand-navy/12 bg-white p-4 text-left transition-all hover:border-brand-navy/30 hover:shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-brand-navy/50">
                        {t.ticket_number ?? "New"}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE[t.status]}`}
                      >
                        {STATUS_LABEL[t.status]}
                      </span>
                    </div>
                    <div className="mt-1.5 text-sm font-bold text-brand-navy">
                      {t.subject ?? "No subject"}
                    </div>
                    {t.body && (
                      <p className="mt-1 line-clamp-1 text-xs text-brand-navy/55">{t.body}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-brand-navy/40">
                      <Clock className="h-3 w-3" />
                      {when(t.updated_at)}
                    </div>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {formOpen && (
        <NewTicketForm
          userId={userId!}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["my-tickets"] });
            setFormOpen(false);
          }}
        />
      )}
    </div>
  );
}

function TicketThread({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const { session, profile } = useAuth();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const ticketQuery = useQuery({
    queryKey: ["my-ticket", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, ticket_number, subject, body, status, created_at, updated_at")
        .eq("id", ticketId)
        .single();
      if (error) throw error;
      return data as Ticket;
    },
  });

  const repliesQuery = useQuery({
    queryKey: ["my-ticket-replies", ticketId],
    queryFn: () => fetchReplies(ticketId),
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!reply.trim()) throw new Error("Write something before sending.");
      const { error } = await supabase.from("ticket_replies").insert({
        ticket_id: ticketId,
        author_id: session?.user?.id ?? null,
        author_name: profile?.full_name ?? "You",
        from_staff: false,
        is_internal: false,
        body: reply.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["my-ticket-replies", ticketId] });
      qc.invalidateQueries({ queryKey: ["my-ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  if (ticketQuery.isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-navy/50" />
      </div>
    );
  }

  if (ticketQuery.isError || !ticketQuery.data) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-navy/55 hover:text-brand-orange"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All tickets
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          We could not open that ticket.
        </div>
      </div>
    );
  }

  const t = ticketQuery.data;
  const replies = repliesQuery.data ?? [];
  const closed = t.status === "resolved" || t.status === "closed";

  return (
    <div className="space-y-5">
      <header className="border-b border-brand-navy/10 pb-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-navy/55 transition-colors hover:text-brand-orange"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All tickets
        </button>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-brand-navy/50">
            {t.ticket_number}
          </span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE[t.status]}`}>
            {STATUS_LABEL[t.status]}
          </span>
        </div>
        <h1 className="mt-1.5 text-xl font-bold text-brand-navy">{t.subject ?? "No subject"}</h1>
      </header>

      {err && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span className="text-xs font-medium text-red-700">{err}</span>
        </div>
      )}

      <div className="space-y-3">
        {/* Original message */}
        <article className="rounded-xl border border-brand-navy/12 bg-white p-4">
          <div className="flex items-center justify-between gap-3 border-b border-brand-navy/8 pb-2.5">
            <span className="text-xs font-bold text-brand-navy">You</span>
            <span className="text-[11px] text-brand-navy/45">{when(t.created_at)}</span>
          </div>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-brand-navy/75">
            {t.body ?? "No message."}
          </p>
        </article>

        {replies.map((r) => (
          <article
            key={r.id}
            className={`rounded-xl border p-4 ${
              r.from_staff
                ? "border-brand-navy/20 bg-brand-surface"
                : "border-brand-navy/12 bg-white"
            }`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-brand-navy/8 pb-2.5">
              <span className="text-xs font-bold text-brand-navy">
                {r.from_staff ? (r.author_name ?? "Protocol Promotions") : "You"}
              </span>
              <span className="text-[11px] text-brand-navy/45">{when(r.created_at)}</span>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-brand-navy/75">
              {r.body}
            </p>
          </article>
        ))}
      </div>

      {/* Reply */}
      <div className="rounded-xl border border-brand-navy/12 bg-white p-4">
        {closed && (
          <p className="mb-3 rounded-md border border-brand-navy/10 bg-brand-surface px-3 py-2 text-xs text-brand-navy/60">
            This ticket is closed. Replying reopens it.
          </p>
        )}
        <textarea
          rows={4}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Add to the conversation..."
          className="w-full rounded-md border border-brand-navy/20 bg-white px-3 py-2.5 text-sm leading-relaxed text-brand-navy outline-none transition focus:border-brand-navy"
        />
        <button
          type="button"
          onClick={() => { setErr(null); send.mutate(); }}
          disabled={send.isPending || !reply.trim()}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
        >
          {send.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send
        </button>
      </div>
    </div>
  );
}

function NewTicketForm({
  userId, onClose, onSaved,
}: {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [orderId, setOrderId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const orders = useQuery({
    queryKey: ["my-orders", userId],
    queryFn: () => fetchMyOrders(userId),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!subject.trim()) throw new Error("Give your ticket a subject.");
      if (!body.trim()) throw new Error("Tell us what you need help with.");

      const { error } = await supabase.from("support_tickets").insert({
        user_id: userId,
        order_id: orderId || null,
        name: profile?.full_name ?? null,
        email: profile?.email ?? null,
        phone: profile?.phone ?? null,
        subject: subject.trim(),
        body: body.trim(),
        source: orderId ? "order_issue" : "other",
        status: "open",
        priority: "normal",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSent(true);
      setTimeout(onSaved, 1500);
    },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-brand-navy/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-md overflow-hidden rounded-xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-brand-navy/10 px-5 py-4">
          <h2 className="text-sm font-bold text-brand-navy">Raise a ticket</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-brand-navy/50 transition-colors hover:bg-brand-surface"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="mx-auto h-11 w-11 text-emerald-500" />
            <p className="mt-4 text-sm font-bold text-brand-navy">Ticket raised</p>
            <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-brand-navy/60">
              We will reply here, usually within one business day.
            </p>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            {(orders.data ?? []).length > 0 && (
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-brand-navy/60">
                  Is this about an order
                </label>
                <select
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full rounded-md border border-brand-navy/20 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-navy"
                >
                  <option value="">General question</option>
                  {(orders.data ?? []).map((o) => (
                    <option key={o.id} value={o.id}>{o.order_number}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="tk-subject" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-brand-navy/60">
                Subject
              </label>
              <input
                id="tk-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Need to change the logo placement"
                className="w-full rounded-md border border-brand-navy/20 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-navy"
              />
            </div>

            <div>
              <label htmlFor="tk-body" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-brand-navy/60">
                What do you need
              </label>
              <textarea
                id="tk-body"
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Give us as much detail as you can."
                className="w-full rounded-md border border-brand-navy/20 bg-white px-3 py-2.5 text-sm leading-relaxed text-brand-navy outline-none transition focus:border-brand-navy"
              />
            </div>

            {err && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <span className="text-xs font-medium text-red-700">{err}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => { setErr(null); save.mutate(); }}
              disabled={save.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-navy px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {save.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              Send ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
}