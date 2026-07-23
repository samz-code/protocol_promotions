import { useMemo, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductConfigurator } from "@/components/shop/ProductConfigurator";
import { useCart } from "@/lib/cart";
import {
  Star, ChevronRight, ChevronLeft, Package, Loader2, AlertCircle,
  Check, ShieldCheck, Truck, Layers,
} from "lucide-react";

export const Route = createFileRoute("/shop_/$slug")({
  head: () => ({
    meta: [
      { title: "Product | Protocol Promotions" },
      { name: "description", content: "Configure this product with live pricing, artwork upload and fast production." },
    ],
  }),
  component: ProductDetailPage,
});

const KSH = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

type Product = {
  id: string;
  slug: string;
  name: string;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  short_description: string | null;
  long_description: string | null;
  key_bullets: string[] | null;
  specs: { label?: string; name?: string; value: string }[] | null;
  print_methods: string[] | null;
  materials: string[] | null;
  colors: string[] | null;
  sizes: string[] | null;
  moq: number;
  lead_time: string | null;
  rating: number;
  review_count: number;
  badge: string | null;
  images: string[] | null;
  category_id: string | null;
  categories: { name: string; slug: string } | null;
};

type Tier = { min_qty: number; unit_price: number };
type Variant = {
  id: string;
  color: string | null;
  size: string | null;
  stock_qty: number;
  low_stock_at: number;
  is_active: boolean;
};
type SetupFee = { method: string; fee: number };
type Review = {
  id: string;
  author_name: string;
  author_role: string | null;
  rating: number;
  body: string;
  created_at: string;
};

function toArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

async function fetchBundle(slug: string) {
  const { data: product, error } = await supabase
    .from("products")
    .select("*, categories(name, slug)")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!product) return null;

  const p = product as unknown as Product;

  const [{ data: tiers }, { data: variants }, { data: fees }, { data: reviews }] = await Promise.all([
    supabase.from("price_tiers").select("min_qty, unit_price").eq("product_id", p.id).order("min_qty"),
    supabase.from("product_variants").select("id, color, size, stock_qty, low_stock_at, is_active").eq("product_id", p.id).eq("is_active", true).order("color"),
    supabase.from("setup_fees").select("method, fee").eq("is_active", true).order("sort_order"),
    supabase.from("reviews").select("id, author_name, author_role, rating, body, created_at").eq("product_id", p.id).eq("status", "approved").order("created_at", { ascending: false }).limit(20),
  ]);

  return {
    product: p,
    tiers: (tiers ?? []).map((t) => ({ min_qty: t.min_qty, unit_price: Number(t.unit_price) })) as Tier[],
    variants: (variants ?? []) as Variant[],
    setupFees: (fees ?? []).reduce<Record<string, number>>((acc, f) => {
      acc[f.method] = Number(f.fee);
      return acc;
    }, {}),
    reviews: (reviews ?? []) as Review[],
  };
}

function ProductDetailPage() {
  const { slug } = useParams({ from: "/shop_/$slug" });
  const { addLine } = useCart();

  const query = useQuery({
    queryKey: ["product-bundle", slug],
    queryFn: () => fetchBundle(slug),
  });

  if (query.isLoading) {
    return (
      <SiteLayout>
        <div className="container-page grid place-items-center py-32">
          <Loader2 className="h-7 w-7 animate-spin text-brand-navy" />
        </div>
      </SiteLayout>
    );
  }

  if (query.isError) {
    return (
      <SiteLayout>
        <div className="container-page py-24">
          <div className="mx-auto max-w-md rounded-lg border border-dashed border-brand-navy/20 bg-brand-surface/50 p-10 text-center">
            <AlertCircle className="mx-auto h-6 w-6 text-brand-orange" />
            <h1 className="mt-4 text-lg font-bold text-brand-navy">Could not load product</h1>
            <p className="mt-1.5 text-sm text-brand-navy/60">{(query.error as Error).message}</p>
            <Link to="/shop" className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand-orange">
              <ChevronLeft className="h-4 w-4" /> Back to shop
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (!query.data) {
    return (
      <SiteLayout>
        <div className="container-page py-24">
          <div className="mx-auto max-w-md rounded-lg border border-dashed border-brand-navy/20 bg-brand-surface/50 p-10 text-center">
            <Package className="mx-auto h-6 w-6 text-brand-navy/40" />
            <h1 className="mt-4 text-lg font-bold text-brand-navy">Product not found</h1>
            <p className="mt-1.5 text-sm text-brand-navy/60">This item may have been removed or is not currently available.</p>
            <Link to="/shop" className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand-orange">
              <ChevronLeft className="h-4 w-4" /> Back to shop
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  const { product, tiers, variants, setupFees, reviews } = query.data;
  const images = toArray<string>(product.images);
  const bullets = toArray<string>(product.key_bullets);

  return (
    <SiteLayout>
      {/* Breadcrumb */}
      <div className="border-b border-border bg-brand-surface/40">
        <div className="container-page flex items-center gap-1.5 overflow-x-auto whitespace-nowrap py-3 text-[11px] font-medium text-brand-navy/55 sm:py-4 sm:text-xs">
          <Link to="/" className="hover:text-brand-navy transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/shop" className="hover:text-brand-navy transition-colors">Shop</Link>
          {product.categories && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link to="/shop" search={{ category: product.categories.slug }} className="hover:text-brand-navy transition-colors">
                {product.categories.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="text-brand-navy font-semibold truncate">{product.name}</span>
        </div>
      </div>

      <section className="container-page py-6 sm:py-8 md:py-14">
        <div className="grid gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-14">
          <Gallery images={images} name={product.name} badge={product.badge} />

          <div>
            {product.categories && (
              <div className="text-[11px] font-bold uppercase tracking-widest text-brand-orange">
                {product.categories.name}
              </div>
            )}
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl md:text-4xl">
              {product.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < Math.round(product.rating) ? "fill-brand-orange text-brand-orange" : "text-brand-navy/20"}`} />
                ))}
                <span className="ml-1 font-semibold text-brand-navy">{product.rating > 0 ? product.rating.toFixed(1) : "New"}</span>
                {product.review_count > 0 && <span className="text-brand-navy/50">({product.review_count})</span>}
              </div>
              {product.sku && <span className="font-mono text-xs text-brand-navy/45">SKU: {product.sku}</span>}
            </div>

            {product.short_description && (
              <p className="mt-4 text-[15px] leading-relaxed text-brand-navy/70 sm:mt-5 sm:text-base">{product.short_description}</p>
            )}

            {bullets.length > 0 && (
              <ul className="mt-5 space-y-2">
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-brand-navy/75">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                    {b}
                  </li>
                ))}
              </ul>
            )}

            {variants.length > 0 && <VariantStockTable variants={variants} />}

            <div className="mt-8">
              <ProductConfigurator
                product={product}
                tiers={tiers}
                setupFees={setupFees}
                onAddToCart={(payload) => addLine(payload)}
              />
            </div>

            {/* Trust row */}
            <div className="mt-7 grid grid-cols-3 gap-2 border-t border-border pt-5 sm:mt-8 sm:gap-3 sm:pt-6">
              <TrustItem icon={Truck} label="Nationwide delivery" />
              <TrustItem icon={ShieldCheck} label="Free proof first" />
              <TrustItem icon={Layers} label="Volume discounts" />
            </div>
          </div>
        </div>

        <ProductTabs product={product} reviews={reviews} />
      </section>
    </SiteLayout>
  );
}

function Gallery({ images, name, badge }: { images: string[]; name: string; badge: string | null }) {
  const [active, setActive] = useState(0);
  const hasImages = images.length > 0;

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-xl border border-brand-navy/12 bg-brand-surface">
        {badge && (
          <span className="absolute top-4 left-4 z-10 rounded-md bg-brand-navy px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white">
            {badge}
          </span>
        )}
        {hasImages ? (
          <img src={images[active]} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center">
            <Package className="h-16 w-16 text-brand-navy/12" />
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActive((a) => (a - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-brand-navy shadow-md hover:bg-white"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setActive((a) => (a + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-brand-navy shadow-md hover:bg-white"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                i === active ? "border-brand-navy" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={img} alt={`${name} view ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VariantStockTable({ variants }: { variants: Variant[] }) {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-brand-navy/12 sm:mt-8">
      <div className="bg-brand-surface px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-brand-navy/60">
        Available colours & stock
      </div>
      <ul className="divide-y divide-brand-navy/8">
        {variants.map((v) => {
          const out = v.stock_qty <= 0;
          const low = !out && v.stock_qty <= v.low_stock_at;
          return (
            <li key={v.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-semibold text-brand-navy">
                {[v.color, v.size].filter(Boolean).join(" · ") || "Standard"}
              </span>
              <span className={`text-xs font-bold ${out ? "text-brand-navy/40" : low ? "text-brand-orange" : "text-green-600"}`}>
                {out ? "Out of stock" : low ? `Low stock (${v.stock_qty})` : `In stock (${v.stock_qty})`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TrustItem({ icon: Icon, label }: { icon: typeof Truck; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Icon className="h-5 w-5 text-brand-orange" />
      <span className="text-[11px] font-semibold text-brand-navy/70 leading-tight">{label}</span>
    </div>
  );
}

function ProductTabs({ product, reviews }: { product: Product; reviews: Review[] }) {
  const [tab, setTab] = useState<"description" | "specs" | "reviews">("description");
  // The admin editor saves specs as { name, value } while older records
  // use { label, value }. Accept either so the left column is never blank.
  const specs = toArray<{ label?: string; name?: string; value: string }>(product.specs);

  const tabs = [
    { key: "description", label: "Description" },
    { key: "specs", label: "Specifications" },
    { key: "reviews", label: `Reviews (${reviews.length})` },
  ] as const;

  return (
    <div className="mt-10 sm:mt-14 md:mt-16">
      <div className="flex gap-1 overflow-x-auto border-b-2 border-brand-navy/10 pb-px">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-0.5 shrink-0 whitespace-nowrap border-b-2 px-3.5 py-3 text-[13px] font-bold uppercase tracking-wide transition-colors sm:px-5 sm:text-sm ${
              tab === t.key ? "border-brand-orange text-brand-navy" : "border-transparent text-brand-navy/45 hover:text-brand-navy"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="py-6 sm:py-8">
        {tab === "description" && (
          <div className="max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-brand-navy/75 sm:text-base">
            {product.long_description || product.short_description || "No description available for this product yet."}
          </div>
        )}

        {tab === "specs" && (
          specs.length > 0 ? (
            <div className="max-w-2xl overflow-hidden rounded-xl border border-brand-navy/12">
              <dl className="divide-y divide-brand-navy/8">
                {specs.map((s, i) => {
                  const label = s.label ?? s.name ?? "";
                  return (
                    <div
                      key={i}
                      className="grid gap-0.5 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] sm:gap-4 sm:px-5 sm:py-3.5"
                    >
                      <dt className="text-[11px] font-bold uppercase tracking-wide text-brand-navy/50 sm:self-center sm:text-sm sm:font-bold sm:normal-case sm:tracking-normal sm:text-brand-navy">
                        {label}
                      </dt>
                      <dd className="text-sm leading-relaxed text-brand-navy/75 sm:self-center">
                        {s.value}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ) : (
            <p className="text-sm text-brand-navy/50">No specifications listed for this product.</p>
          )
        )}

        {tab === "reviews" && (
          reviews.length > 0 ? (
            <ul className="max-w-3xl space-y-5">
              {reviews.map((r) => (
                <li key={r.id} className="border-b border-brand-navy/8 pb-5 last:border-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-brand-navy">{r.author_name}</span>
                      {r.author_role && <span className="ml-2 text-xs text-brand-navy/45">{r.author_role}</span>}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-brand-orange text-brand-orange" : "text-brand-navy/20"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-brand-navy/70">{r.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-brand-navy/50">No reviews yet. Be the first to review this product after ordering.</p>
          )
        )}
      </div>
    </div>
  );
}