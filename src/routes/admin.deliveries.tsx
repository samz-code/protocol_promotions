import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  AdminHeader, AdminLoading, AdminError, AdminEmpty, StatusBadge,
  ConfirmDialog, AdminField, inputCls, kes, ago,
} from "@/lib/admin-ui";
import {
  Plus, Truck, Package, Search, X, Loader2, Check, Trash2, Pencil,
  MapPin, Phone, Store, ArrowRight, CheckCircle2, AlertTriangle, Clock,
} from "lucide-react";

export const Route = createFileRoute("/admin/deliveries")({
  head: () => ({ meta: [{ title: "Deliveries | Admin" }] }),
  component: DeliveriesPage,
});

/* ------------------------------------------------------------------ types */

type DeliveryStatus =
  | "pending" | "assigned" | "picked_up" | "in_transit"
  | "delivered" | "failed" | "returned";

type Delivery = {
  id: string;
  order_id: string | null;
  zone_id: string | null;
  status: DeliveryStatus | null;
  is_pickup: boolean;
  courier_name: string | null;
  courier_phone: string | null;
  tracking_number: string | null;
  recipient_name: string | null;
  notes: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  created_at: string;
  orders: {
    order_number: string;
    customer_name: string;
    delivery_address: string | null;
    delivery_city: string | null;
  } | null;
  delivery_zones: { name: string; fee: number; eta: string | null } | null;
};

type Zone = { id: string; name: string; fee: number; eta: string | null };

type OrderOption = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
};

/* ------------------------------------------------------------ status data */

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  picked_up: "Picked up",
  in_transit: "In transit",
  delivered: "Delivered",
  failed: "Failed",
  returned: "Returned",
};

/** The normal path. Failed and returned sit outside it. */
const FLOW: DeliveryStatus[] = ["pending", "assigned", "picked_up", "in_transit", "delivered"];

const CLOSED: DeliveryStatus[] = ["delivered", "failed", "returned"];

const STATUS_ACTION: Record<DeliveryStatus, string> = {
  pending: "Assign a courier, or mark it for customer pickup.",
  assigned: "Courier assigned. Hand the goods over when they arrive.",
  picked_up: "Courier has the goods. Mark it in transit once it leaves.",
  in_transit: "On the way. Confirm delivery once the customer receives it.",
  delivered: "Delivered. Nothing further needed.",
  failed: "Delivery failed. Arrange another attempt or return it.",
  returned: "Goods came back. Contact the customer to rearrange.",
};

/* --------------------------------------------------------------- queries */

async function fetchDeliveries(): Promise<Delivery[]> {
  const { data, error } = await supabase
    .from("deliveries")
    .select(
      "id, order_id, zone_id, status, is_pickup, courier_name, courier_phone, tracking_number, recipient_name, notes, dispatched_at, delivered_at, created_at, orders(order_number, customer_name, delivery_address, delivery_city), delivery_zones(name, fee, eta)"
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as unknown as Delivery[];
}

async function fetchZones(): Promise<Zone[]> {
  const { data, error } = await supabase
    .from("delivery_zones")
    .select("id, name, fee, eta")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Zone[];
}

async function fetchOrderOptions(): Promise<OrderOption[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, customer_phone, delivery_address, delivery_city")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as OrderOption[];
}

/* ------------------------------------------------------------------- page */

type Filter = "all" | "active" | "pickup" | "delivered" | "problem";

function DeliveriesPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "deliveries"], queryFn: fetchDeliveries });
  const zones = useQuery({ queryKey: ["admin", "delivery-zones"], queryFn: fetchZones });
  const orders = useQuery({ queryKey: ["admin", "order-options"], queryFn: fetchOrderOptions });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Delivery | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Delivery | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [err, setErr] = useState<string | null>(null);

  const advance = useMutation({
    mutationFn: async ({ d, next }: { d: Delivery; next: DeliveryStatus }) => {
      const patch: Record<string, unknown> = { status: next };
      // Stamp the timestamps as the delivery moves.
      if (next === "picked_up" && !d.dispatched_at) {
        patch.dispatched_at = new Date().toISOString();
      }
      if (next === "delivered") {
        patch.delivered_at = new Date().toISOString();
      }
      const { error } = await supabase.from("deliveries").update(patch).eq("id", d.id);
      if (error) throw error;

      // Keep the order in step with the delivery.
      if (d.order_id) {
        if (next === "in_transit") {
          await supabase.from("orders").update({ status: "out_for_delivery" }).eq("id", d.order_id);
        }
        if (next === "delivered") {
          await supabase.from("orders").update({ status: "delivered" }).eq("id", d.order_id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "deliveries"] });
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deliveries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "deliveries"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => setErr(e.message),
  });

  const all = query.data ?? [];

  const stats = useMemo(() => {
    return {
      awaiting: all.filter((d) => d.status === "pending" || d.status === "assigned").length,
      moving: all.filter((d) => d.status === "picked_up" || d.status === "in_transit").length,
      delivered: all.filter((d) => d.status === "delivered").length,
      problem: all.filter((d) => d.status === "failed" || d.status === "returned").length,
    };
  }, [all]);

  const counts = {
    all: all.length,
    active: all.filter((d) => !CLOSED.includes((d.status ?? "pending") as DeliveryStatus)).length,
    pickup: all.filter((d) => d.is_pickup).length,
    delivered: stats.delivered,
    problem: stats.problem,
  };

  const rows = useMemo(() => {
    let list = all;

    if (filter === "active")
      list = list.filter((d) => !CLOSED.includes((d.status ?? "pending") as DeliveryStatus));
    if (filter === "pickup") list = list.filter((d) => d.is_pickup);
    if (filter === "delivered") list = list.filter((d) => d.status === "delivered");
    if (filter === "problem")
      list = list.filter((d) => d.status === "failed" || d.status === "returned");

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          (d.orders?.order_number ?? "").toLowerCase().includes(q) ||
          (d.orders?.customer_name ?? "").toLowerCase().includes(q) ||
          (d.recipient_name ?? "").toLowerCase().includes(q) ||
          (d.tracking_number ?? "").toLowerCase().includes(q) ||
          (d.courier_name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [all, filter, search]);

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "pickup", label: "Pickups" },
    { id: "delivered", label: "Delivered" },
    { id: "problem", label: "Problems" },
  ];

  if (query.isLoading) return <AdminLoading />;
  if (query.isError) return <AdminError message={(query.error as Error).message} />;

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Deliveries"
        subtitle="Track every order on its way to the customer, by courier or pickup."
        action={
          <button
            type="button"
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="inline-flex items-center gap-2 bg-brand-navy px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] transition-all hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> New delivery
          </button>
        }
      />

      {err && <AdminError message={err} />}

      <div className="grid gap-px border border-brand-navy/15 bg-brand-navy/15 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Clock} label="Awaiting dispatch" value={String(stats.awaiting)} accent={stats.awaiting > 0} />
        <Stat icon={Truck} label="On the road" value={String(stats.moving)} />
        <Stat icon={CheckCircle2} label="Delivered" value={String(stats.delivered)} />
        <Stat icon={AlertTriangle} label="Failed or returned" value={String(stats.problem)} accent={stats.problem > 0} />
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order, customer, courier or tracking number"
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
              ? "No deliveries yet. Create one from a completed order to start tracking it."
              : "Nothing matches those filters."
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((d) => (
            <DeliveryCard
              key={d.id}
              delivery={d}
              busy={advance.isPending}
              onAdvance={(next) => advance.mutate({ d, next })}
              onEdit={() => { setEditing(d); setFormOpen(true); }}
              onDelete={() => setDeleteTarget(d)}
            />
          ))}
        </ul>
      )}

      {formOpen && (
        <DeliveryForm
          existing={editing}
          zones={zones.data ?? []}
          orders={orders.data ?? []}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin", "deliveries"] });
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this delivery record?"
          body={`This removes the delivery for ${deleteTarget.orders?.order_number ?? "this order"}. The order itself is not affected.`}
          confirmLabel="Delete delivery"
          isPending={del.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => del.mutate(deleteTarget.id)}
        />
      )}
    </div>
  );
}

function Stat({
  icon: Icon, label, value, accent,
}: {
  icon: typeof Truck;
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

/* ------------------------------------------------------------------ card */

function DeliveryCard({
  delivery: d, busy, onAdvance, onEdit, onDelete,
}: {
  delivery: Delivery;
  busy: boolean;
  onAdvance: (next: DeliveryStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = (d.status ?? "pending") as DeliveryStatus;
  const idx = FLOW.indexOf(status);
  const next = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null;
  const closed = CLOSED.includes(status);
  const problem = status === "failed" || status === "returned";

  const address = [d.orders?.delivery_address, d.orders?.delivery_city]
    .filter(Boolean)
    .join(", ");

  return (
    <li className="border-2 border-brand-navy/12 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-black text-brand-navy">
              {d.orders?.order_number ?? "Unlinked"}
            </span>
            <StatusBadge
              label={STATUS_LABEL[status]}
              tone={status === "delivered" ? "good" : problem ? "warn" : "solid"}
            />
            {d.is_pickup && (
              <span className="inline-flex items-center gap-1 border border-brand-navy/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-navy/60">
                <Store className="h-3 w-3" /> Pickup
              </span>
            )}
          </div>

          <div className="mt-1.5 text-sm font-bold text-brand-navy">
            {d.recipient_name ?? d.orders?.customer_name ?? "No recipient set"}
          </div>

          <div className="mt-1 space-y-1 text-[11px] text-brand-navy/55">
            {address && (
              <div className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-brand-navy/35" />
                <span>{address}</span>
              </div>
            )}
            {!d.is_pickup && d.courier_name && (
              <div className="flex items-center gap-1.5">
                <Truck className="h-3 w-3 shrink-0 text-brand-navy/35" />
                <span>{d.courier_name}</span>
                {d.courier_phone && (
                  <a
                    href={`tel:${d.courier_phone}`}
                    className="inline-flex items-center gap-1 font-mono text-brand-navy/70 hover:text-brand-orange"
                  >
                    <Phone className="h-3 w-3" />
                    {d.courier_phone}
                  </a>
                )}
              </div>
            )}
            {d.tracking_number && (
              <div className="font-mono text-brand-navy/60">Tracking {d.tracking_number}</div>
            )}
            {d.notes && (
              <p className="border-l-2 border-brand-navy/15 pl-2 italic">{d.notes}</p>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          {d.delivery_zones && (
            <>
              <div className="text-sm font-bold text-brand-navy">{d.delivery_zones.name}</div>
              <div className="mt-0.5 text-[11px] tabular-nums text-brand-navy/55">
                {kes(Number(d.delivery_zones.fee))}
              </div>
              {d.delivery_zones.eta && (
                <div className="text-[11px] text-brand-navy/45">{d.delivery_zones.eta}</div>
              )}
            </>
          )}
          <div className="mt-1.5 text-[10px] text-brand-navy/40">
            {ago(d.delivered_at ?? d.dispatched_at ?? d.created_at)}
          </div>
        </div>
      </div>

      {/* What to do next */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-navy/10 bg-brand-surface/50 p-3">
        <p className="min-w-0 flex-1 text-[11px] text-brand-navy/60">{STATUS_ACTION[status]}</p>

        <div className="flex shrink-0 flex-wrap gap-1.5">
          {next && !closed && (
            <button
              type="button"
              onClick={() => onAdvance(next)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 bg-brand-orange px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-white transition-all hover:brightness-110 disabled:opacity-40"
            >
              {STATUS_LABEL[next]} <ArrowRight className="h-3 w-3" />
            </button>
          )}

          {!closed && (
            <button
              type="button"
              onClick={() => onAdvance("failed")}
              disabled={busy}
              className="border-2 border-brand-navy/20 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-navy/60 transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-40"
            >
              Failed
            </button>
          )}

          {problem && (
            <button
              type="button"
              onClick={() => onAdvance("pending")}
              disabled={busy}
              className="border-2 border-brand-navy px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-navy transition-colors hover:bg-brand-navy hover:text-white disabled:opacity-40"
            >
              Try again
            </button>
          )}

          <button
            type="button"
            onClick={onEdit}
            className="grid h-7 w-7 place-items-center border-2 border-transparent text-brand-navy/50 transition-colors hover:border-brand-navy/15 hover:bg-white hover:text-brand-navy"
            title="Edit"
            aria-label="Edit delivery"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="grid h-7 w-7 place-items-center border-2 border-transparent text-brand-navy/50 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            title="Delete"
            aria-label="Delete delivery"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ form */

function DeliveryForm({
  existing, zones, orders, onClose, onSaved,
}: {
  existing: Delivery | null;
  zones: Zone[];
  orders: OrderOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [orderId, setOrderId] = useState(existing?.order_id ?? "");
  const [zoneId, setZoneId] = useState(existing?.zone_id ?? "");
  const [isPickup, setIsPickup] = useState(existing?.is_pickup ?? false);
  const [status, setStatus] = useState<DeliveryStatus>((existing?.status ?? "pending") as DeliveryStatus);
  const [recipient, setRecipient] = useState(existing?.recipient_name ?? "");
  const [courier, setCourier] = useState(existing?.courier_name ?? "");
  const [courierPhone, setCourierPhone] = useState(existing?.courier_phone ?? "");
  const [tracking, setTracking] = useState(existing?.tracking_number ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
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
  const chosenZone = zones.find((z) => z.id === zoneId) ?? null;

  // Pull the recipient from the order so nobody retypes it.
  function pickOrder(o: OrderOption) {
    setOrderId(o.id);
    if (!recipient) setRecipient(o.customer_name);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!orderId) throw new Error("Choose which order this delivery is for.");

      const row = {
        order_id: orderId,
        zone_id: zoneId || null,
        status,
        is_pickup: isPickup,
        recipient_name: recipient.trim() || null,
        courier_name: isPickup ? null : courier.trim() || null,
        courier_phone: isPickup ? null : courierPhone.trim() || null,
        tracking_number: tracking.trim() || null,
        notes: notes.trim() || null,
        dispatched_at:
          existing?.dispatched_at ??
          (["picked_up", "in_transit", "delivered"].includes(status)
            ? new Date().toISOString()
            : null),
        delivered_at:
          status === "delivered"
            ? existing?.delivered_at ?? new Date().toISOString()
            : null,
      };

      if (existing) {
        const { error } = await supabase.from("deliveries").update(row).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("deliveries").insert(row);
        if (error) throw error;
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
            {existing ? "Edit delivery" : "New delivery"}
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

          {/* Order picker */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-brand-navy">
              Which order <span className="text-brand-orange">*</span>
            </label>

            {chosen ? (
              <div className="border-2 border-brand-navy bg-brand-surface px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-bold text-brand-navy">
                      {chosen.order_number}
                    </div>
                    <div className="truncate text-[11px] text-brand-navy/60">
                      {chosen.customer_name}
                    </div>
                    {(chosen.delivery_address || chosen.delivery_city) && (
                      <div className="mt-1 text-[11px] text-brand-navy/50">
                        {[chosen.delivery_address, chosen.delivery_city].filter(Boolean).join(", ")}
                      </div>
                    )}
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
                          onClick={() => pickOrder(o)}
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

          {/* Courier or pickup */}
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-brand-navy">
              How it gets there
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPickup(false)}
                className={`flex items-center justify-center gap-2 border-2 px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                  !isPickup
                    ? "border-brand-navy bg-brand-navy text-white"
                    : "border-brand-navy/20 bg-white text-brand-navy/60 hover:border-brand-navy/40"
                }`}
              >
                <Truck className="h-3.5 w-3.5" /> Courier
              </button>
              <button
                type="button"
                onClick={() => setIsPickup(true)}
                className={`flex items-center justify-center gap-2 border-2 px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                  isPickup
                    ? "border-brand-navy bg-brand-navy text-white"
                    : "border-brand-navy/20 bg-white text-brand-navy/60 hover:border-brand-navy/40"
                }`}
              >
                <Store className="h-3.5 w-3.5" /> Pickup
              </button>
            </div>
          </div>

          <AdminField id="d-recipient" label="Recipient" hint="Who is receiving the goods">
            <input
              id="d-recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Name of the person collecting or receiving"
              className={inputCls}
            />
          </AdminField>

          {!isPickup && (
            <>
              <AdminField id="d-zone" label="Delivery zone" hint="Sets the delivery fee">
                <select
                  id="d-zone"
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">No zone selected</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({kes(Number(z.fee))})
                    </option>
                  ))}
                </select>
              </AdminField>

              {chosenZone?.eta && (
                <p className="border-l-2 border-brand-orange/40 pl-2.5 text-xs text-brand-navy/55">
                  Typical delivery time: {chosenZone.eta}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <AdminField id="d-courier" label="Courier">
                  <input
                    id="d-courier"
                    value={courier}
                    onChange={(e) => setCourier(e.target.value)}
                    placeholder="G4S, Sendy"
                    className={inputCls}
                  />
                </AdminField>
                <AdminField id="d-cphone" label="Courier phone">
                  <input
                    id="d-cphone"
                    value={courierPhone}
                    onChange={(e) => setCourierPhone(e.target.value)}
                    placeholder="+254 7.."
                    className={inputCls}
                  />
                </AdminField>
              </div>

              <AdminField id="d-track" label="Tracking number" hint="Share this with the customer">
                <input
                  id="d-track"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value.toUpperCase())}
                  placeholder="TRK123456"
                  className={`${inputCls} font-mono`}
                />
              </AdminField>
            </>
          )}

          <AdminField id="d-status" label="Status">
            <select
              id="d-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as DeliveryStatus)}
              className={inputCls}
            >
              {(Object.keys(STATUS_LABEL) as DeliveryStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField id="d-notes" label="Notes" hint="Gate code, landmark, delivery window">
            <textarea
              id="d-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputCls} leading-relaxed`}
            />
          </AdminField>

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
            {existing ? "Update delivery" : "Create delivery"}
          </button>
        </div>
      </div>
    </div>
  );
}