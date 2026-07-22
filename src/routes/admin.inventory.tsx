import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Search, Check, Loader2, Plus, X, Package, AlertTriangle,
  Boxes, Trash2, Pencil, Eye, EyeOff, Minus,
} from "lucide-react";
import {
  AdminHeader, AdminLoading, AdminError, AdminEmpty, ConfirmDialog,
  AdminField, inputCls,
} from "@/lib/admin-ui";

export const Route = createFileRoute("/admin/inventory")({
  head: () => ({ meta: [{ title: "Inventory | Admin" }] }),
  component: InventoryPage,
});

/* ------------------------------------------------------------------ types */

type Variant = {
  id: string;
  product_id: string;
  sku: string;
  color: string | null;
  size: string | null;
  material: string | null;
  print_method: string | null;
  price_delta: number;
  stock_qty: number;
  low_stock_at: number;
  is_active: boolean;
  products: { name: string } | null;
};

type ProductOption = {
  id: string;
  name: string;
  sku: string | null;
  colors: string[] | null;
  sizes: string[] | null;
};

/* --------------------------------------------------------------- queries */

async function fetchVariants(): Promise<Variant[]> {
  const { data, error } = await supabase
    .from("product_variants")
    .select(
      "id, product_id, sku, color, size, material, print_method, price_delta, stock_qty, low_stock_at, is_active, products(name)"
    )
    .order("stock_qty", { ascending: true })
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as unknown as Variant[];
}

async function fetchProductOptions(): Promise<ProductOption[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku, colors, sizes")
    .order("name");
  if (error) throw error;
  return (data ?? []) as unknown as ProductOption[];
}

/* ------------------------------------------------------------------- page */

type Filter = "all" | "low" | "out" | "hidden";

function InventoryPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "inventory"], queryFn: fetchVariants });
  const products = useQuery({ queryKey: ["admin", "product-options"], queryFn: fetchProductOptions });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Variant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Variant | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const setStock = useMutation({
    mutationFn: async ({ id, stock_qty }: { id: string; stock_qty: number }) => {
      const { error } = await supabase
        .from("product_variants")
        .update({ stock_qty })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      setEdits((e) => {
        const n = { ...e };
        delete n[vars.id];
        return n;
      });
      qc.invalidateQueries({ queryKey: ["admin", "inventory"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (v: Variant) => {
      const { error } = await supabase
        .from("product_variants")
        .update({ is_active: !v.is_active })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "inventory"] }),
    onError: (e: Error) => setErr(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_variants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "inventory"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => setErr(e.message),
  });

  const all = query.data ?? [];

  const stats = useMemo(() => {
    const active = all.filter((v) => v.is_active);
    return {
      total: all.length,
      units: active.reduce((s, v) => s + (v.stock_qty || 0), 0),
      low: active.filter((v) => v.stock_qty > 0 && v.stock_qty <= v.low_stock_at).length,
      out: active.filter((v) => v.stock_qty <= 0).length,
    };
  }, [all]);

  const counts = {
    all: all.length,
    low: all.filter((v) => v.is_active && v.stock_qty > 0 && v.stock_qty <= v.low_stock_at).length,
    out: all.filter((v) => v.is_active && v.stock_qty <= 0).length,
    hidden: all.filter((v) => !v.is_active).length,
  };

  const rows = useMemo(() => {
    let list = all;

    if (filter === "low")
      list = list.filter((v) => v.is_active && v.stock_qty > 0 && v.stock_qty <= v.low_stock_at);
    if (filter === "out") list = list.filter((v) => v.is_active && v.stock_qty <= 0);
    if (filter === "hidden") list = list.filter((v) => !v.is_active);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.sku.toLowerCase().includes(q) ||
          (v.products?.name ?? "").toLowerCase().includes(q) ||
          (v.color ?? "").toLowerCase().includes(q) ||
          (v.size ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [all, filter, search]);

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "low", label: "Low stock" },
    { id: "out", label: "Out of stock" },
    { id: "hidden", label: "Hidden" },
  ];

  if (query.isLoading) return <AdminLoading />;
  if (query.isError) return <AdminError message={(query.error as Error).message} />;

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Inventory"
        subtitle="Stock levels for every product variant, by colour and size."
        action={
          <button
            type="button"
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="inline-flex items-center gap-2 bg-brand-navy px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] transition-all hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> New variant
          </button>
        }
      />

      {err && <AdminError message={err} />}

      <div className="grid gap-px border border-brand-navy/15 bg-brand-navy/15 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Boxes} label="Variants" value={String(stats.total)} />
        <Stat icon={Package} label="Units in stock" value={stats.units.toLocaleString("en-KE")} />
        <Stat icon={AlertTriangle} label="Low stock" value={String(stats.low)} accent={stats.low > 0} />
        <Stat icon={X} label="Out of stock" value={String(stats.out)} accent={stats.out > 0} />
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, SKU, colour or size"
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
              ? "No variants yet. Add one per colour or size so the shop can show live stock."
              : "Nothing matches those filters."
          }
        />
      ) : (
        <>
          {/* Cards on mobile */}
          <div className="space-y-2.5 lg:hidden">
            {rows.map((v) => (
              <VariantCard
                key={v.id}
                variant={v}
                value={edits[v.id] ?? v.stock_qty}
                dirty={edits[v.id] !== undefined && edits[v.id] !== v.stock_qty}
                saving={setStock.isPending && setStock.variables?.id === v.id}
                onChange={(n) => setEdits((ed) => ({ ...ed, [v.id]: n }))}
                onSave={() => setStock.mutate({ id: v.id, stock_qty: edits[v.id] ?? v.stock_qty })}
                onEdit={() => { setEditing(v); setFormOpen(true); }}
                onToggle={() => toggleActive.mutate(v)}
                onDelete={() => setDeleteTarget(v)}
              />
            ))}
          </div>

          {/* Table on desktop */}
          <div className="hidden overflow-x-auto border-2 border-brand-navy lg:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-brand-navy text-[11px] font-black uppercase tracking-widest text-white">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Variant</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3 text-right">Adjust</th>
                  <th className="w-28 px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => {
                  const out = v.stock_qty <= 0;
                  const low = !out && v.stock_qty <= v.low_stock_at;
                  const value = edits[v.id] ?? v.stock_qty;
                  const dirty = edits[v.id] !== undefined && edits[v.id] !== v.stock_qty;
                  const saving = setStock.isPending && setStock.variables?.id === v.id;

                  return (
                    <tr
                      key={v.id}
                      className={`border-b border-brand-navy/10 transition-colors hover:bg-brand-surface ${
                        !v.is_active ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-brand-navy">
                          {v.products?.name ?? "Unlinked product"}
                        </div>
                        {!v.is_active && (
                          <span className="mt-0.5 inline-block text-[10px] font-bold uppercase tracking-wide text-brand-navy/45">
                            Hidden from shop
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-brand-navy/60">{v.sku}</td>
                      <td className="px-4 py-3 text-xs text-brand-navy/60">
                        {[v.color, v.size].filter(Boolean).join(" / ") || "Standard"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-black tabular-nums ${
                            out ? "text-red-600" : low ? "text-brand-orange" : "text-brand-navy"
                          }`}
                        >
                          {v.stock_qty}
                        </span>
                        <span className="text-[10px] text-brand-navy/40"> / {v.low_stock_at}</span>
                        {out && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-red-600">
                            Out
                          </span>
                        )}
                        {low && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-brand-orange">
                            Low
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <StepBtn
                            onClick={() =>
                              setEdits((ed) => ({ ...ed, [v.id]: Math.max(0, value - 1) }))
                            }
                            label="Decrease"
                          >
                            <Minus className="h-3 w-3" />
                          </StepBtn>
                          <input
                            type="number"
                            min={0}
                            value={value}
                            onChange={(e) =>
                              setEdits((ed) => ({ ...ed, [v.id]: Math.max(0, Number(e.target.value)) }))
                            }
                            className="w-16 border-2 border-brand-navy/20 px-2 py-1.5 text-center text-sm tabular-nums text-brand-navy outline-none focus:border-brand-navy"
                          />
                          <StepBtn
                            onClick={() => setEdits((ed) => ({ ...ed, [v.id]: value + 1 }))}
                            label="Increase"
                          >
                            <Plus className="h-3 w-3" />
                          </StepBtn>
                          <button
                            type="button"
                            disabled={!dirty || saving}
                            onClick={() => setStock.mutate({ id: v.id, stock_qty: value })}
                            className="grid h-8 w-8 place-items-center bg-brand-navy text-white transition-all hover:brightness-110 disabled:opacity-25"
                            aria-label="Save stock"
                            title="Save"
                          >
                            {saving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-0.5">
                          <IconBtn
                            onClick={() => toggleActive.mutate(v)}
                            label={v.is_active ? "Hide from shop" : "Show in shop"}
                          >
                            {v.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </IconBtn>
                          <IconBtn onClick={() => { setEditing(v); setFormOpen(true); }} label="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn onClick={() => setDeleteTarget(v)} label="Delete" danger>
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {formOpen && (
        <VariantForm
          existing={editing}
          products={products.data ?? []}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin", "inventory"] });
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Delete ${deleteTarget.sku}?`}
          body="This removes the variant and its stock record. The product itself is not affected. If you only want to stop selling it, hide it instead."
          confirmLabel="Delete variant"
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
  icon: typeof Boxes;
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

function StepBtn({
  onClick, children, label,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-8 w-8 place-items-center border-2 border-brand-navy/20 text-brand-navy transition-colors hover:border-brand-navy hover:bg-brand-surface"
    >
      {children}
    </button>
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

function VariantCard({
  variant: v, value, dirty, saving, onChange, onSave, onEdit, onToggle, onDelete,
}: {
  variant: Variant;
  value: number;
  dirty: boolean;
  saving: boolean;
  onChange: (n: number) => void;
  onSave: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const out = v.stock_qty <= 0;
  const low = !out && v.stock_qty <= v.low_stock_at;

  return (
    <div className={`border-2 border-brand-navy/12 bg-white p-4 ${!v.is_active ? "opacity-55" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-brand-navy">
            {v.products?.name ?? "Unlinked product"}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-brand-navy/50">{v.sku}</div>
          <div className="mt-1 text-[11px] text-brand-navy/55">
            {[v.color, v.size].filter(Boolean).join(" / ") || "Standard"}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className={`text-lg font-black tabular-nums ${
              out ? "text-red-600" : low ? "text-brand-orange" : "text-brand-navy"
            }`}
          >
            {v.stock_qty}
          </div>
          <div className="text-[10px] text-brand-navy/40">alert at {v.low_stock_at}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-brand-navy/8 pt-3">
        <div className="flex items-center gap-1.5">
          <StepBtn onClick={() => onChange(Math.max(0, value - 1))} label="Decrease">
            <Minus className="h-3 w-3" />
          </StepBtn>
          <input
            type="number"
            min={0}
            value={value}
            onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
            className="w-16 border-2 border-brand-navy/20 px-2 py-1.5 text-center text-sm tabular-nums text-brand-navy outline-none focus:border-brand-navy"
          />
          <StepBtn onClick={() => onChange(value + 1)} label="Increase">
            <Plus className="h-3 w-3" />
          </StepBtn>
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={onSave}
            className="grid h-8 w-8 place-items-center bg-brand-navy text-white disabled:opacity-25"
            aria-label="Save stock"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div className="flex gap-0.5">
          <IconBtn onClick={onToggle} label={v.is_active ? "Hide" : "Show"}>
            {v.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </IconBtn>
          <IconBtn onClick={onEdit} label="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn onClick={onDelete} label="Delete" danger>
            <Trash2 className="h-3.5 w-3.5" />
          </IconBtn>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ form */

function VariantForm({
  existing, products, onClose, onSaved,
}: {
  existing: Variant | null;
  products: ProductOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [productId, setProductId] = useState(existing?.product_id ?? "");
  const [sku, setSku] = useState(existing?.sku ?? "");
  const [color, setColor] = useState(existing?.color ?? "");
  const [size, setSize] = useState(existing?.size ?? "");
  const [material, setMaterial] = useState(existing?.material ?? "");
  const [printMethod, setPrintMethod] = useState(existing?.print_method ?? "");
  const [priceDelta, setPriceDelta] = useState(String(existing?.price_delta ?? 0));
  const [stock, setStock] = useState(String(existing?.stock_qty ?? 0));
  const [lowAt, setLowAt] = useState(String(existing?.low_stock_at ?? 10));
  const [active, setActive] = useState(existing?.is_active ?? true);
  const [productSearch, setProductSearch] = useState("");
  const [err, setErr] = useState<string | null>(null);

  // Bulk mode picks from the colours and sizes already on the product.
  const [bulkColors, setBulkColors] = useState<string[]>([]);
  const [bulkSizes, setBulkSizes] = useState<string[]>([]);
  const [bulkStock, setBulkStock] = useState("0");

  const chosen = products.find((p) => p.id === productId) ?? null;

  const matches = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 8);
    const q = productSearch.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, productSearch]);

  /** Build a readable SKU from the product code plus the variant traits. */
  function suggestSku(base: string, c: string, s: string) {
    const part = (v: string) => v.trim().slice(0, 3).toUpperCase().replace(/\s+/g, "");
    return [base, part(c), part(s)].filter(Boolean).join("-");
  }

  function pickProduct(p: ProductOption) {
    setProductId(p.id);
    setBulkColors(p.colors ?? []);
    setBulkSizes(p.sizes ?? []);
    if (!sku && p.sku) setSku(p.sku);
  }

  const combos = useMemo(() => {
    if (mode !== "bulk") return [];
    const colors = bulkColors.length > 0 ? bulkColors : [""];
    const sizes = bulkSizes.length > 0 ? bulkSizes : [""];
    const out: { color: string; size: string; sku: string }[] = [];
    for (const c of colors) {
      for (const s of sizes) {
        out.push({ color: c, size: s, sku: suggestSku(chosen?.sku ?? "SKU", c, s) });
      }
    }
    return out;
  }, [mode, bulkColors, bulkSizes, chosen]);

  const save = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error("Choose which product this variant belongs to.");

      if (mode === "bulk") {
        if (combos.length === 0) throw new Error("Pick at least one colour or size.");
        const rows = combos.map((c) => ({
          product_id: productId,
          sku: c.sku,
          color: c.color || null,
          size: c.size || null,
          stock_qty: Number(bulkStock) || 0,
          low_stock_at: Number(lowAt) || 10,
          is_active: true,
          price_delta: 0,
        }));
        const { error } = await supabase.from("product_variants").insert(rows);
        if (error) throw error;
        return;
      }

      if (!sku.trim()) throw new Error("Every variant needs a SKU.");

      const row = {
        product_id: productId,
        sku: sku.trim().toUpperCase(),
        color: color.trim() || null,
        size: size.trim() || null,
        material: material.trim() || null,
        print_method: printMethod.trim() || null,
        price_delta: Number(priceDelta) || 0,
        stock_qty: Number(stock) || 0,
        low_stock_at: Number(lowAt) || 10,
        is_active: active,
      };

      if (existing) {
        const { error } = await supabase
          .from("product_variants")
          .update(row)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("product_variants").insert(row);
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
            {existing ? "Edit variant" : "New variant"}
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

          {/* Product picker */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-brand-navy">
              Product <span className="text-brand-orange">*</span>
            </label>

            {chosen ? (
              <div className="flex items-center justify-between gap-3 border-2 border-brand-navy bg-brand-surface px-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-brand-navy">{chosen.name}</div>
                  {chosen.sku && (
                    <div className="font-mono text-[11px] text-brand-navy/55">{chosen.sku}</div>
                  )}
                </div>
                {!existing && (
                  <button
                    type="button"
                    onClick={() => { setProductId(""); setProductSearch(""); }}
                    className="shrink-0 text-brand-navy/40 hover:text-brand-orange"
                    aria-label="Clear product"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy/40" />
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search product name or SKU"
                    className={`${inputCls} pl-9`}
                  />
                </div>
                {matches.length > 0 && (
                  <ul className="mt-1.5 max-h-40 overflow-y-auto border-2 border-brand-navy/15">
                    {matches.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => pickProduct(p)}
                          className="w-full border-b border-brand-navy/8 px-3 py-2 text-left transition-colors last:border-0 hover:bg-brand-surface"
                        >
                          <span className="block truncate text-xs font-bold text-brand-navy">
                            {p.name}
                          </span>
                          {p.sku && (
                            <span className="block font-mono text-[11px] text-brand-navy/50">
                              {p.sku}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* Single or bulk, only when creating */}
          {!existing && chosen && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("single")}
                className={`border-2 px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                  mode === "single"
                    ? "border-brand-navy bg-brand-navy text-white"
                    : "border-brand-navy/20 bg-white text-brand-navy/60 hover:border-brand-navy/40"
                }`}
              >
                One variant
              </button>
              <button
                type="button"
                onClick={() => setMode("bulk")}
                className={`border-2 px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                  mode === "bulk"
                    ? "border-brand-navy bg-brand-navy text-white"
                    : "border-brand-navy/20 bg-white text-brand-navy/60 hover:border-brand-navy/40"
                }`}
              >
                Generate many
              </button>
            </div>
          )}

          {mode === "bulk" && !existing ? (
            <>
              <p className="border-l-2 border-brand-orange/40 pl-2.5 text-xs leading-relaxed text-brand-navy/60">
                Creates one variant for every colour and size combination you tick, so you do not add
                them one at a time.
              </p>

              {(chosen?.colors ?? []).length > 0 && (
                <PickList
                  label="Colours"
                  options={chosen?.colors ?? []}
                  selected={bulkColors}
                  onChange={setBulkColors}
                />
              )}
              {(chosen?.sizes ?? []).length > 0 && (
                <PickList
                  label="Sizes"
                  options={chosen?.sizes ?? []}
                  selected={bulkSizes}
                  onChange={setBulkSizes}
                />
              )}

              {(chosen?.colors ?? []).length === 0 && (chosen?.sizes ?? []).length === 0 && (
                <p className="border-2 border-dashed border-brand-navy/20 p-4 text-center text-xs text-brand-navy/50">
                  This product has no colours or sizes set. Add them in the product editor first, or
                  switch to One variant.
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <AdminField id="v-bulkstock" label="Starting stock" hint="Applied to each one">
                  <input
                    id="v-bulkstock"
                    type="number"
                    min={0}
                    value={bulkStock}
                    onChange={(e) => setBulkStock(e.target.value)}
                    className={`${inputCls} tabular-nums`}
                  />
                </AdminField>
                <AdminField id="v-bulklow" label="Low stock alert">
                  <input
                    id="v-bulklow"
                    type="number"
                    min={0}
                    value={lowAt}
                    onChange={(e) => setLowAt(e.target.value)}
                    className={`${inputCls} tabular-nums`}
                  />
                </AdminField>
              </div>

              {combos.length > 0 && (
                <div>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-brand-navy">
                    Will create {combos.length} {combos.length === 1 ? "variant" : "variants"}
                  </div>
                  <ul className="max-h-40 space-y-1 overflow-y-auto border-2 border-brand-navy/12 p-2">
                    {combos.map((c, i) => (
                      <li key={i} className="flex justify-between gap-3 text-[11px]">
                        <span className="font-mono text-brand-navy/70">{c.sku}</span>
                        <span className="text-brand-navy/50">
                          {[c.color, c.size].filter(Boolean).join(" / ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              <AdminField id="v-sku" label="SKU" required hint="Unique code for this exact variant">
                <div className="flex gap-2">
                  <input
                    id="v-sku"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    placeholder="PP-HOD-BLK-XL"
                    className={`${inputCls} font-mono`}
                  />
                  {chosen?.sku && (
                    <button
                      type="button"
                      onClick={() => setSku(suggestSku(chosen.sku!, color, size))}
                      className="shrink-0 border-2 border-brand-navy px-3 text-[10px] font-black uppercase tracking-wide text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
                    >
                      Suggest
                    </button>
                  )}
                </div>
              </AdminField>

              <div className="grid grid-cols-2 gap-3">
                <AdminField id="v-color" label="Colour">
                  <input
                    id="v-color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Navy"
                    list="variant-colors"
                    className={inputCls}
                  />
                  <datalist id="variant-colors">
                    {(chosen?.colors ?? []).map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </AdminField>
                <AdminField id="v-size" label="Size">
                  <input
                    id="v-size"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="XL"
                    list="variant-sizes"
                    className={inputCls}
                  />
                  <datalist id="variant-sizes">
                    {(chosen?.sizes ?? []).map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </AdminField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <AdminField id="v-stock" label="Stock on hand">
                  <input
                    id="v-stock"
                    type="number"
                    min={0}
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className={`${inputCls} tabular-nums`}
                  />
                </AdminField>
                <AdminField id="v-low" label="Low stock alert" hint="Flagged at or below this">
                  <input
                    id="v-low"
                    type="number"
                    min={0}
                    value={lowAt}
                    onChange={(e) => setLowAt(e.target.value)}
                    className={`${inputCls} tabular-nums`}
                  />
                </AdminField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <AdminField id="v-material" label="Material">
                  <input
                    id="v-material"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    placeholder="Cotton"
                    className={inputCls}
                  />
                </AdminField>
                <AdminField id="v-delta" label="Price difference" hint="Added to the base price">
                  <input
                    id="v-delta"
                    type="number"
                    step="0.01"
                    value={priceDelta}
                    onChange={(e) => setPriceDelta(e.target.value)}
                    className={`${inputCls} tabular-nums`}
                  />
                </AdminField>
              </div>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-navy"
                />
                <span>
                  <span className="block text-sm font-bold text-brand-navy">Show in the shop</span>
                  <span className="mt-0.5 block text-xs text-brand-navy/50">
                    Hidden variants keep their stock but customers cannot pick them
                  </span>
                </span>
              </label>
            </>
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
            {existing
              ? "Update variant"
              : mode === "bulk"
                ? `Create ${combos.length || ""} ${combos.length === 1 ? "variant" : "variants"}`
                : "Create variant"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PickList({
  label, options, selected, onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const allOn = selected.length === options.length;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-brand-navy">
          {label}
        </span>
        <button
          type="button"
          onClick={() => onChange(allOn ? [] : options)}
          className="text-[10px] font-bold uppercase tracking-wide text-brand-orange hover:text-brand-navy"
        >
          {allOn ? "Clear all" : "Select all"}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() =>
                onChange(on ? selected.filter((x) => x !== o) : [...selected, o])
              }
              className={`border-2 px-2.5 py-1.5 text-xs font-bold transition-colors ${
                on
                  ? "border-brand-navy bg-brand-navy text-white"
                  : "border-brand-navy/20 bg-white text-brand-navy/60 hover:border-brand-navy"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}