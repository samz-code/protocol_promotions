import { useEffect, useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import {
  Bell, Package, FileText, CreditCard, Megaphone, Truck,
  CheckCircle2, AlertCircle, Check, Loader2,
} from "lucide-react";

/* ============================================================
   Bell with a live badge and a short preview list.

   New notifications arrive over Supabase Realtime, so someone
   with the dashboard open sees them without refreshing.
   ============================================================ */

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

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
  payment_rejected: "text-red-600 bg-red-50",
  payment_confirmed: "text-emerald-700 bg-emerald-50",
  payment_received: "text-emerald-700 bg-emerald-50",
  delivery_complete: "text-emerald-700 bg-emerald-50",
  production_complete: "text-emerald-700 bg-emerald-50",
};

function when(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

async function fetchRecent(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, is_read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export function NotificationBell({ to = "/dashboard/notifications" }: { to?: string }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const userId = session?.user?.id;

  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["notification-bell", userId],
    queryFn: () => fetchRecent(userId!),
    enabled: !!userId,
    refetchInterval: 60_000,
  });

  const unread = items.filter((n) => !n.is_read).length;

  // Live updates. A new row for this user refreshes the list and
  // pulses the bell so it is noticed without a page reload.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["notification-bell", userId] });
          qc.invalidateQueries({ queryKey: ["notifications", userId] });
          setPulse(true);
          setTimeout(() => setPulse(false), 2000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  // Close when clicking away.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-bell", userId] });
      qc.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId!)
        .eq("is_read", false);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-bell", userId] });
      qc.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  if (!userId) return null;

  return (
    <div className="relative" ref={panelRef}>
      <style>{`
        @keyframes bellShake {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-12deg); }
          40% { transform: rotate(10deg); }
          60% { transform: rotate(-6deg); }
          80% { transform: rotate(4deg); }
        }
        .bell-shake { animation: bellShake 0.6s ease-in-out 2; }
        @media (prefers-reduced-motion: reduce) {
          .bell-shake { animation: none; }
        }
      `}</style>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-md text-brand-navy transition-colors hover:bg-brand-surface hover:text-brand-orange"
        aria-label={`${unread} unread notifications`}
        title="Notifications"
      >
        <Bell className={`h-5 w-5 ${pulse ? "bell-shake" : ""}`} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-orange px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-brand-navy/20 sm:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {open && (
        <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl border border-brand-navy/15 bg-white shadow-[0_16px_40px_-12px_rgba(30,41,89,0.3)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-80">
          <div className="flex items-center justify-between border-b border-brand-navy/10 px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-wide text-brand-navy">
              Notifications
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-orange transition-colors hover:text-brand-navy disabled:opacity-50"
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

          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto h-6 w-6 text-brand-navy/25" />
              <p className="mt-2.5 text-xs text-brand-navy/50">Nothing yet</p>
            </div>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-brand-navy/8 overflow-y-auto sm:max-h-80">
              {items.map((n) => {
                const Icon = KIND_ICON[n.kind] ?? Megaphone;
                const tone = KIND_TONE[n.kind] ?? "text-brand-navy bg-brand-surface";
                const inner = (
                  <>
                    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs leading-snug ${
                          !n.is_read ? "font-bold text-brand-navy" : "text-brand-navy/65"
                        }`}
                      >
                        {n.title}
                      </div>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-brand-navy/55">
                          {n.body}
                        </p>
                      )}
                      <div className="mt-1 text-[10px] text-brand-navy/40">{when(n.created_at)}</div>
                    </div>
                    {!n.is_read && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-orange" />
                    )}
                  </>
                );

                const className = `flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-surface/60 ${
                  !n.is_read ? "bg-brand-surface/40" : ""
                }`;

                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link
                        to={n.link}
                        onClick={() => {
                          if (!n.is_read) markRead.mutate(n.id);
                          setOpen(false);
                        }}
                        className={className}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { if (!n.is_read) markRead.mutate(n.id); }}
                        className={className}
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            to={to}
            onClick={() => setOpen(false)}
            className="block border-t border-brand-navy/10 bg-brand-surface/50 px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-brand-navy transition-colors hover:text-brand-orange"
          >
            See all
          </Link>
        </div>
      )}
    </div>
  );
}