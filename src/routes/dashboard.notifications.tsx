import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package, FileText, CreditCard, Megaphone, Loader2, Bell, Truck,
  CheckCircle2, AlertCircle, Check, Trash2, BellOff,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications | Client Dashboard" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsPage,
});

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

/** The column is `kind`, not `type`. Reading the wrong one meant every
 *  notification fell through to the default icon. */
const KIND_ICON: Record<string, typeof Package> = {
  order_update: Package,
  new_order: Package,
  production_complete: CheckCircle2,
  delivery_complete: Truck,
  payment_received: CreditCard,
  payment_confirmed: CreditCard,
  payment_rejected: AlertCircle,
  quote_ready: FileText,
  new_quote: FileText,
  low_stock: AlertCircle,
  customer_message: Megaphone,
};

const KIND_TONE: Record<string, string> = {
  payment_rejected: "text-red-600 bg-red-50 border-red-200",
  payment_confirmed: "text-emerald-700 bg-emerald-50 border-emerald-200",
  payment_received: "text-emerald-700 bg-emerald-50 border-emerald-200",
  delivery_complete: "text-emerald-700 bg-emerald-50 border-emerald-200",
  production_complete: "text-emerald-700 bg-emerald-50 border-emerald-200",
};

async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, is_read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

function when(iso: string) {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

/** Groups keep a long list readable. */
function bucketOf(iso: string): "Today" | "This week" | "Earlier" {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return "Today";
  if (days < 7) return "This week";
  return "Earlier";
}

function NotificationsPage() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const userId = session?.user?.id;

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (e: Error) => setErr(e.message),
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId!)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (e: Error) => setErr(e.message),
  });

  const clearRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", userId!)
        .eq("is_read", true);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (e: Error) => setErr(e.message),
  });

  const unreadCount = items.filter((i) => !i.is_read).length;
  const visible = unreadOnly ? items.filter((i) => !i.is_read) : items;

  const grouped = useMemo(() => {
    const out: Record<string, Notification[]> = {};
    for (const n of visible) {
      const b = bucketOf(n.created_at);
      (out[b] ??= []).push(n);
    }
    return out;
  }, [visible]);

  function open(n: Notification) {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.link) navigate({ to: n.link });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-navy/10 pb-5">
        <div>
          <h1 className="text-xl font-bold text-brand-navy">Notifications</h1>
          <p className="mt-1 text-sm text-brand-navy/55">
            {unreadCount > 0
              ? `${unreadCount} unread ${unreadCount === 1 ? "update" : "updates"} on your orders and payments.`
              : "Updates on your orders, payments and deliveries."}
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setUnreadOnly((v) => !v)}
              className={`border-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                unreadOnly
                  ? "border-brand-navy bg-brand-navy text-white"
                  : "border-brand-navy/20 bg-white text-brand-navy/60 hover:border-brand-navy"
              }`}
            >
              Unread only
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="inline-flex items-center gap-1.5 border-2 border-brand-navy px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-navy transition-colors hover:bg-brand-navy hover:text-white disabled:opacity-50"
              >
                {markAll.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Mark all read
              </button>
            )}
          </div>
        )}
      </header>

      {err && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span className="text-sm font-medium text-red-700">{err}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-navy/50" />
          <p className="text-sm text-brand-navy/50">Loading your notifications...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto h-7 w-7 text-red-500" />
          <p className="mt-3 text-sm font-bold text-brand-navy">
            We could not load your notifications
          </p>
          <p className="mt-1 text-xs text-brand-navy/60">
            {error instanceof Error ? error.message : "Please try again shortly."}
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-brand-navy/15 bg-white p-14 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-surface">
            {unreadOnly ? (
              <BellOff className="h-6 w-6 text-brand-navy/35" />
            ) : (
              <Bell className="h-6 w-6 text-brand-navy/35" />
            )}
          </div>
          <h2 className="mt-5 text-base font-bold text-brand-navy">
            {unreadOnly ? "Nothing unread" : "No notifications yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-brand-navy/55">
            {unreadOnly
              ? "You are all caught up."
              : "We will let you know here when your order moves forward, a payment clears, or a delivery is on its way."}
          </p>
          {unreadOnly && (
            <button
              type="button"
              onClick={() => setUnreadOnly(false)}
              className="mt-5 text-xs font-bold uppercase tracking-wide text-brand-orange hover:text-brand-navy"
            >
              Show all
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {(["Today", "This week", "Earlier"] as const).map((bucket) => {
            const list = grouped[bucket];
            if (!list || list.length === 0) return null;
            return (
              <section key={bucket}>
                <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-brand-navy/45">
                  {bucket}
                </h2>
                <ul className="divide-y divide-brand-navy/8 overflow-hidden rounded-xl border border-brand-navy/12 bg-white">
                  {list.map((n) => {
                    const Icon = KIND_ICON[n.kind] ?? Megaphone;
                    const tone = KIND_TONE[n.kind] ?? "text-brand-navy bg-brand-surface border-brand-navy/10";
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => open(n)}
                          className={`flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-brand-surface/50 ${
                            !n.is_read ? "bg-brand-surface/40" : ""
                          }`}
                        >
                          <div
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${tone}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div
                              className={`text-sm leading-snug ${
                                !n.is_read ? "font-bold text-brand-navy" : "text-brand-navy/70"
                              }`}
                            >
                              {n.title}
                            </div>
                            {n.body && (
                              <p className="mt-1 text-xs leading-relaxed text-brand-navy/60">
                                {n.body}
                              </p>
                            )}
                            <div className="mt-1.5 text-[11px] text-brand-navy/40">
                              {when(n.created_at)}
                            </div>
                          </div>

                          {!n.is_read && (
                            <span
                              className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-orange"
                              aria-label="Unread"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          {items.some((i) => i.is_read) && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => clearRead.mutate()}
                disabled={clearRead.isPending}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-navy/45 transition-colors hover:text-red-600 disabled:opacity-50"
              >
                {clearRead.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Clear read notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}