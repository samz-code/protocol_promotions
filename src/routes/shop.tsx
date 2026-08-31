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
  Shirt, Footprints, HardHat, Watch, Glasses, Umbrella, Printer, FileText,
  BookOpen, Newspaper, StickyNote, Files, Stamp, Mail, Megaphone, Flag,
  PanelTop, Presentation, Frame, Tv, Lightbulb, Coffee, CupSoda, Wine, Gift,
  Award, Trophy, Medal, Cake, ShoppingBag, Package, Box, Briefcase, Backpack,
  Luggage, Archive, MonitorSmartphone, Laptop, Headphones, Keyboard, Mouse,
  BatteryCharging, Usb, Calculator, Palette, PenTool, Paintbrush, Scissors,
  Ruler, Hammer, Wrench, Sparkles, Car, Truck, Bike, Tent, TreePine, Sun,
  Building2, Store, Factory, Users, Handshake, BadgeCheck, Percent, Tag,
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
  "Screen Print", "Digital Printing", "Embroidery", "Laser Engraving",
  "Vinyl Transfer", "Sublimation", "Pad Printing", "UV Printing"
];

const MATERIALS = [
  "100% Cotton", "Polyester Blend", "Heavy Canvas", "PVC / Vinyl",
  "Kraft Paper", "Ceramic / Porcelain", "Stainless Steel", "Acrylic / Perspex", "Anodized Aluminum"
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
        ].join(" ").toLowerCase();
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
          description="Configure your chosen items with dynamic layouts, precise size adjustments, brand colors, and printing methods."
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
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-brand-navy/20 bg-white px-4 py-2.5 text-xs font-semibold text-brand-navy shadow-xs"
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
                        !activeCategory ? "bg-brand-navy text-white font-bold" : "text-brand-navy/70 hover:bg-brand-surface"
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
                            isActive ? "bg-brand-navy text-white font-bold" : "text-brand-navy/70 hover:bg-brand-surface"
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
                    {searchQuery ? `Results for "${searchQuery}"` : activeCategory ? activeCategory.name : "Core Corporate Collection"}
                  </h1>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-brand-navy/50">
                    {productsQuery.isLoading ? (
                      "Loading products..."
                    ) : (
                      <>
                        <span>Displaying <span className="font-semibold text-brand-navy/70">{results.length}</span> products</span>
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={clearSearch}
                            className="inline-flex items-center gap-1 rounded-full bg-brand-navy/5 px-2 py-0.5 text-[10px] font-bold text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
                          >
                            Clear search <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-wider text-brand-navy/40">Sort</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="w-full sm:w-auto rounded-md border border-brand-navy/15 bg-white px-2.5 py-1.5 text-xs font-bold text-brand-navy focus:outline-none"
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
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {results.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}

function ProductCard({ product }: { product: Product }) {
  const Icon = categoryIcon(product.categories?.icon);
  const hasImage = product.images.length > 0;
  const onSale = product.compare_at_price && product.compare_at_price > product.price;
  const discount = onSale ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100) : null;

  return (
    <Link
      to="/shop/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col rounded-xl border border-brand-navy/10 bg-white overflow-hidden transition-all duration-300 hover:border-brand-navy/25 hover:shadow-lg hover:-translate-y-1"
    >
      {/* Product Image Container with Internal Padding so items do not touch edges */}
      <div className="relative aspect-4/3 bg-brand-surface/40 p-4 flex items-center justify-center overflow-hidden">
        {hasImage ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105 drop-shadow-xs"
            loading="lazy"
          />
        ) : (
          <Icon className="h-10 w-10 text-brand-navy/20" />
        )}

        {product.badge && (
          <span className="absolute top-2 left-2 rounded bg-brand-navy/90 backdrop-blur-xs px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
            {product.badge}
          </span>
        )}
        {discount !== null && (
          <span className="absolute top-2 right-2 rounded bg-brand-orange px-2 py-0.5 text-[8px] font-extrabold tracking-wider text-white">
            SAVE {discount}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5 min-w-0">
        {product.categories && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-brand-orange truncate block">
            {product.categories.name}
          </span>
        )}

        <h3 className="mt-1 text-xs font-bold leading-snug text-brand-navy transition-colors line-clamp-2 group-hover:text-brand-orange">
          {product.name}
        </h3>

        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-brand-navy/60">
          <span className="inline-flex items-center gap-0.5 font-bold text-brand-navy">
            <Star className="h-3 w-3 fill-brand-orange text-brand-orange shrink-0" />
            {product.rating > 0 ? product.rating.toFixed(1) : "New"}
          </span>
          <span>•</span>
          <span>MOQ: {product.moq}</span>
        </div>

        <div className="mt-auto pt-3 border-t border-brand-navy/5 flex items-center justify-between gap-1">
          <div>
            <span className="text-[8px] font-semibold uppercase tracking-wider text-brand-navy/40 block">From</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-extrabold text-brand-navy">{KSH.format(product.price)}</span>
              {onSale && (
                <span className="text-[10px] text-brand-navy/35 line-through">{KSH.format(product.compare_at_price!)}</span>
              )}
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-brand-surface px-2.5 py-1 text-[11px] font-bold text-brand-navy group-hover:bg-brand-navy group-hover:text-white transition-colors">
            Shop <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function ShopTrustStrip() {
  const items = [
    { icon: Truck, label: "East Africa Delivery", desc: "Doorstep delivery to Nairobi, Kampala, Dar es Salaam." },
    { icon: PenTool, label: "Vector Proofing", desc: "No order printed without your explicit approval." },
    { icon: Layers, label: "Bulk Tiering", desc: "Automatic wholesale discounts apply in checkout." },
  ];

  return (
    <section className="bg-brand-navy text-white border-y border-white/10 py-3">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-4 md:grid-cols-3">
        {items.map((i) => (
          <div key={i.label} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-white/10 flex items-center justify-center shrink-0">
              <i.icon className="h-4 w-4 text-brand-orange" />
            </div>
            <div>
              <h3 className="text-xs font-bold">{i.label}</h3>
              <p className="text-[10px] text-white/60">{i.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoryStrip({ categories, products, activeSlug, onSelect }: { categories: Category[]; products: Product[]; activeSlug: string | null; onSelect: (slug: string | null) => void; }) {
  return (
    <section className="bg-brand-surface/30 border-b border-brand-navy/10 py-3">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              !activeSlug ? "bg-brand-navy text-white" : "bg-white border border-brand-navy/10 text-brand-navy hover:bg-brand-surface"
            }`}
          >
            All Items ({products.length})
          </button>
          {categories.map((c) => {
            const isActive = activeSlug === c.slug;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(isActive ? null : c.slug)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  isActive ? "bg-brand-navy text-white" : "bg-white border border-brand-navy/10 text-brand-navy hover:bg-brand-surface"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FilterGroup({ title, icon: IconComponent, items, selected, onToggle }: { title: string; icon: typeof Coins; items: string[]; selected: string[]; onToggle: (value: string) => void; }) {
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
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(it)}
                  className="h-3.5 w-3.5 rounded border-brand-navy/30 text-brand-navy accent-brand-navy"
                />
                <span className={checked ? "text-brand-navy font-bold" : "text-brand-navy/60"}>{it}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-brand-navy/10 bg-white overflow-hidden p-3 space-y-3">
          <div className="aspect-4/3 bg-brand-surface animate-pulse rounded-lg" />
          <div className="h-3 w-1/3 bg-brand-surface animate-pulse rounded" />
          <div className="h-4 w-2/3 bg-brand-surface animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

function LoadError() {
  return (
    <div className="rounded-lg border border-dashed border-brand-navy/20 bg-brand-surface/50 p-6 text-center">
      <AlertCircle className="mx-auto h-6 w-6 text-brand-orange" />
      <h3 className="mt-2 text-xs font-bold text-brand-navy">Error loading catalogue</h3>
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-brand-navy/20 bg-brand-surface/50 p-8 text-center">
      <SearchX className="mx-auto h-6 w-6 text-brand-orange" />
      <h3 className="mt-2 text-sm font-bold text-brand-navy">No products found</h3>
      <p className="text-xs text-brand-navy/60 mt-1">Try resetting selected filters.</p>
      <button onClick={onClear} className="mt-4 px-3 py-1.5 bg-brand-navy text-white text-xs font-bold rounded-md">
        Reset Filters
      </button>
    </div>
  );
}