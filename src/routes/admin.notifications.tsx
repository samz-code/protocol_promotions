import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  AdminHeader, AdminLoading, AdminError, AdminEmpty, ConfirmDialog, inputCls, ago,
} from "@/lib/admin-ui";
import {
  Bell, BellOff, Package, FileText, CreditCard, Megaphone, Truck,
  CheckCircle2, AlertCircle, Check, Trash2, Search, X, Loader2, Users,
} from "lucide-react";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications | Admin" }] }),
  component: AdminNotificationsPage,
});

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  audience: string;
  user_id: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string } | null;
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
  payment_rejected: "border-red-200 bg-red-50 text-red-600",
  low_stock: "border-amber-200 bg-amber-50 text-amber-700",
  payment_confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  payment_received: "border-emerald-200 bg-emerald-50 text-emerald-700",
  delivery_complete: "border-emerald-200 bg-emerald-50 text-emerald-700",
  production_complete: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function label(kind: string) {
  return kind.replace(/_/g, " ");
}

async function fetchNotifications(): Promise<Notification[]> {
  // No embedded join here. notifications.user_id points at auth.users, not
  // profiles, so PostgREST cannot resolve profiles(...) as a relationship.
  // Fetching the names separately keeps this working regardless of keys.
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, is_read, audience, user_id, created_at")
    .order("created_at", { ascending: false })
    .limit(400);
  if (error) throw error;

  const rows = (data ?? []) as Omit<Notification, "profiles">[];

  const userIds = Array.from(
    new Set(rows.map((r) => r.user_id).filter((id): id is string => Boolean(id)))
  );

  const nameById = new Map<string, { full_name: string | null; email: string }>();
  if (userIds.length > 0) {
    const { data: people } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    for (const p of people ?? []) {
      nameById.set(p.id, { full_name: p.full_name, email: p.email });
    }
  }

  return rows.map((r) => ({
    ...r,
    profiles: r.user_id ? nameById.get(r.user_id) ?? null : null,
  }));
}

type Scope = "staff" | "customer" | "all";

function AdminNotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const query = useQuery({ queryKey: ["admin", "notifications"], queryFn: fetchNotifications });

  const [scope, setScope] = useState<Scope>("staff");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
      qc.invalidateQueries({ queryKey: ["admin", "unread-notifications"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const markAll = useMutation({
    mutationFn: async () => {
      let q = supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
      if (scope !== "all") q = q.eq("audience", scope);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
      qc.invalidateQueries({ queryKey: ["admin", "unread-notifications"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "notifications"] }),
    onError: (e: Error) => setErr(e.message),
  });

  const clearRead = useMutation({
    mutationFn: async () => {
      let q = supabase.from("notifications").delete().eq("is_read", true);
      if (scope !== "all") q = q.eq("audience", scope);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
      setConfirmClear(false);
    },
    onError: (e: Error) => setErr(e.message),
  });

  const all = query.data ?? [];

  const scoped = useMemo(
    () => (scope === "all" ? all : all.filter((n) => n.audience === scope)),
    [all, scope]
  );

  const kinds = useMemo(() => {
    const set = new Set(scoped.map((n) => n.kind));
    return Array.from(set).sort();
  }, [scoped]);

  const rows = useMemo(() => {
    let list = scoped;
    if (unreadOnly) list = list.filter((n) => !n.is_read);
    if (kindFilter !== "all") list = list.filter((n) => n.kind === kindFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.body ?? "").toLowerCase().includes(q) ||
          (n.profiles?.full_name ?? "").toLowerCase().includes(q) ||
          (n.profiles?.email ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [scoped, unreadOnly, kindFilter, search]);

  const counts = {
    staff: all.filter((n) => n.audience === "staff").length,
    customer: all.filter((n) => n.audience === "customer").length,
    all: all.length,
  };

  const unreadInScope = scoped.filter((n) => !n.is_read).length;

  if (query.isLoading) return <AdminLoading />;
  if (query.isError) return <AdminError message={(query.error as Error).message} />;

  const SCOPES: { id: Scope; label: string }[] = [
    { id: "staff", label: "Staff alerts" },
    { id: "customer", label: "Sent to customers" },
    { id: "all", label: "Everything" },
  ];

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Notifications"
        subtitle="Alerts for your team, and a record of everything customers were told."
        action={
          unreadInScope > 0 ? (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="inline-flex items-center gap-2 border-2 border-brand-navy px-4 py-2.5 text-xs font-black uppercase tracking-widest text-brand-navy transition-colors hover:bg-brand-navy hover:text-white disabled:opacity-50"
            >
              {markAll.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Mark all read
            </button>
          ) : undefined
        }
      />

      {err && <AdminError message={err} />}

      {/* Audience switch */}
      <div className="flex gap-1.5 overflow-x-auto border-b-2 border-brand-navy/15 pb-0">
        {SCOPES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => { setScope(s.id); setKindFilter("all"); }}
            className={`-mb-0.5 shrink-0 border-b-2 px-4 py-2.5 text-xs font-black uppercase tracking-wide transition-colors ${
              scope === s.id
                ? "border-brand-orange text-brand-navy"
                : "border-transparent text-brand-navy/40 hover:text-brand-navy"
            }`}
          >
            {s.label}
            <span className="ml-1.5 text-brand-navy/35">{counts[s.id]}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, message or recipient"
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

        {kinds.length > 1 && (
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className={`${inputCls} sm:w-52`}
          >
            <option value="all">All types</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {label(k)}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => setUnreadOnly((v) => !v)}
          className={`shrink-0 border-2 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
            unreadOnly
              ? "border-brand-navy bg-brand-navy text-white"
              : "border-brand-navy/20 bg-white text-brand-navy/60 hover:border-brand-navy"
          }`}
        >
          Unread only
          {unreadInScope > 0 && (
            <span className={unreadOnly ? "ml-1.5 text-brand-orange" : "ml-1.5 text-brand-navy/35"}>
              {unreadInScope}
            </span>
          )}
        </button>
      </div>

      {rows.length === 0 ? (
        <AdminEmpty
          text={
            all.length === 0
              ? "No notifications yet. They appear automatically as orders move, payments land and deliveries go out."
              : unreadOnly
                ? "Nothing unread here."
                : "Nothing matches those filters."
          }
        />
      ) : (
        <ul className="divide-y divide-brand-navy/8 overflow-hidden border-2 border-brand-navy/12 bg-white">
          {rows.map((n) => {
            const Icon = KIND_ICON[n.kind] ?? Megaphone;
            const tone = KIND_TONE[n.kind] ?? "border-brand-navy/10 bg-brand-surface text-brand-navy";
            return (
              <li
                key={n.id}
                className={`flex items-start gap-4 p-4 transition-colors hover:bg-brand-surface/40 ${
                  !n.is_read ? "bg-brand-surface/30" : ""
                }`}
              >
                <div className={`grid h-9 w-9 shrink-0 place-items-center border ${tone}`}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm leading-snug ${
                        !n.is_read ? "font-bold text-brand-navy" : "text-brand-navy/70"
                      }`}
                    >
                      {n.title}
                    </span>
                    <span className="border border-brand-navy/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-navy/45">
                      {label(n.kind)}
                    </span>
                  </div>

                  {n.body && (
                    <p className="mt-1 text-xs leading-relaxed text-brand-navy/60">{n.body}</p>
                  )}

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-brand-navy/40">
                    <span>{ago(n.created_at)}</span>
                    {n.audience === "customer" && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {n.profiles?.full_name ?? n.profiles?.email ?? "Customer"}
                      </span>
                    )}
                    {n.link && (
                      <button
                        type="button"
                        onClick={() => navigate({ to: n.link! })}
                        className="font-bold text-brand-orange hover:text-brand-navy"
                      >
                        Open
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={() => markRead.mutate(n.id)}
                      className="grid h-8 w-8 place-items-center border-2 border-transparent text-brand-navy/50 transition-colors hover:border-brand-navy/15 hover:bg-brand-surface hover:text-brand-navy"
                      title="Mark as read"
                      aria-label="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => del.mutate(n.id)}
                    className="grid h-8 w-8 place-items-center border-2 border-transparent text-brand-navy/40 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                    aria-label="Delete notification"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {scoped.some((n) => n.is_read) && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-navy/45 transition-colors hover:text-red-600"
          >
            <Trash2 className="h-3 w-3" /> Clear read notifications
          </button>
        </div>
      )}

      {confirmClear && (
        <ConfirmDialog
          title="Clear read notifications?"
          body={`This permanently removes every read notification in ${
            scope === "all" ? "all views" : scope === "staff" ? "staff alerts" : "customer notifications"
          }. Unread ones are kept.`}
          confirmLabel="Clear them"
          isPending={clearRead.isPending}
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => clearRead.mutate()}
        />
      )}
    </div>
  );
}