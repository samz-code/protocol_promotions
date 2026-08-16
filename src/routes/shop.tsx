import { useMemo, useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import {
  Filter, Shirt, Printer, MonitorSmartphone, Gift, Package, Palette,
  Star, ArrowRight, X, Truck, Layers, SearchX, AlertCircle,
  HelpCircle, CheckCircle2, ShoppingBag, Percent, Coins,
  PenTool,
  Footprints, HardHat, Watch, Glasses, Umbrella, FileText,
  BookOpen, Newspaper, StickyNote, Files, Stamp, Mail,
  Megaphone, Flag, PanelTop, Presentation, Frame, Tv,
  Lightbulb, Coffee, CupSoda, Wine, Award, Trophy,
  Medal, Cake, Box, Briefcase, Backpack, Luggage,
  Archive, Laptop, Headphones, Keyboard, Mouse, BatteryCharging,
  Usb, Calculator, Paintbrush, Scissors, Ruler, Hammer,
  Wrench, Sparkles, Car, Bike, Tent, TreePine,
  Sun, Building2, Store, Factory, Users, Handshake,
  BadgeCheck, Tag, ChevronRight, LayoutGrid
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

const CATEGORY_ICONS: Record<string, typeof Shirt> = {
  Shirt,
  Footprints,
  HardHat,
  Watch,
  Glasses,
  Umbrella,
  Printer,
  FileText,
  BookOpen,
  Newspaper,
  StickyNote,
  Files,
  Stamp,
  Mail,
  Megaphone,
  Flag,
  PanelTop,
  Presentation,
  Frame,
  Tv,
  Lightbulb,
  Coffee,
  CupSoda,
  Wine,
  Gift,
  Award,
  Trophy,
  Medal,
  Cake,
  ShoppingBag,
  Package,
  Box,
  Briefcase,
  Backpack,
  Luggage,
  Archive,
  MonitorSmartphone,
  Laptop,
  Headphones,
  Keyboard,
  Mouse,
  BatteryCharging,
  Usb,
  Calculator,
  Palette,
  PenTool,
  Paintbrush,
  Scissors,
  Ruler,
  Hammer,
  Wrench,
  Sparkles,
  Car,
  Truck,
  Bike,
  Tent,
  TreePine,
  Sun,
  Building2,
  Store,
  Factory,
  Users,
  Handshake,
  BadgeCheck,
  Percent,
  Tag,
};

function categoryIcon(name: string | null | undefined): typeof Shirt {
  if (!name) return Package;
  return CATEGORY_ICONS[name] ?? Package;
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
      <div className="w-full">
        <PageHeader
          title={activeCategory ? activeCategory.name : "All Promotional Products"}
          description="Configure your chosen items with dynamic vector layouts, precise size adjustments, brand colors, and your choice of elite printing methods. Volume discounts apply instantly at checkout."
        />

        <ShopTrustStrip />

        {categories.length > 0 && (
          <CategoryStrip
            categories={categories}
            products={products}
            activeSlug={activeCategory?.slug ?? null}
            onSelect={setCategory}
          />
        )}

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="lg:hidden mb-4">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-brand-navy/20 bg-white px-4 py-2.5 text-xs font-semibold text-brand-navy shadow-xs active:bg-brand-surface"
            >
              <Filter className="h-3.5 w-3.5 text-brand-orange shrink-0" /> Filters ({activeCount})
            </button>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[220px_1fr] xl:grid-cols-[240px_1fr]">

            <aside className={`
              space-y-6 fixed inset-y-0 left-0 z-50 w-full max-w-xs transform overflow-y-auto bg-white p-5 shadow-xl transition-transform duration-300 lg:sticky lg:top-4 lg:z-0 lg:max-h-[calc(100vh-2rem)] lg:w-auto lg:translate-x-0 lg:p-0 lg:shadow-none lg:bg-transparent
              ${mobileFiltersOpen ? "translate-x-0" : "-translate-x-full"}
            `}>
              <div className="flex items-center justify-between pb-3 lg:pb-0 border-b border-brand-navy/10 lg:border-none">
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand-navy uppercase tracking-wider">
                  <Filter className="h-3.5 w-3.5 text-brand-navy/60 shrink-0" /> Filter Options
                </div>
                <div className="flex items-center gap-3">
                  {activeCount > 0 && (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-[11px] font-bold uppercase text-brand-orange hover:text-brand-orange/85 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(false)}
                    className="lg:hidden text-brand-navy p-1 rounded hover:bg-brand-surface"
                    aria-label="Close filters menu"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-brand-navy/50 mb-2 flex items-center gap-1">
                  <ShoppingBag className="h-3 w-3 text-brand-orange shrink-0" /> Browse Categories
                </div>
                <ul className="space-y-0.5">
                  <li>
                    <button
                      type="button"
                      onClick={() => { setCategory(null); setMobileFiltersOpen(false); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                        !activeCategory
                          ? "bg-brand-navy text-white font-bold"
                          : "text-brand-navy/70 hover:bg-brand-surface"
                      }`}
                    >
                      <span className="truncate">All Products</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full shrink-0 ml-1.5 ${
                        !activeCategory ? "bg-white/20 text-white" : "bg-brand-navy/10 text-brand-navy/70"
                      }`}>
                        {products.length}
                      </span>
                    </button>
                  </li>
                  {categories.map((c) => {
                    const CategoryIcon = categoryIcon(c.icon);
                    const catCount = products.filter(p => p.category_id === c.id).length;
                    const isActive = activeCategory?.id === c.id;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => { setCategory(c.slug); setMobileFiltersOpen(false); }}
                          className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                            isActive
                              ? "bg-brand-navy text-white font-bold"
                              : "text-brand-navy/70 hover:bg-brand-surface"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 pr-1.5">
                            <CategoryIcon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-brand-orange" : "text-brand-navy/70"}`} strokeWidth={2.25} />
                            <span className="truncate">{c.name}</span>
                          </div>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full shrink-0 ${
                            isActive ? "bg-white/20 text-white" : "bg-brand-navy/10 text-brand-navy/70"
                          }`}>
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

              <div className="rounded-lg bg-brand-navy text-white p-4 space-y-2 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Percent className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                  Enterprise Solutions
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  Need to procure promotional collateral across multiple branches? Set up a corporate portal with pre-negotiated volume tiers.
                </p>
                <Link
                  to="/request-quote"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-orange hover:text-brand-orange/85 transition-colors"
                >
                  Learn about portal access <ArrowRight className="h-3 w-3 shrink-0" />
                </Link>
              </div>

              <div className="rounded-lg bg-brand-surface p-4 border border-brand-navy/10">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-navy">
                  <Layers className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                  Automatic Bulk Tiers
                </div>
                <p className="mt-1.5 text-[11px] text-brand-navy/60 leading-relaxed">
                  Prices decrease as quantity scales. Orders beyond 1,000 units are eligible for custom structural runs and off-shore rates.
                </p>
                <Link
                  to="/bulk-orders"
                  className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-brand-orange hover:underline"
                >
                  See tier schedules <ArrowRight className="h-3 w-3 shrink-0" />
                </Link>
              </div>
            </aside>

            {mobileFiltersOpen && (
              <div
                className="fixed inset-0 z-40 bg-brand-navy/40 backdrop-blur-xs lg:hidden"
                onClick={() => setMobileFiltersOpen(false)}
              />
            )}

            <div className="w-full min-w-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-brand-navy/10">
                <div className="min-w-0 max-w-full">
                  <h1 className="text-base font-extrabold uppercase tracking-tight text-brand-navy sm:text-lg truncate">
                    {searchQuery
                      ? `Results for "${searchQuery}"`
                      : activeCategory
                        ? activeCategory.name
                        : "Core Corporate Collection"}
                  </h1>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-brand-navy/50">
                    {productsQuery.isLoading ? (
                      "Syncing catalogue connection..."
                    ) : (
                      <>
                        <span className="wrap-break-word">
                          Displaying <span className="font-semibold text-brand-navy/70">{results.length}</span>{" "}
                          {results.length === 1 ? "product" : "products"}
                          {activeCount > 0 && " matching active filters"}
                        </span>
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={clearSearch}
                            className="inline-flex items-center gap-1 rounded-full bg-brand-navy/5 px-2 py-0.5 text-[10px] font-bold text-brand-navy hover:bg-brand-navy hover:text-white transition-colors shrink-0"
                          >
                            Clear search <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-wider text-brand-navy/40 shrink-0">Sort</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="w-full sm:w-auto rounded-md border border-brand-navy/15 bg-white px-2.5 py-1.5 text-xs font-bold text-brand-navy focus:outline-none focus:border-brand-navy/40 transition-colors cursor-pointer"
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
                <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
      </div>
    </SiteLayout>
  );
}

function ShopTrustStrip() {
  const items = [
    { 
      icon: Truck, 
      label: "Delivery across East Africa", 
      desc: "Doorstep delivery to Nairobi, Kampala, Dar es Salaam & hubs." 
    },
    { 
      icon: PenTool, 
      label: "Free vector layouts & proofing", 
      desc: "No order printed without explicit visual approval." 
    },
    { 
      icon: Layers, 
      label: "Pre-calibrated bulk scaling", 
      desc: "Wholesale unit pricing applies automatically in checkout." 
    },
  ];

  return (
    <section className="bg-brand-navy text-white border-y border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-2 py-4 sm:gap-4 md:grid-cols-3">
        {items.map((i) => {
          const IconComponent = i.icon;
          return (
            <div 
              key={i.label} 
              className="group flex items-start gap-2.5 p-2.5 rounded-lg transition-all duration-200 cursor-default"
            >
              <div className="h-8 w-8 rounded bg-white/5 border border-white/10 flex items-center justify-center shrink-0 transition-all duration-300 group-hover:bg-brand-orange group-hover:border-brand-orange">
                <IconComponent className="h-4 w-4 text-brand-orange group-hover:text-white transition-colors duration-300" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-xs font-bold uppercase tracking-wide text-white transition-colors duration-300 group-hover:text-brand-orange truncate">
                  {i.label}
                </h3>
                <p className="text-[11px] text-white/60 leading-snug line-clamp-2">
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
  categories, products, activeSlug, onSelect,
}: {
  categories: Category[];
  products: Product[];
  activeSlug: string | null;
  onSelect: (slug: string | null) => void;
}) {
  return (
    <section className="bg-brand-surface/50 border-b border-brand-navy/10 py-4">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5 text-brand-orange shrink-0" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-brand-navy">
              Browse by Category
            </h2>
          </div>
          {activeSlug && (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="text-[11px] font-bold text-brand-orange hover:underline shrink-0"
            >
              View All Categories
            </button>
          )}
        </div>

        <div className="relative">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth sm:flex-wrap">
            <button
              type="button"
              onClick={() => onSelect(null)}
              className={`group inline-flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-bold transition-all ${
                !activeSlug
                  ? "border-brand-navy bg-brand-navy text-white shadow-xs"
                  : "border-brand-navy/12 bg-white text-brand-navy/80 hover:border-brand-navy/30 hover:text-brand-navy"
              }`}
            >
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded transition-colors ${
                !activeSlug ? "bg-white/15 text-white" : "bg-brand-surface text-brand-orange group-hover:bg-brand-orange/10"
              }`}>
                <Package className="h-3 w-3" strokeWidth={2.2} />
              </span>
              <span>All Categories</span>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                !activeSlug ? "bg-white/20 text-white" : "bg-brand-navy/8 text-brand-navy/60"
              }`}>
                {products.length}
              </span>
            </button>

            {categories.map((c) => {
              const Icon = categoryIcon(c.icon);
              const isActive = activeSlug === c.slug;
              const catCount = products.filter(p => p.category_id === c.id).length;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelect(isActive ? null : c.slug)}
                  className={`group inline-flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-bold transition-all ${
                    isActive
                      ? "border-brand-navy bg-brand-navy text-white shadow-xs"
                      : "border-brand-navy/12 bg-white text-brand-navy/80 hover:border-brand-navy/30 hover:text-brand-navy"
                  }`}
                >
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded transition-colors ${
                    isActive ? "bg-white/15 text-white" : "bg-brand-surface text-brand-orange group-hover:bg-brand-orange/10"
                  }`}>
                    <Icon className="h-3 w-3" strokeWidth={2.2} />
                  </span>
                  <span className="whitespace-nowrap">{c.name}</span>
                  {catCount > 0 && (
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                      isActive ? "bg-white/20 text-white" : "bg-brand-navy/8 text-brand-navy/60"
                    }`}>
                      {catCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
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
      className="group flex flex-col rounded-lg border border-brand-navy/12 bg-white overflow-hidden transition-all duration-300 hover:border-brand-navy/25 hover:shadow-md hover:-translate-y-0.5"
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
          <Icon className="h-10 w-10 text-brand-navy/15 shrink-0" />
        )}

        {product.badge && (
          <span className="absolute top-2 left-2 rounded bg-brand-navy px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-white shadow-xs max-w-[70%] truncate">
            {product.badge}
          </span>
        )}
        {discount !== null && (
          <span className="absolute top-2 right-2 rounded bg-brand-orange px-1.5 py-0.5 text-[8px] font-extrabold tracking-wider tabular-nums text-white shadow-xs">
            SAVE {discount}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5 min-w-0">
        {product.categories && (
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-brand-orange truncate block">
            {product.categories.name}
          </span>
        )}

        <h3 className="mt-1 text-xs font-bold leading-snug text-brand-navy transition-colors line-clamp-2 group-hover:text-brand-orange wrap-break-word">
          {product.name}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-medium text-brand-navy/55">
          <span className="inline-flex items-center gap-0.5 text-brand-navy shrink-0 font-semibold">
            <Star className="h-3 w-3 fill-brand-orange text-brand-orange shrink-0" />
            {product.rating > 0 ? product.rating.toFixed(1) : "New"}
          </span>
          <span className="h-0.5 w-0.5 rounded-full bg-brand-navy/20 shrink-0" />
          <span className="truncate">MOQ: {product.moq}</span>
          {product.lead_time && (
            <>
              <span className="h-0.5 w-0.5 rounded-full bg-brand-navy/20 shrink-0" />
              <span className="truncate">{product.lead_time}</span>
            </>
          )}
        </div>

        <div className="mt-auto pt-3 border-t border-brand-navy/8 flex items-center justify-between gap-1.5">
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] font-bold uppercase tracking-widest text-brand-navy/40">From</span>
            <div className="flex items-baseline gap-1 mt-0.5 flex-wrap">
              <span className="text-sm font-extrabold leading-none tabular-nums text-brand-navy">
                {KSH.format(product.price)}
              </span>
              {onSale && (
                <span className="text-[10px] text-brand-navy/35 line-through tabular-nums">
                  {KSH.format(product.compare_at_price!)}
                </span>
              )}
            </div>
          </div>
          <span className="inline-flex items-center gap-0.5 rounded-md bg-brand-surface px-2 py-1 text-[11px] font-bold text-brand-navy transition-all group-hover:bg-brand-navy group-hover:text-white shrink-0">
            Shop <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-brand-navy/10 bg-white overflow-hidden">
          <div className="aspect-4/3 bg-brand-surface animate-pulse" />
          <div className="p-3.5 space-y-2">
            <div className="h-2.5 w-1/4 bg-brand-surface animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-brand-surface animate-pulse rounded" />
            <div className="h-5 w-1/2 bg-brand-surface animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadError() {
  return (
    <div className="rounded-lg border border-dashed border-brand-navy/20 bg-brand-surface/50 p-6 text-center sm:p-8">
      <div className="mx-auto h-9 w-9 grid place-items-center rounded-full bg-white shadow-xs">
        <AlertCircle className="h-4 w-4 text-brand-orange shrink-0" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-brand-navy">Could not sync catalog</h3>
      <p className="mt-1 text-xs text-brand-navy/60 max-w-xs mx-auto leading-relaxed">
        Our database cluster is currently offline or unreachable. Please refresh the page to retry.
      </p>
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-brand-navy/20 bg-brand-surface/50 p-6 text-center sm:p-8">
      <div className="mx-auto h-9 w-9 grid place-items-center rounded-full bg-white shadow-xs">
        <SearchX className="h-4 w-4 text-brand-orange shrink-0" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-brand-navy">No products match filters</h3>
      <p className="mt-1 text-xs text-brand-navy/60 max-w-xs mx-auto leading-relaxed">
        Try clearing selected filters or submit custom specs if you need bespoke production.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        <button
          type="button"
          onClick={onClear}
          className="rounded-md bg-brand-navy px-3 py-2 text-xs font-bold text-white hover:bg-brand-navy/90 transition-colors"
        >
          Clear filters
        </button>
        <Link
          to="/request-quote"
          className="inline-flex items-center gap-1 rounded-md border border-brand-navy/15 bg-white px-3 py-2 text-xs font-bold text-brand-navy hover:border-brand-navy/40 transition-colors"
        >
          Request Custom Layout <ArrowRight className="h-3 w-3 shrink-0" />
        </Link>
      </div>
    </div>
  );
}

function ShopHelpGuides() {
  const faqs = [
    {
      q: "How does the digital layout proof work?",
      a: "After selecting specs and uploading artwork, our graphics team runs an architectural PDF vector proof. We match pantones precisely to align with your brand."
    },
    {
      q: "Can I order samples before running massive quantities?",
      a: "Yes. Submit your sample selection via our Request Quote tool. Sample charges are refunded when full production runs transition into active status."
    },
    {
      q: "What printing options exist for heavy outdoor displays?",
      a: "For banners and pop-up displays, we rely on heavy weather-resistant UV digital layouts guaranteed against fade and cracking under outdoor exposure."
    }
  ];

  return (
    <section className="mb-6 border-y border-brand-navy/10 bg-brand-surface/30 py-6 sm:py-8 md:mb-10 md:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-md bg-brand-orange/10 flex items-center justify-center shrink-0">
            <HelpCircle className="h-3.5 w-3.5 text-brand-orange" />
          </div>
          <h2 className="text-xs font-black uppercase tracking-wider text-brand-navy sm:text-sm">
            Corporate Procurement Guide
          </h2>
        </div>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {faqs.map((f, i) => (
            <div 
              key={i} 
              className="bg-white p-4 rounded-lg border border-brand-navy/8 hover:border-brand-orange/30 transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-brand-orange">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <h3 className="text-xs font-extrabold text-brand-navy leading-snug">
                    {f.q}
                  </h3>
                </div>
                <p className="text-[11px] text-brand-navy/65 leading-relaxed font-normal pt-0.5">
                  {f.a}
                </p>
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
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
      <div className="rounded-xl bg-brand-navy p-5 text-white sm:p-6 md:p-8">
        <div className="grid items-center gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-brand-orange mb-0.5">
              Bespoke Production
            </div>
            <h2 className="text-base font-extrabold tracking-tight sm:text-lg md:text-xl wrap-break-word">
              Need custom layout configurations?
            </h2>
            <p className="mt-1 text-xs text-white/70 leading-relaxed">
              Our engineering workshops handle complex substrate combinations, specialized shapes, and custom promotional bundles.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link
              to="/request-quote"
              className="inline-flex items-center justify-center w-full sm:w-auto gap-1.5 rounded-md bg-brand-orange px-4 py-2 text-xs font-bold text-white hover:bg-brand-orange/90 transition-colors"
            >
              Request Custom Layout <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
            <Link
              to="/bulk-orders"
              className="inline-flex items-center justify-center w-full sm:w-auto gap-1.5 rounded-md border border-white/20 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 transition-colors"
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
    <div className="space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-brand-navy/50 flex items-center gap-1">
        <IconComponent className="h-3 w-3 text-brand-orange shrink-0" /> {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((it) => {
          const checked = selected.includes(it);
          return (
            <li key={it}>
              <label className="flex items-center gap-2 text-xs cursor-pointer group select-none min-w-0">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(it)}
                  className="h-3 w-3 rounded border-brand-navy/30 text-brand-navy accent-brand-navy focus:ring-0 shrink-0"
                />
                <span
                  className={`transition-colors truncate ${
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