import { useMemo, useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import * as LucideIcons from "lucide-react";
import {
  Filter, Shirt, Printer, MonitorSmartphone, Gift, Package, Palette,
  Star, ArrowRight, X, Truck, Layers, SearchX, AlertCircle,
  HelpCircle, CheckCircle2, ShoppingBag, Percent, Coins,
  PenTool
} from "lucide-react";

type ShopSearch = {
  category?: string;
  q?: string;
};

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    category: typeof search.category === "string" ? search.category : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop | Protocol Promotions" },
      { name: "description", content: "Browse apparel, printing, signage, promotional items and packaging. Configure products with live pricing." },
      { property: "og:title", content: "Shop | Protocol Promotions" },
      { property: "og:description", content: "Configurable products with live pricing, artwork upload and fast production." },
    ],
  }),
  component: ShopPage,
});

/** Categories can be set to any lucide icon in admin, so resolve by name
 *  rather than keeping a short hardcoded map that silently falls back. */
function categoryIcon(name: string | null | undefined): typeof Shirt {
  if (!name) return Package;
  const found = (LucideIcons as Record<string, unknown>)[name];
  return (typeof found === "function" ? found : Package) as typeof Shirt;
}

type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
};

type Product = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  category_id: string | null;
  print_methods: string[];
  materials: string[];
  moq: number;
  lead_time: string | null;
  rating: number;
  review_count: number;
  badge: string | null;
  images: string[];
  categories: { name: string; slug: string; icon: string | null } | null;
};

const PRICE_BANDS = [
  { label: "Under KSh 500", min: 0, max: 499 },
  { label: "KSh 500 to 2,000", min: 500, max: 2000 },
  { label: "KSh 2,000 to 10,000", min: 2000, max: 10000 },
  { label: "KSh 10,000 and above", min: 10000, max: Infinity },
];

const PRINT_METHODS = [
  "Screen Print",
  "Digital Printing",
  "Embroidery",
  "Laser Engraving",
  "Vinyl Transfer",
  "Sublimation",
  "Pad Printing",
  "UV Printing"
];

const MATERIALS = [
  "100% Cotton",
  "Polyester Blend",
  "Heavy Canvas",
  "PVC / Vinyl",
  "Kraft Paper",
  "Ceramic / Porcelain",
  "Stainless Steel",
  "Acrylic / Perspex",
  "Anodized Aluminum"
];

type SortKey = "featured" | "price-asc" | "price-desc" | "rating";

const KSH = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, icon")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Category[];
}

async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, price, compare_at_price, category_id, print_methods, materials, moq, lead_time, rating, review_count, badge, images, categories(name, slug, icon)")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Product[];
}

function ShopPage() {
  const { category: categorySlug, q: searchQuery } = useSearch({ from: "/shop" });
  const navigate = useNavigate({ from: "/shop" });

  const [bands, setBands] = useState<string[]>([]);
  const [methods, setMethods] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("featured");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: fetchProducts });

  const categories = categoriesQuery.data ?? [];
  const products = productsQuery.data ?? [];

  const activeCategory = categories.find((c) => c.slug === categorySlug) ?? null;

  useEffect(() => {
    if (categorySlug && categories.length > 0 && !activeCategory) {
      navigate({ search: (prev: ShopSearch) => ({ ...prev, category: undefined }), replace: true });
    }
  }, [categorySlug, categories.length, activeCategory, navigate]);

  function setCategory(slug: string | null) {
    navigate({ search: (prev: ShopSearch) => ({ ...prev, category: slug ?? undefined }) });
  }

  function clearSearch() {
    navigate({ search: (prev: ShopSearch) => ({ ...prev, q: undefined }) });
  }

  const activeCount =
    bands.length + methods.length + materials.length + (activeCategory ? 1 : 0) + (searchQuery ? 1 : 0);

  const results = useMemo(() => {
    const query = (searchQuery ?? "").trim().toLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);

    let list = products.filter((p) => {
      if (activeCategory && p.category_id !== activeCategory.id) return false;

      if (bands.length > 0) {
        const inBand = bands.some((label) => {
          const band = PRICE_BANDS.find((b) => b.label === label);
          if (!band) return false;
          return p.price >= band.min && p.price <= band.max;
        });
        if (!inBand) return false;
      }

      if (methods.length > 0 && !methods.some((m) => p.print_methods.includes(m))) return false;
      if (materials.length > 0 && !materials.some((m) => p.materials.includes(m))) return false;

      // Text search across everything searchable: name, category, print methods, materials.
      if (terms.length > 0) {
        const haystack = [
          p.name,
          p.categories?.name ?? "",
          ...(p.print_methods ?? []),
          ...(p.materials ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!terms.every((t: string) => haystack.includes(t))) return false;
      }

      return true;
    });

    list = [...list];
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sort === "rating") list.sort((a, b) => b.rating - a.rating);

    return list;
  }, [products, activeCategory, bands, methods, materials, sort, searchQuery]);

  function clearAll() {
    setBands([]);
    setMethods([]);
    setMaterials([]);
    navigate({ search: {} });
  }

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Bespoke Branding Catalog"
        title={activeCategory ? activeCategory.name : "All Promotional Products"}
        description="Configure your chosen items with dynamic vector layouts, precise size adjustments, brand colors, and your choice of elite printing methods. Volume discounts apply instantly at checkout."
      />

      <ShopTrustStrip />

      {categories.length > 0 && (
        <CategoryStrip
          categories={categories}
          activeSlug={activeCategory?.slug ?? null}
          onSelect={setCategory}
        />
      )}

      <section className="container-page py-8 sm:py-10 md:py-16">
        {/* Mobile Filter Toggle Button */}
        <div className="lg:hidden mb-6">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-md border border-brand-navy/20 bg-white px-5 py-3 text-sm font-semibold text-brand-navy"
          >
            <Filter className="h-4 w-4 text-brand-orange" /> Filters ({activeCount})
          </button>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[230px_1fr] lg:gap-8 xl:grid-cols-[260px_1fr] xl:gap-10 2xl:gap-12">

          {/* Sidebar - Desktop Layout & Mobile Backdrop drawer */}
          <aside className={`
            space-y-8 fixed inset-y-0 left-0 z-50 w-full max-w-xs transform overflow-y-auto bg-white p-6 transition-transform duration-300 lg:sticky lg:top-6 lg:z-0 lg:max-h-[calc(100vh-3rem)] lg:w-auto lg:translate-x-0 lg:p-0 lg:pr-1
            ${mobileFiltersOpen ? "translate-x-0" : "-translate-x-full"}
          `}>
            <div className="flex items-center justify-between pb-4 lg:pb-0 border-b border-brand-navy/10 lg:border-none">
              <div className="flex items-center gap-2 text-sm font-bold text-brand-navy uppercase tracking-wider">
                <Filter className="h-4 w-4 text-brand-navy/60" /> Filter Options
              </div>
              <div className="flex items-center gap-4">
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs font-bold uppercase text-brand-orange hover:text-brand-orange/85 transition-colors"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="lg:hidden text-brand-navy p-1"
                  aria-label="Close filters menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-brand-navy/50 mb-3.5 flex items-center gap-1.5">
                <ShoppingBag className="h-3.5 w-3.5 text-brand-orange" /> Browse Categories
              </div>
              <ul className="space-y-1">
                <li>
                  <button
                    type="button"
                    onClick={() => { setCategory(null); setMobileFiltersOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                      !activeCategory
                        ? "bg-brand-surface text-brand-navy font-bold"
                        : "text-brand-navy/70 hover:bg-brand-surface"
                    }`}
                  >
                    <span>All Products</span>
                    <span className="text-[11px] bg-brand-navy/10 text-brand-navy/70 font-semibold px-2 py-0.5 rounded-full">
                      {products.length}
                    </span>
                  </button>
                </li>
                {categories.map((c) => {
                  const CategoryIcon = categoryIcon(c.icon);
                  const catCount = products.filter(p => p.category_id === c.id).length;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => { setCategory(c.slug); setMobileFiltersOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                          activeCategory?.id === c.id
                            ? "bg-brand-surface text-brand-navy font-bold"
                            : "text-brand-navy/70 hover:bg-brand-surface"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <CategoryIcon className="h-4 w-4 shrink-0 text-brand-navy/70" strokeWidth={2.25} />
                          <span>{c.name}</span>
                        </div>
                        <span className="text-[11px] bg-brand-navy/10 text-brand-navy/70 font-semibold px-2 py-0.5 rounded-full">
                          {catCount}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <FilterGroup
              title="Filter by Price"
              icon={Coins}
              items={PRICE_BANDS.map((b) => b.label)}
              selected={bands}
              onToggle={(v) => setBands((prev) => toggle(prev, v))}
            />
            
            <FilterGroup
              title="Branding Method"
              icon={Printer}
              items={PRINT_METHODS}
              selected={methods}
              onToggle={(v) => setMethods((prev) => toggle(prev, v))}
            />
            
            <FilterGroup
              title="Product Material"
              icon={Palette}
              items={MATERIALS}
              selected={materials}
              onToggle={(v) => setMaterials((prev) => toggle(prev, v))}
            />

            <div className="rounded-lg bg-brand-navy text-white p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Percent className="h-4 w-4 text-brand-orange" />
                Enterprise Solutions
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                Need to procure promotional collateral across multiple branches? Set up a corporate portal with pre-negotiated volume tiers.
              </p>
              <Link
                to="/request-quote"
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-orange hover:text-brand-orange/85"
              >
                Learn about portal access <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-lg bg-brand-surface p-5 border border-brand-navy/10">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
                <Layers className="h-4 w-4 text-brand-orange" />
                Automatic Bulk Tiers
              </div>
              <p className="mt-2 text-xs text-brand-navy/60 leading-relaxed">
                Prices decrease as quantity scales. Orders beyond 1,000 units are eligible for custom structural runs, special materials, and off-shore pricing rates.
              </p>
              <Link
                to="/bulk-orders"
                className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-brand-orange hover:underline"
              >
                See tier schedules <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </aside>

          {/* Mobile drawer dark overlay background overlay */}
          {mobileFiltersOpen && (
            <div
              className="fixed inset-0 z-40 bg-brand-navy/40 backdrop-blur-xs lg:hidden"
              onClick={() => setMobileFiltersOpen(false)}
            />
          )}

          {/* Products Grid Section */}
          <div className="w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-brand-navy/10">
              <div>
                <div className="text-lg font-extrabold uppercase tracking-tight text-brand-navy sm:text-xl">
                  {searchQuery
                    ? `Results for "${searchQuery}"`
                    : activeCategory
                      ? activeCategory.name
                      : "Core Corporate Collection"}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-brand-navy/50">
                  {productsQuery.isLoading ? (
                    "Syncing secure catalogue connection..."
                  ) : (
                    <>
                      <span>
                        Displaying <span className="font-semibold text-brand-navy/70">{results.length}</span>{" "}
                        {results.length === 1 ? "premium product" : "premium products"}
                        {activeCount > 0 && " matching active filters"}
                      </span>
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={clearSearch}
                          className="inline-flex items-center gap-1 rounded-full bg-brand-navy/5 px-2.5 py-0.5 text-xs font-bold text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
                        >
                          Clear search <X className="h-3 w-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider text-brand-navy/40">Sort Catalogue</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="w-full sm:w-auto rounded-lg border border-brand-navy/15 bg-white px-3.5 py-2.5 text-sm font-bold text-brand-navy focus:outline-none focus:border-brand-navy/40 transition-colors cursor-pointer"
                  aria-label="Sort products"
                >
                  <option value="featured">Featured Layouts</option>
                  <option value="price-asc">Unit Price: Low to High</option>
                  <option value="price-desc">Unit Price: High to Low</option>
                  <option value="rating">Industry Rating</option>
                </select>
              </div>
            </div>

            {productsQuery.isLoading ? (
              <GridSkeleton />
            ) : productsQuery.isError ? (
              <LoadError />
            ) : results.length === 0 ? (
              <EmptyState onClear={clearAll} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6 2xl:grid-cols-3">
                {results.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <ShopHelpGuides />

      <ShopCTA />
    </SiteLayout>
  );
}

function ShopTrustStrip() {
  const items = [
    { 
      icon: Truck, 
      label: "Delivery across East Africa", 
      desc: "Doorstep delivery to Nairobi, Kampala, Dar es Salaam & regional hubs." 
    },
    { 
      icon: PenTool, 
      label: "Free vector layouts & proofing", 
      desc: "No order goes into production without your explicit visual approval." 
    },
    { 
      icon: Layers, 
      label: "Pre-calibrated bulk scaling", 
      desc: "Wholesale unit pricing applies automatically within our live checkout." 
    },
  ];

  return (
    <section className="bg-brand-navy text-white border-y border-white/10 overflow-hidden">
      <div className="container-page grid gap-4 py-6 sm:gap-6 md:grid-cols-3 md:py-8">
        {items.map((i) => {
          const IconComponent = i.icon;
          return (
            <div 
              key={i.label} 
              className="group flex gap-4 p-4 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/3 hover:-translate-y-1 transition-all duration-300 ease-out cursor-default"
            >
              {/* High-visibility Icon Container with active hover effects */}
              <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-brand-orange group-hover:border-brand-orange group-hover:shadow-[0_0_15px_rgba(249,115,22,0.35)]">
                <IconComponent className="h-5 w-5 text-brand-orange group-hover:text-white transition-colors duration-300" />
              </div>
              
              {/* Typography block responsive to parent hovers */}
              <div className="space-y-1">
                <span className="text-[13px] font-black uppercase tracking-wider text-white block transition-colors duration-300 group-hover:text-brand-orange">
                  {i.label}
                </span>
                <p className="text-xs text-white/60 leading-relaxed font-medium">
                  {i.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CategoryStrip({
  categories, activeSlug, onSelect,
}: {
  categories: Category[];
  activeSlug: string | null;
  onSelect: (slug: string | null) => void;
}) {
  return (
    <section className="container-page pt-8 md:pt-10">
      <div className="flex gap-2.5 overflow-x-auto pb-3 -mx-1 px-1 sm:flex-wrap">
        {categories.map((c) => {
          const Icon = categoryIcon(c.icon);
          const isActive = activeSlug === c.slug;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(isActive ? null : c.slug)}
              className={`group inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[13px] font-bold tracking-tight transition-all sm:gap-2.5 sm:px-4 sm:py-2.5 sm:text-sm ${
                isActive
                  ? "border-brand-navy bg-brand-navy text-white shadow-md"
                  : "border-brand-navy/15 bg-white text-brand-navy/70 hover:border-brand-navy/40 hover:text-brand-navy"
              }`}
            >
              {/* The icon sits in its own tile so each category is
                  distinguishable at a glance rather than all reading alike. */}
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors sm:h-7 sm:w-7 ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "bg-brand-surface text-brand-orange group-hover:bg-brand-orange/10"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2.4} />
              </span>
              {c.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  const iconName = product.categories?.icon;
  const Icon = categoryIcon(iconName);
  const hasImage = product.images.length > 0;
  const onSale = product.compare_at_price && product.compare_at_price > product.price;
  const discount = onSale
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : null;

  return (
    <Link
      to="/shop/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col rounded-xl border border-brand-navy/12 bg-white overflow-hidden transition-all duration-300 hover:border-brand-navy/25 hover:shadow-[0_16px_36px_-12px_rgba(30,41,89,0.2)] hover:-translate-y-1"
    >
      <div className="relative aspect-4/3 bg-brand-surface grid place-items-center overflow-hidden">
        {hasImage ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <Icon className="h-12 w-12 text-brand-navy/12" />
        )}

        {product.badge && (
          <span className="absolute top-3 left-3 rounded-md bg-brand-navy px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm">
            {product.badge}
          </span>
        )}
        {discount !== null && (
          <span className="absolute top-3 right-3 rounded-md bg-brand-orange px-2.5 py-1.5 text-[9px] font-black tracking-wider tabular-nums text-white shadow-sm">
            SAVE {discount}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {product.categories && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-orange">
            {product.categories.name}
          </span>
        )}

        <h3 className="mt-2 text-[15px] font-extrabold leading-snug text-brand-navy transition-colors line-clamp-2 group-hover:text-brand-orange sm:text-[16px]">
          {product.name}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-brand-navy/55 sm:text-xs">
          <span className="inline-flex items-center gap-1 text-brand-navy">
            <Star className="h-3.5 w-3.5 fill-brand-orange text-brand-orange shrink-0" />
            {product.rating > 0 ? product.rating.toFixed(1) : "New Run"}
          </span>
          <span className="h-1 w-1 rounded-full bg-brand-navy/20 shrink-0" />
          <span>MOQ: {product.moq} units</span>
          {product.lead_time && (
            <>
              <span className="h-1 w-1 rounded-full bg-brand-navy/20 shrink-0" />
              <span>{product.lead_time}</span>
            </>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-brand-navy/8 pt-3.5 sm:mt-6 sm:pt-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-brand-navy/40">From</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-[17px] font-black leading-none tabular-nums text-brand-navy sm:text-[19px]">
                {KSH.format(product.price)}
              </span>
              {onSale && (
                <span className="text-xs text-brand-navy/35 line-through tabular-nums">
                  {KSH.format(product.compare_at_price!)}
                </span>
              )}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-surface px-3 py-2 text-xs font-extrabold text-brand-navy transition-all group-hover:bg-brand-navy group-hover:text-white">
            Configure <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-brand-navy/10 bg-white overflow-hidden">
          <div className="aspect-4/3 bg-brand-surface animate-pulse" />
          <div className="p-4 sm:p-5 space-y-3">
            <div className="h-3 w-1/4 bg-brand-surface animate-pulse rounded" />
            <div className="h-5 w-3/4 bg-brand-surface animate-pulse rounded" />
            <div className="h-6 w-1/2 bg-brand-surface animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadError() {
  return (
    <div className="rounded-lg border border-dashed border-brand-navy/20 bg-brand-surface/50 p-8 text-center sm:p-12">
      <div className="mx-auto h-12 w-12 grid place-items-center rounded-full bg-white shadow-sm">
        <AlertCircle className="h-5 w-5 text-brand-orange" />
      </div>
      <h3 className="mt-5 text-base font-semibold text-brand-navy">Could not sync catalog</h3>
      <p className="mt-1.5 text-sm text-brand-navy/60 max-w-sm mx-auto leading-relaxed">
        Our database cluster is currently offline. Your active connection has expired. Please refresh the window.
      </p>
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-brand-navy/20 bg-brand-surface/50 p-8 text-center sm:p-12">
      <div className="mx-auto h-12 w-12 grid place-items-center rounded-full bg-white shadow-sm">
        <SearchX className="h-5 w-5 text-brand-orange" />
      </div>
      <h3 className="mt-5 text-base font-semibold text-brand-navy">No products match filters</h3>
      <p className="mt-1.5 text-sm text-brand-navy/60 max-w-sm mx-auto leading-relaxed">
        We run custom layout builds for parameters outside our standard ranges. Try clearing filters or submit a specs document directly.
      </p>
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <button
          type="button"
          onClick={onClear}
          className="rounded-md bg-brand-navy px-5 py-3 text-sm font-bold text-white hover:bg-brand-navy/90 transition-colors"
        >
          Clear filters
        </button>
        <Link
          to="/request-quote"
          className="inline-flex items-center gap-1.5 rounded-md border border-brand-navy/15 bg-white px-5 py-3 text-sm font-bold text-brand-navy hover:border-brand-navy/40 transition-colors"
        >
          Request Custom Layout <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function ShopHelpGuides() {
  const faqs = [
    {
      q: "How does the digital layout proof work?",
      a: "After selecting raw product specifications and uploading branding coordinates, our graphics team runs a full architectural proof in PDF/vector format. We match pantones precisely to align with your corporate style guidelines before printing."
    },
    {
      q: "Can I order samples before running massive quantities?",
      a: "Yes. Simply submit your sample selection layout via our Request Quote tool. Samples are processed at regular rates, which are subsequently refunded when the full production run transitions into active status."
    },
    {
      q: "What printing options exist for heavy outdoor displays?",
      a: "For banners, promotional pop-ups, and canopy setups, we rely on heavy weather-resistant UV-cured digital layouts. They are completely guaranteed against cracking and color fade for up to 36 months of active continuous outdoor deployment."
    }
  ];

  return (
    <section className="mb-12 border-y border-brand-navy/5 bg-brand-surface/30 py-10 sm:py-12 md:mb-24 md:py-16">
      <div className="container-page">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-10 w-10 rounded-xl bg-brand-orange/10 flex items-center justify-center shrink-0 transition-all duration-300">
            <HelpCircle className="h-5 w-5 text-brand-orange" />
          </div>
          <h2 className="text-base font-black uppercase tracking-wider text-brand-navy sm:text-lg">Corporate Procurement Guide</h2>
        </div>
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {faqs.map((f, i) => (
            <div 
              key={i} 
              className="group bg-white p-6 rounded-xl border border-brand-navy/8 hover:border-brand-orange/30 hover:shadow-[0_12px_30px_-10px_rgba(249,115,22,0.15)] hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col"
            >
              <div className="space-y-4">
                {/* Clean, high-contrast container with real, scalable icon and active hover effects */}
                <div className="h-10 w-10 rounded-xl bg-brand-orange/5 border border-brand-orange/10 flex items-center justify-center shrink-0 transition-all duration-300 group-hover:bg-brand-orange group-hover:border-brand-orange group-hover:shadow-[0_0_12px_rgba(249,115,22,0.25)]">
                  <CheckCircle2 className="h-5 w-5 text-brand-orange group-hover:text-white transition-colors duration-300" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-[15px] font-extrabold text-brand-navy leading-snug group-hover:text-brand-orange transition-colors duration-300">
                    {f.q}
                  </h3>
                  <p className="text-xs text-brand-navy/65 leading-relaxed font-medium">
                    {f.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShopCTA() {
  return (
    <section className="container-page pb-16 md:pb-24">
      <div className="rounded-xl bg-brand-navy p-6 text-white sm:p-8 md:p-12">
        <div className="grid items-center gap-6 sm:gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-brand-orange mb-2">
              Looking for custom sizing?
            </div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">Need custom layout configurations?</h2>
            <p className="mt-3 text-sm text-white/70 max-w-lg leading-relaxed">
              Our engineering workshops handle complex substrate combinations, specialized shapes, customized promotional bundles, and specific brand alignments outside our core collection bounds.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link
              to="/request-quote"
              className="inline-flex items-center justify-center w-full sm:w-auto gap-2 rounded-md bg-brand-orange px-6 py-3.5 text-sm font-bold text-white hover:bg-brand-orange/90 transition-colors"
            >
              Request custom layout <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/bulk-orders"
              className="inline-flex items-center justify-center w-full sm:w-auto gap-2 rounded-md border border-white/20 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/10 transition-colors"
            >
              Enterprise Portals
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterGroup({
  title, icon: IconComponent, items, selected, onToggle,
}: {
  title: string;
  icon: typeof Coins;
  items: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-3.5">
      <div className="text-[11px] font-bold uppercase tracking-widest text-brand-navy/50 flex items-center gap-1.5">
        <IconComponent className="h-3.5 w-3.5 text-brand-orange" /> {title}
      </div>
      <ul className="space-y-2.5">
        {items.map((it) => {
          const checked = selected.includes(it);
          return (
            <li key={it}>
              <label className="flex items-center gap-2.5 text-sm cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(it)}
                  className="h-4 w-4 rounded border-brand-navy/30 text-brand-navy accent-brand-navy focus:ring-0"
                />
                <span
                  className={`transition-colors text-xs ${
                    checked ? "text-brand-navy font-bold" : "text-brand-navy/60 group-hover:text-brand-navy"
                  }`}
                >
                  {it}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}