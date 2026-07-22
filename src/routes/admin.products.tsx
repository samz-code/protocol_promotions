import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminField, ConfirmDialog, inputCls } from "@/lib/admin-ui";
import {
  Loader2, Plus, Pencil, Trash2, Copy, X, AlertCircle, Check, Upload,
  Image as ImageIcon, Search, GripVertical, ArrowLeft, Package,
  Eye, EyeOff, Filter, TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/admin/products")({
  head: () => ({ meta: [{ title: "Products | Admin" }] }),
  component: ProductsPage,
});

type SpecRow = { name: string; value: string };
type Faq = { q: string; a: string };

type Product = {
  id: string;
  slug: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  price: number;
  compare_at_price: number | null;
  short_description: string | null;
  long_description: string | null;
  key_bullets: string[];
  specs: SpecRow[];
  benefits: string[];
  use_cases: string[];
  faqs: Faq[];
  images: string[];
  video_url: string | null;
  print_methods: string[];
  materials: string[];
  colors: string[];
  sizes: string[];
  moq: number;
  lead_time: string | null;
  stock_qty: number;
  low_stock_at: number;
  track_stock: boolean;
  rating: number;
  review_count: number;
  badge: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  meta_title: string | null;
  meta_description: string | null;
  categories: { name: string } | null;
};

type Tier = { id?: string; min_qty: number; unit_price: number };
type Category = { id: string; name: string };

const PRINT_METHODS = ["Screen Print", "Digital", "Embroidery", "Laser Engraving", "Vinyl", "Sublimation"];
const MATERIALS = ["Cotton", "Polyester", "PVC", "Paper", "Ceramic", "Vinyl", "Metal", "Wood", "Acrylic", "Glass"];
const BADGES = ["Bestseller", "New", "Bulk favourite", "Limited"];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

function kes(n: number) {
  return `KSh ${Number(n).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Product[];
}

async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Category[];
}

async function fetchTiers(productId: string): Promise<Tier[]> {
  const { data, error } = await supabase
    .from("price_tiers")
    .select("id, min_qty, unit_price")
    .eq("product_id", productId)
    .order("min_qty");
  if (error) throw error;
  return (data ?? []) as Tier[];
}

function ProductsPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  if (creating) {
    return <ProductEditor productId={null} onClose={() => setCreating(false)} />;
  }

  if (editingId) {
    return <ProductEditor productId={editingId} onClose={() => setEditingId(null)} />;
  }

  return <ProductList onCreate={() => setCreating(true)} onEdit={setEditingId} />;
}

type StatusFilter = "all" | "live" | "draft" | "lowstock";

function ProductList({
  onCreate, onEdit,
}: {
  onCreate: () => void;
  onEdit: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({ queryKey: ["admin", "products"], queryFn: fetchProducts });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setConfirmDelete(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (p: Product) => {
      const { data: sku } = await supabase.rpc("generate_sku", { p_prefix: "PP" });

      const copy = {
        slug: `${p.slug}-copy-${Date.now().toString(36)}`,
        name: `${p.name} (copy)`,
        sku,
        category_id: p.category_id,
        price: p.price,
        compare_at_price: p.compare_at_price,
        short_description: p.short_description,
        long_description: p.long_description,
        key_bullets: p.key_bullets,
        specs: p.specs,
        benefits: p.benefits,
        use_cases: p.use_cases,
        faqs: p.faqs,
        images: p.images,
        print_methods: p.print_methods,
        materials: p.materials,
        colors: p.colors,
        sizes: p.sizes,
        moq: p.moq,
        lead_time: p.lead_time,
        badge: p.badge,
        is_active: false,
        meta_title: p.meta_title,
        meta_description: p.meta_description,
      };

      const { error } = await supabase.from("products").insert(copy);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
    onError: (e: Error) => setError(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (p: Product) => {
      const { error } = await supabase
        .from("products")
        .update({ is_active: !p.is_active })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const all = query.data ?? [];

  const stats = useMemo(() => {
    const live = all.filter((p) => p.is_active).length;
    const lowStock = all.filter((p) => p.track_stock && p.stock_qty <= p.low_stock_at).length;
    const value = all.reduce((sum, p) => sum + Number(p.price ?? 0), 0);
    return { total: all.length, live, draft: all.length - live, lowStock, value };
  }, [all]);

  const products = useMemo(() => {
    let list = all;

    if (statusFilter === "live") list = list.filter((p) => p.is_active);
    if (statusFilter === "draft") list = list.filter((p) => !p.is_active);
    if (statusFilter === "lowstock") list = list.filter((p) => p.track_stock && p.stock_qty <= p.low_stock_at);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.categories?.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [all, search, statusFilter]);

  const filters: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "live", label: "Live", count: stats.live },
    { key: "draft", label: "Draft", count: stats.draft },
    { key: "lowstock", label: "Low stock", count: stats.lowStock },
  ];

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-brand-navy pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-navy md:text-4xl">
            Products
          </h1>
          <p className="mt-2 text-sm text-brand-navy/60">
            Manage your catalogue, pricing and stock.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 bg-brand-navy px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] transition-all hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          New product
        </button>
      </header>

      {/* Snapshot */}
      <div className="grid gap-px border border-brand-navy/15 bg-brand-navy/15 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Total products" value={String(stats.total)} icon={Package} />
        <MiniStat label="Live on site" value={String(stats.live)} icon={Eye} />
        <MiniStat label="Drafts" value={String(stats.draft)} icon={EyeOff} />
        <MiniStat label="Low stock" value={String(stats.lowStock)} icon={TrendingUp} accent={stats.lowStock > 0} />
      </div>

      {error && (
        <div className="flex items-start gap-2.5 border-2 border-brand-orange bg-brand-orange/8 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
          <span className="text-sm font-semibold text-brand-navy">{error}</span>
        </div>
      )}

      {/* Toolbar: search + status filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, SKU, category"
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

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter className="h-3.5 w-3.5 shrink-0 text-brand-navy/35" />
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`shrink-0 border-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                statusFilter === f.key
                  ? "border-brand-navy bg-brand-navy text-white"
                  : "border-brand-navy/15 bg-white text-brand-navy/60 hover:border-brand-navy/40 hover:text-brand-navy"
              }`}
            >
              {f.label}
              <span className={statusFilter === f.key ? "ml-1.5 text-brand-orange" : "ml-1.5 text-brand-navy/35"}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-brand-navy" />
        </div>
      ) : products.length === 0 ? (
        <div className="border-2 border-dashed border-brand-navy/20 p-16 text-center">
          <Package className="mx-auto h-8 w-8 text-brand-navy/25" />
          <p className="mt-4 text-sm font-semibold text-brand-navy/60">
            {search || statusFilter !== "all"
              ? "Nothing matches those filters."
              : "No products yet. Create the first one to start selling."}
          </p>
          {(search || statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => { setSearch(""); setStatusFilter("all"); }}
              className="mt-4 text-xs font-bold uppercase tracking-wide text-brand-orange hover:text-brand-navy"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {products.map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              onEdit={() => onEdit(p.id)}
              onDuplicate={() => duplicateMutation.mutate(p)}
              onDelete={() => setConfirmDelete(p)}
              onToggleActive={() => toggleActive.mutate(p)}
              duplicating={duplicateMutation.isPending}
            />
          ))}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${confirmDelete.name}?`}
          body="This removes the product, its price tiers and its variants. Orders already placed keep their snapshot. This cannot be undone."
          confirmLabel="Delete product"
          isPending={deleteMutation.isPending}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteMutation.mutate(confirmDelete.id)}
        />
      )}
    </div>
  );
}

function MiniStat({
  label, value, icon: Icon, accent,
}: {
  label: string;
  value: string;
  icon: typeof Package;
  accent?: boolean;
}) {
  return (
    <div className="bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${accent ? "text-brand-orange" : "text-brand-navy/35"}`} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-navy/50">{label}</span>
      </div>
      <div className={`mt-1.5 text-2xl font-black tabular-nums ${accent ? "text-brand-orange" : "text-brand-navy"}`}>
        {value}
      </div>
    </div>
  );
}

function ProductRow({
  product: p, onEdit, onDuplicate, onDelete, onToggleActive, duplicating,
}: {
  product: Product;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  duplicating: boolean;
}) {
  const lowStock = p.track_stock && p.stock_qty <= p.low_stock_at;

  return (
    <div className="group flex items-center gap-4 border-2 border-brand-navy/12 bg-white p-3 transition-all hover:border-brand-navy hover:shadow-[4px_4px_0_0_var(--color-brand-navy)]">
      {/* Thumbnail */}
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden border-2 border-brand-navy/10 bg-brand-surface">
        {p.images.length > 0 ? (
          <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-5 w-5 text-brand-navy/20" />
        )}
      </div>

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="truncate text-sm font-extrabold text-brand-navy transition-colors hover:text-brand-orange"
          >
            {p.name}
          </button>
          {p.badge && (
            <span className="shrink-0 bg-brand-orange px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
              {p.badge}
            </span>
          )}
          {lowStock && (
            <span className="shrink-0 border border-brand-orange px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-brand-orange">
              Low stock
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-brand-navy/50">
          <span className="font-mono">{p.sku ?? p.slug}</span>
          <span>{p.categories?.name ?? "Uncategorised"}</span>
          <span>MOQ {p.moq}</span>
          {p.track_stock && (
            <span className={lowStock ? "font-bold text-brand-orange" : ""}>
              {p.stock_qty} in stock
            </span>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="hidden shrink-0 text-right sm:block">
        <div className="text-sm font-black tabular-nums text-brand-navy">{kes(p.price)}</div>
        {p.compare_at_price && p.compare_at_price > p.price && (
          <div className="text-[11px] tabular-nums text-brand-navy/35 line-through">
            {kes(p.compare_at_price)}
          </div>
        )}
      </div>

      {/* Live toggle */}
      <button
        type="button"
        onClick={onToggleActive}
        className={`shrink-0 inline-flex items-center gap-1.5 border-2 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors ${
          p.is_active
            ? "border-brand-navy bg-brand-navy text-white"
            : "border-brand-navy/20 bg-white text-brand-navy/45 hover:border-brand-navy/40"
        }`}
        title={p.is_active ? "Click to unpublish" : "Click to publish"}
      >
        {p.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        <span className="hidden md:inline">{p.is_active ? "Live" : "Draft"}</span>
      </button>

      {/* Actions, always visible */}
      <div className="flex shrink-0 items-center gap-0.5">
        <IconBtn onClick={onEdit} label={`Edit ${p.name}`} title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn onClick={onDuplicate} disabled={duplicating} label={`Duplicate ${p.name}`} title="Duplicate">
          <Copy className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn onClick={onDelete} label={`Delete ${p.name}`} title="Delete" danger>
          <Trash2 className="h-3.5 w-3.5" />
        </IconBtn>
      </div>
    </div>
  );
}

function IconBtn({
  onClick, children, label, title, disabled, danger,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
  title: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title}
      className={`grid h-8 w-8 place-items-center border-2 border-transparent text-brand-navy/50 transition-colors disabled:opacity-30 ${
        danger ? "hover:border-red-200 hover:bg-red-50 hover:text-red-600" : "hover:border-brand-navy/15 hover:bg-brand-surface hover:text-brand-navy"
      }`}
    >
      {children}
    </button>
  );
}

/* ============================================================
   Editor
   ============================================================ */

type Tab = "basics" | "pricing" | "options" | "media" | "content" | "seo";

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "basics", label: "Basics", hint: "Name, category, visibility" },
  { id: "pricing", label: "Pricing & stock", hint: "Price, tiers, inventory" },
  { id: "options", label: "Options", hint: "Print methods, colours, sizes" },
  { id: "media", label: "Media", hint: "Images and video" },
  { id: "content", label: "Content", hint: "Descriptions, specs, FAQs" },
  { id: "seo", label: "SEO", hint: "Search listing" },
];

function ProductEditor({ productId, onClose }: { productId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("basics");
  const [error, setError] = useState<string | null>(null);

  const categories = useQuery({ queryKey: ["admin", "categories-lite"], queryFn: fetchCategories });

  const existing = useQuery({
    queryKey: ["admin", "product", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("id", productId!)
        .single();
      if (error) throw error;
      return data as unknown as Product;
    },
    enabled: Boolean(productId),
  });

  const existingTiers = useQuery({
    queryKey: ["admin", "tiers", productId],
    queryFn: () => fetchTiers(productId!),
    enabled: Boolean(productId),
  });

  const [form, setForm] = useState<Partial<Product>>({});
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate once the fetches land, or immediately for a new product.
  if (!hydrated) {
    if (productId && existing.data && existingTiers.data) {
      setForm(existing.data);
      setTiers(existingTiers.data);
      setHydrated(true);
    } else if (!productId) {
      setForm({
        name: "",
        slug: "",
        price: 0,
        moq: 1,
        low_stock_at: 10,
        stock_qty: 0,
        track_stock: false,
        is_active: false,
        is_featured: false,
        is_bestseller: false,
        key_bullets: [],
        specs: [],
        benefits: [],
        use_cases: [],
        faqs: [],
        images: [],
        print_methods: [],
        materials: [],
        colors: [],
        sizes: [],
      });
      setTiers([]);
      setHydrated(true);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name?.trim()) throw new Error("The product needs a name.");
      if (form.price === undefined || form.price < 0) throw new Error("Set a price.");

      const row = {
        name: form.name.trim(),
        slug: form.slug?.trim() || slugify(form.name),
        sku: form.sku || null,
        category_id: form.category_id || null,
        price: form.price,
        compare_at_price: form.compare_at_price ?? null,
        short_description: form.short_description || null,
        long_description: form.long_description || null,
        key_bullets: form.key_bullets ?? [],
        specs: form.specs ?? [],
        benefits: form.benefits ?? [],
        use_cases: form.use_cases ?? [],
        faqs: form.faqs ?? [],
        images: form.images ?? [],
        video_url: form.video_url || null,
        print_methods: form.print_methods ?? [],
        materials: form.materials ?? [],
        colors: form.colors ?? [],
        sizes: form.sizes ?? [],
        moq: form.moq ?? 1,
        lead_time: form.lead_time || null,
        stock_qty: form.stock_qty ?? 0,
        low_stock_at: form.low_stock_at ?? 10,
        track_stock: form.track_stock ?? false,
        badge: form.badge || null,
        is_active: form.is_active ?? false,
        is_featured: form.is_featured ?? false,
        is_bestseller: form.is_bestseller ?? false,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
      };

      let id = productId;

      if (id) {
        const { error } = await supabase.from("products").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(row).select("id").single();
        if (error) throw error;
        id = (data as { id: string }).id;
      }

      // Tiers: wipe and rewrite. Simpler than diffing, and the row count is tiny.
      await supabase.from("price_tiers").delete().eq("product_id", id);

      const valid = tiers.filter((t) => t.min_qty > 0 && t.unit_price >= 0);
      if (valid.length > 0) {
        const { error: tierError } = await supabase.from("price_tiers").insert(
          valid.map((t) => ({ product_id: id, min_qty: t.min_qty, unit_price: t.unit_price }))
        );
        if (tierError) throw tierError;
      }

      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  if (productId && (existing.isLoading || existingTiers.isLoading || !hydrated)) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-brand-navy" />
      </div>
    );
  }

  function set<K extends keyof Product>(key: K, value: Product[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const activeTab = TABS.find((t) => t.id === tab);

  return (
    <div className="space-y-6">
      {/* Sticky header so Save is always reachable */}
      <header className="sticky top-0 z-20 -mx-6 border-b-2 border-brand-navy bg-white px-6 pb-5 pt-6 md:-mx-8 md:px-8">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-navy/60 transition-colors hover:text-brand-orange"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All products
        </button>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold tracking-tight text-brand-navy md:text-3xl">
              {productId ? form.name || "Edit product" : "New product"}
            </h1>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                  form.is_active ? "bg-brand-navy text-white" : "border border-brand-navy/25 text-brand-navy/50"
                }`}
              >
                {form.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {form.is_active ? "Live" : "Draft"}
              </span>
              {form.price !== undefined && (
                <span className="text-xs font-bold tabular-nums text-brand-navy/60">{kes(form.price)}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="border-2 border-brand-navy/20 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-brand-navy transition-colors hover:border-brand-navy"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="inline-flex items-center gap-2 bg-brand-navy px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] transition-all hover:brightness-110 disabled:opacity-50"
            >
              {save.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Save
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-2.5 border-2 border-brand-orange bg-brand-orange/8 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
          <span className="text-sm font-semibold text-brand-navy">{error}</span>
        </div>
      )}

      {/* Tabs with hints */}
      <div>
        <nav className="flex flex-wrap gap-1 border-b-2 border-brand-navy/15">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`-mb-0.5 border-b-2 px-4 py-2.5 text-xs font-black uppercase tracking-wide transition-colors ${
                tab === t.id
                  ? "border-brand-orange text-brand-navy"
                  : "border-transparent text-brand-navy/40 hover:text-brand-navy"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        {activeTab && (
          <p className="mt-3 text-xs text-brand-navy/45">{activeTab.hint}</p>
        )}
      </div>

      <div className="max-w-4xl pb-12">
        {tab === "basics" && (
          <BasicsTab form={form} set={set} categories={categories.data ?? []} />
        )}
        {tab === "pricing" && (
          <PricingTab form={form} set={set} tiers={tiers} setTiers={setTiers} />
        )}
        {tab === "options" && <OptionsTab form={form} set={set} />}
        {tab === "media" && <MediaTab form={form} set={set} onError={setError} />}
        {tab === "content" && <ContentTab form={form} set={set} />}
        {tab === "seo" && <SeoTab form={form} set={set} />}
      </div>
    </div>
  );
}

type SetFn = <K extends keyof Product>(key: K, value: Product[K]) => void;

function SectionCard({
  title, description, children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-2 border-brand-navy/12 bg-white p-6">
      <div className="mb-5 border-b border-brand-navy/10 pb-3">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-brand-navy">{title}</h2>
        {description && <p className="mt-1 text-xs text-brand-navy/50">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function BasicsTab({
  form, set, categories,
}: {
  form: Partial<Product>;
  set: SetFn;
  categories: Category[];
}) {
  const [slugTouched, setSlugTouched] = useState(Boolean(form.slug));

  async function genSku() {
    const { data, error } = await supabase.rpc("generate_sku", { p_prefix: "PP" });
    if (!error && data) set("sku", data as string);
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Identity" description="How this product is named and found.">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <AdminField id="p-name" label="Name" required>
              <input
                id="p-name"
                value={form.name ?? ""}
                onChange={(e) => {
                  set("name", e.target.value);
                  if (!slugTouched) set("slug", slugify(e.target.value));
                }}
                className={inputCls}
                placeholder="Embroidered Pique Polo"
              />
            </AdminField>
          </div>

          <AdminField id="p-slug" label="Slug" hint="The URL segment. Auto-filled from the name.">
            <input
              id="p-slug"
              value={form.slug ?? ""}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value);
              }}
              className={`${inputCls} font-mono`}
            />
          </AdminField>

          <AdminField id="p-sku" label="SKU">
            <div className="flex items-center gap-2">
              <input
                id="p-sku"
                value={form.sku ?? ""}
                onChange={(e) => set("sku", e.target.value)}
                className={`${inputCls} font-mono`}
              />
              <button
                type="button"
                onClick={genSku}
                className="shrink-0 border-2 border-brand-navy px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
              >
                Generate
              </button>
            </div>
          </AdminField>

          <AdminField id="p-cat" label="Category">
            <select
              id="p-cat"
              value={form.category_id ?? ""}
              onChange={(e) => set("category_id", e.target.value || null)}
              className={inputCls}
            >
              <option value="">Uncategorised</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField id="p-badge" label="Badge" hint="A small tag shown on the product card.">
            <select
              id="p-badge"
              value={form.badge ?? ""}
              onChange={(e) => set("badge", e.target.value || null)}
              className={inputCls}
            >
              <option value="">None</option>
              {BADGES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </AdminField>

          <div className="md:col-span-2">
            <AdminField
              id="p-short"
              label="Short description"
              hint="One or two sentences, shown near the price."
            >
              <textarea
                id="p-short"
                rows={3}
                value={form.short_description ?? ""}
                onChange={(e) => set("short_description", e.target.value)}
                className={inputCls}
              />
            </AdminField>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Ordering" description="What customers must meet to buy this.">
        <div className="grid gap-6 md:grid-cols-2">
          <AdminField id="p-moq" label="Minimum order quantity">
            <input
              id="p-moq"
              type="number"
              min={1}
              value={form.moq ?? 1}
              onChange={(e) => set("moq", Math.max(1, Number(e.target.value)))}
              className={`${inputCls} tabular-nums`}
            />
          </AdminField>

          <AdminField id="p-lead" label="Lead time" hint="e.g. 3 to 5 days">
            <input
              id="p-lead"
              value={form.lead_time ?? ""}
              onChange={(e) => set("lead_time", e.target.value)}
              className={inputCls}
            />
          </AdminField>
        </div>
      </SectionCard>

      <SectionCard title="Visibility" description="Where this product appears on the site.">
        <div className="space-y-4">
          <Toggle
            label="Live on the site"
            hint="Unpublished products are invisible to customers"
            checked={form.is_active ?? false}
            onChange={(v) => set("is_active", v)}
          />
          <Toggle
            label="Featured"
            hint="Pushed to the top of the shop"
            checked={form.is_featured ?? false}
            onChange={(v) => set("is_featured", v)}
          />
          <Toggle
            label="Bestseller"
            hint="Flagged in listings"
            checked={form.is_bestseller ?? false}
            onChange={(v) => set("is_bestseller", v)}
          />
        </div>
      </SectionCard>
    </div>
  );
}

function PricingTab({
  form, set, tiers, setTiers,
}: {
  form: Partial<Product>;
  set: SetFn;
  tiers: Tier[];
  setTiers: (t: Tier[]) => void;
}) {
  const sortedPreview = [...tiers].filter((t) => t.min_qty > 0).sort((a, b) => a.min_qty - b.min_qty);

  return (
    <div className="space-y-6">
      <SectionCard title="Base price" description="What one unit costs before volume discounts.">
        <div className="grid gap-6 md:grid-cols-2">
          <AdminField id="p-price" label="Price" required hint="KES, per unit">
            <input
              id="p-price"
              type="number"
              min={0}
              step="0.01"
              value={form.price ?? 0}
              onChange={(e) => set("price", Number(e.target.value))}
              className={`${inputCls} tabular-nums text-lg font-bold`}
            />
          </AdminField>

          <AdminField
            id="p-compare"
            label="Compare-at price"
            hint="Optional. Shows struck through to signal a discount."
          >
            <input
              id="p-compare"
              type="number"
              min={0}
              step="0.01"
              value={form.compare_at_price ?? ""}
              onChange={(e) =>
                set("compare_at_price", e.target.value === "" ? null : Number(e.target.value))
              }
              className={`${inputCls} tabular-nums`}
            />
          </AdminField>
        </div>
      </SectionCard>

      <SectionCard
        title="Volume tiers"
        description="Lower the unit price as quantity climbs. Leave empty to charge the base price at every quantity."
      >
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => setTiers([...tiers, { min_qty: 0, unit_price: form.price ?? 0 }])}
            className="inline-flex items-center gap-1.5 border-2 border-brand-navy px-3 py-2 text-[11px] font-black uppercase tracking-wide text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Add tier
          </button>
        </div>

        {tiers.length === 0 ? (
          <p className="border-2 border-dashed border-brand-navy/15 py-8 text-center text-sm text-brand-navy/45">
            No tiers set. The base price applies at every quantity.
          </p>
        ) : (
          <>
            <div className="mb-2 grid grid-cols-[1fr_1fr_auto] gap-4 px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-navy/45">
                From quantity
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-navy/45">
                Unit price
              </span>
              <span className="w-9" />
            </div>
            <ul className="space-y-2">
              {tiers.map((t, i) => (
                <li key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-4">
                  <input
                    type="number"
                    min={1}
                    value={t.min_qty}
                    onChange={(e) => {
                      const next = [...tiers];
                      next[i] = { ...t, min_qty: Number(e.target.value) };
                      setTiers(next);
                    }}
                    className={`${inputCls} tabular-nums`}
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={t.unit_price}
                    onChange={(e) => {
                      const next = [...tiers];
                      next[i] = { ...t, unit_price: Number(e.target.value) };
                      setTiers(next);
                    }}
                    className={`${inputCls} tabular-nums`}
                  />
                  <button
                    type="button"
                    onClick={() => setTiers(tiers.filter((_, idx) => idx !== i))}
                    className="grid h-9 w-9 place-items-center border-2 border-transparent text-brand-navy/50 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove tier"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>

            {sortedPreview.length > 0 && (
              <div className="mt-5 border-t border-brand-navy/10 pt-4">
                <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-brand-navy/45">
                  Customer sees
                </div>
                <div className="flex flex-wrap gap-2">
                  {sortedPreview.map((t, i) => (
                    <span
                      key={i}
                      className="border border-brand-navy/15 bg-brand-surface px-2.5 py-1 text-xs font-bold tabular-nums text-brand-navy"
                    >
                      {t.min_qty}+ at {kes(t.unit_price)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>

      <SectionCard title="Inventory" description="Turn on tracking to enforce stock levels at checkout.">
        <div className="space-y-5">
          <Toggle
            label="Track stock for this product"
            hint="When off, the product can always be ordered"
            checked={form.track_stock ?? false}
            onChange={(v) => set("track_stock", v)}
          />

          {form.track_stock && (
            <div className="grid gap-6 border-t border-brand-navy/10 pt-5 md:grid-cols-2">
              <AdminField id="p-stock" label="Stock on hand">
                <input
                  id="p-stock"
                  type="number"
                  min={0}
                  value={form.stock_qty ?? 0}
                  onChange={(e) => set("stock_qty", Math.max(0, Number(e.target.value)))}
                  className={`${inputCls} tabular-nums`}
                />
              </AdminField>
              <AdminField
                id="p-low"
                label="Low stock threshold"
                hint="Flagged in the products list when stock drops to this."
              >
                <input
                  id="p-low"
                  type="number"
                  min={0}
                  value={form.low_stock_at ?? 10}
                  onChange={(e) => set("low_stock_at", Math.max(0, Number(e.target.value)))}
                  className={`${inputCls} tabular-nums`}
                />
              </AdminField>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function OptionsTab({ form, set }: { form: Partial<Product>; set: SetFn }) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Branding methods"
        description="How your team can decorate this item. Drives the configurator on the product page."
      >
        <CheckList
          options={PRINT_METHODS}
          selected={form.print_methods ?? []}
          onChange={(v) => set("print_methods", v)}
        />
      </SectionCard>

      <SectionCard title="Materials" description="What the product is made from.">
        <CheckList
          options={MATERIALS}
          selected={form.materials ?? []}
          onChange={(v) => set("materials", v)}
        />
      </SectionCard>

      <SectionCard title="Variants" description="Colours and sizes customers can pick.">
        <div className="grid gap-8 md:grid-cols-2">
          <TagInput
            label="Colours"
            hint="Press Enter to add"
            items={form.colors ?? []}
            onChange={(v) => set("colors", v)}
            placeholder="Navy"
          />
          <TagInput
            label="Sizes"
            hint="Press Enter to add"
            items={form.sizes ?? []}
            onChange={(v) => set("sizes", v)}
            placeholder="XL"
          />
        </div>
      </SectionCard>
    </div>
  );
}

function MediaTab({
  form, set, onError,
}: {
  form: Partial<Product>;
  set: SetFn;
  onError: (m: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const images = form.images ?? [];

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      const uploaded: string[] = [];

      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(path, file, { cacheControl: "3600", upsert: false });

        if (upErr) throw upErr;

        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        uploaded.push(data.publicUrl);

        // Register it in the media library too.
        await supabase.from("media").insert({
          bucket: "product-images",
          path,
          url: data.publicUrl,
          filename: file.name,
          kind: "image",
          mime_type: file.type,
          size_bytes: file.size,
          folder: "products",
        });
      }

      set("images", [...images, ...uploaded]);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    set("images", next);
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Product images" description="The first image is used as the thumbnail everywhere.">
        <label className="flex cursor-pointer flex-col items-center justify-center border-2 border-dashed border-brand-navy/25 py-12 transition-colors hover:border-brand-orange hover:bg-brand-surface/50">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-brand-navy" />
          ) : (
            <>
              <Upload className="h-6 w-6 text-brand-navy/40" />
              <span className="mt-3 text-sm font-bold text-brand-navy">
                Drop files or click to upload
              </span>
              <span className="mt-1 text-xs text-brand-navy/45">JPG, PNG or WebP</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden"
          />
        </label>

        {images.length > 0 && (
          <ul className="mt-5 space-y-2">
            {images.map((url, i) => (
              <li
                key={url}
                className="flex items-center gap-4 border-2 border-brand-navy/12 p-2.5 transition-colors hover:border-brand-navy/30"
              >
                <GripVertical className="h-4 w-4 shrink-0 text-brand-navy/20" />
                <img
                  src={url}
                  alt=""
                  className="h-14 w-14 shrink-0 border border-brand-navy/10 object-cover"
                />
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-brand-navy/50">
                  {url.split("/").pop()}
                </span>
                {i === 0 && (
                  <span className="shrink-0 bg-brand-navy px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                    Thumbnail
                  </span>
                )}
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    className="grid h-8 w-8 place-items-center text-brand-navy/50 transition-colors hover:bg-brand-surface hover:text-brand-navy disabled:opacity-25"
                    aria-label="Move up"
                  >
                    <span className="text-sm">&uarr;</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, i + 1)}
                    disabled={i === images.length - 1}
                    className="grid h-8 w-8 place-items-center text-brand-navy/50 transition-colors hover:bg-brand-surface hover:text-brand-navy disabled:opacity-25"
                    aria-label="Move down"
                  >
                    <span className="text-sm">&darr;</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => set("images", images.filter((_, idx) => idx !== i))}
                    className="grid h-8 w-8 place-items-center text-brand-navy/50 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Video" description="Optional. A YouTube or Vimeo link shown on the product page.">
        <AdminField id="p-video" label="Video URL">
          <input
            id="p-video"
            value={form.video_url ?? ""}
            onChange={(e) => set("video_url", e.target.value)}
            className={inputCls}
            placeholder="https://youtube.com/watch?v=..."
          />
        </AdminField>
      </SectionCard>
    </div>
  );
}

function ContentTab({ form, set }: { form: Partial<Product>; set: SetFn }) {
  return (
    <div className="space-y-6">
      <SectionCard title="Full description" description="Shown in the Description tab on the product page.">
        <AdminField id="p-long" label="Long description" hint="Leave a blank line between paragraphs.">
          <textarea
            id="p-long"
            rows={10}
            value={form.long_description ?? ""}
            onChange={(e) => set("long_description", e.target.value)}
            className={`${inputCls} leading-relaxed`}
          />
        </AdminField>
      </SectionCard>

      <SectionCard title="Selling points" description="Short lines that sell the product at a glance.">
        <div className="space-y-8">
          <StringList
            label="Key bullets"
            hint="The at-a-glance feature list"
            items={form.key_bullets ?? []}
            onChange={(v) => set("key_bullets", v)}
            placeholder="Front kangaroo pocket for everyday convenience."
          />
          <StringList
            label="Benefits"
            items={form.benefits ?? []}
            onChange={(v) => set("benefits", v)}
            placeholder="Gives your brand a polished, wearable look."
          />
          <StringList
            label="Use cases"
            items={form.use_cases ?? []}
            onChange={(v) => set("use_cases", v)}
            placeholder="Staff uniforms for company teams."
          />
        </div>
      </SectionCard>

      <SectionCard title="Specifications" description="Technical detail shown in the Specs tab.">
        <SpecList specs={form.specs ?? []} onChange={(v) => set("specs", v)} />
      </SectionCard>

      <SectionCard title="Product FAQs" description="Answers shown on this product's page only.">
        <FaqList faqs={form.faqs ?? []} onChange={(v) => set("faqs", v)} />
      </SectionCard>
    </div>
  );
}

function SeoTab({ form, set }: { form: Partial<Product>; set: SetFn }) {
  const title = form.meta_title ?? "";
  const desc = form.meta_description ?? "";

  return (
    <div className="space-y-6">
      <SectionCard title="Search listing" description="How this product appears in Google results.">
        <div className="space-y-6">
          <AdminField
            id="p-mtitle"
            label="Meta title"
            hint={`${title.length} of 60 characters used`}
          >
            <input
              id="p-mtitle"
              value={title}
              onChange={(e) => set("meta_title", e.target.value)}
              className={inputCls}
              placeholder={form.name || "Product name"}
            />
          </AdminField>

          <AdminField
            id="p-mdesc"
            label="Meta description"
            hint={`${desc.length} of 160 characters used`}
          >
            <textarea
              id="p-mdesc"
              rows={3}
              value={desc}
              onChange={(e) => set("meta_description", e.target.value)}
              className={inputCls}
            />
          </AdminField>
        </div>
      </SectionCard>

      <SectionCard title="Preview">
        <div className="border-2 border-brand-navy/12 bg-brand-surface/40 p-5">
          <div className="truncate text-base font-medium text-blue-700">
            {title || form.name || "Untitled product"}
          </div>
          <div className="mt-0.5 font-mono text-xs text-brand-navy/45">
            protocolpromotions.co.ke/shop/{form.slug || "slug"}
          </div>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-brand-navy/60">
            {desc || form.short_description || "No description set."}
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

/* ---------- shared inputs ---------- */

function Toggle({
  label, hint, checked, onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-brand-navy"
      />
      <span>
        <span className="block text-sm font-bold text-brand-navy">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-brand-navy/50">{hint}</span>}
      </span>
    </label>
  );
}

function StringList({
  label, hint, items, onChange, placeholder,
}: {
  label: string;
  hint?: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <span className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
            {label}
          </span>
          {hint && <span className="ml-3 text-[11px] text-brand-navy/45">{hint}</span>}
        </div>
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-brand-navy transition-colors hover:text-brand-orange"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <p className="border-2 border-dashed border-brand-navy/12 py-5 text-center text-sm text-brand-navy/40">
          None added.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                value={item}
                placeholder={placeholder}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  onChange(next);
                }}
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="grid h-9 w-9 shrink-0 place-items-center text-brand-navy/50 transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SpecList({ specs, onChange }: { specs: SpecRow[]; onChange: (v: SpecRow[]) => void }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
          Technical specifications
        </span>
        <button
          type="button"
          onClick={() => onChange([...specs, { name: "", value: "" }])}
          className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-brand-navy transition-colors hover:text-brand-orange"
        >
          <Plus className="h-3 w-3" />
          Add row
        </button>
      </div>

      {specs.length === 0 ? (
        <p className="border-2 border-dashed border-brand-navy/12 py-5 text-center text-sm text-brand-navy/40">
          No specs added.
        </p>
      ) : (
        <ul className="space-y-2">
          {specs.map((s, i) => (
            <li key={i} className="grid grid-cols-[1fr_1.5fr_auto] items-center gap-2">
              <input
                value={s.name}
                placeholder="Material"
                onChange={(e) => {
                  const next = [...specs];
                  next[i] = { ...s, name: e.target.value };
                  onChange(next);
                }}
                className={inputCls}
              />
              <input
                value={s.value}
                placeholder="100% combed cotton"
                onChange={(e) => {
                  const next = [...specs];
                  next[i] = { ...s, value: e.target.value };
                  onChange(next);
                }}
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => onChange(specs.filter((_, idx) => idx !== i))}
                className="grid h-9 w-9 place-items-center text-brand-navy/50 transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label="Remove spec"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FaqList({ faqs, onChange }: { faqs: Faq[]; onChange: (v: Faq[]) => void }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
          Questions
        </span>
        <button
          type="button"
          onClick={() => onChange([...faqs, { q: "", a: "" }])}
          className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-brand-navy transition-colors hover:text-brand-orange"
        >
          <Plus className="h-3 w-3" />
          Add question
        </button>
      </div>

      {faqs.length === 0 ? (
        <p className="border-2 border-dashed border-brand-navy/12 py-5 text-center text-sm text-brand-navy/40">
          No FAQs added.
        </p>
      ) : (
        <ul className="space-y-4">
          {faqs.map((f, i) => (
            <li key={i} className="border-l-2 border-brand-orange/40 pl-4">
              <div className="flex items-center gap-2">
                <input
                  value={f.q}
                  placeholder="What is the minimum order quantity?"
                  onChange={(e) => {
                    const next = [...faqs];
                    next[i] = { ...f, q: e.target.value };
                    onChange(next);
                  }}
                  className={`${inputCls} font-bold`}
                />
                <button
                  type="button"
                  onClick={() => onChange(faqs.filter((_, idx) => idx !== i))}
                  className="grid h-9 w-9 shrink-0 place-items-center text-brand-navy/50 transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove FAQ"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <textarea
                value={f.a}
                rows={3}
                placeholder="The minimum order is 10 units."
                onChange={(e) => {
                  const next = [...faqs];
                  next[i] = { ...f, a: e.target.value };
                  onChange(next);
                }}
                className={`${inputCls} mt-2`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CheckList({
  options, selected, onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(on ? selected.filter((s) => s !== o) : [...selected, o])}
            className={`inline-flex items-center gap-1.5 border-2 px-3.5 py-2 text-xs font-bold transition-colors ${
              on
                ? "border-brand-navy bg-brand-navy text-white"
                : "border-brand-navy/20 bg-white text-brand-navy/70 hover:border-brand-navy hover:text-brand-navy"
            }`}
          >
            {on && <Check className="h-3 w-3" />}
            {o}
          </button>
        );
      })}
    </div>
  );
}

function TagInput({
  label, hint, items, onChange, placeholder,
}: {
  label: string;
  hint?: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim();
    if (v && !items.includes(v)) {
      onChange([...items, v]);
    }
    setDraft("");
  }

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[11px] font-black uppercase tracking-widest text-brand-navy">
          {label}
        </span>
        {hint && <span className="text-[11px] text-brand-navy/45">{hint}</span>}
      </div>

      <input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        className={inputCls}
      />

      {items.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 border-2 border-brand-navy bg-brand-navy px-2.5 py-1 text-xs font-bold text-white"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((i) => i !== item))}
                className="text-white/60 transition-colors hover:text-brand-orange"
                aria-label={`Remove ${item}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}