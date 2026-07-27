import { useMemo, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductConfigurator } from "@/components/shop/ProductConfigurator";
import { useCart } from "@/lib/cart";
import { FaWhatsapp } from "react-icons/fa";
import {
  Star, ChevronRight, ChevronLeft, Package, Loader2, AlertCircle,
  Check, ShieldCheck, Truck, Layers, Copy, CheckCheck,
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

// Business WhatsApp number, full international format, digits only.
const WHATSAPP_NUMBER = "254762446077";

const KSH = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

/* ================================================================
   Colour palette system

   Product colours arrive as plain names (e.g. "Navy Blue"). This
   resolves a name to a real hex swatch so we can render a colour dot,
   not just wording. It also accepts:
     - a raw hex string:        "#1b2a4a"
     - an explicit name|hex:    "Bottle Green|#0b3d2e"
   so admins can override any colour per product without code changes.
   ================================================================ */

const COLOR_MAP: Record<string, string> = {
  white: "#ffffff",
  offwhite: "#f4f1ea",
  cream: "#f5efe0",
  ivory: "#fffff0",
  beige: "#e8dcc4",
  khaki: "#b6a06a",
  sand: "#d8c9a8",
  tan: "#c9a26b",
  brown: "#6b4423",
  chocolate: "#3f2a1d",
  black: "#111214",
  jetblack: "#0a0a0a",
  charcoal: "#33363b",
  gunmetal: "#2a2f36",
  grey: "#8a8f98",
  gray: "#8a8f98",
  lightgrey: "#c7ccd3",
  lightgray: "#c7ccd3",
  darkgrey: "#4a4f57",
  darkgray: "#4a4f57",
  heathergrey: "#9ba0a6",
  silver: "#c0c4c9",
  ash: "#b2b6ba",
  navy: "#1b2a4a",
  navyblue: "#1b2a4a",
  royal: "#1e40af",
  royalblue: "#1e40af",
  blue: "#2563eb",
  skyblue: "#7dc4ec",
  babyblue: "#a9d4ef",
  lightblue: "#93c5fd",
  teal: "#0f9d9d",
  turquoise: "#1fbcb2",
  cyan: "#22b8cf",
  aqua: "#2fd0c8",
  green: "#2e9e4f",
  forestgreen: "#1f5133",
  bottlegreen: "#0b3d2e",
  emerald: "#10b981",
  olive: "#6b6f2b",
  lime: "#84cc16",
  mint: "#a7e8c8",
  yellow: "#f4c430",
  gold: "#d4af37",
  mustard: "#d4a017",
  orange: "#ee7b22",
  burntorange: "#c46040",
  rust: "#b7410e",
  coral: "#ff6f5e",
  peach: "#ffcba4",
  red: "#d92d20",
  crimson: "#b91c1c",
  maroon: "#6d1f2b",
  burgundy: "#5c1a2b",
  wine: "#722f37",
  pink: "#ec4899",
  hotpink: "#e8317f",
  rose: "#e79ab0",
  fuchsia: "#c026d3",
  magenta: "#c81c92",
  purple: "#7c3aed",
  violet: "#8b5cf6",
  lavender: "#c3b6e8",
  indigo: "#4338ca",
  plum: "#5f3a5f",
};

// A colour is "light" if its perceived luminance is high, so we can add a
// ring/border to keep white and pale swatches visible on a white background.
function isLightHex(hex: string): boolean {
  const m = hex.replace("#", "");
  if (m.length !== 6) return false;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.8;
}

// Resolve a raw colour string into a { name, hex } pair.
function resolveColor(raw: string): { name: string; hex: string | null } {
  const value = (raw ?? "").trim();

  // Explicit "Name|#hex" override.
  if (value.includes("|")) {
    const [name, hex] = value.split("|").map((s) => s.trim());
    return { name: name || hex, hex: /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex) ? hex : null };
  }

  // Raw hex string.
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
    return { name: value, hex: value };
  }

  // Named colour: normalise by stripping spaces/dashes and lowercasing.
  const key = value.toLowerCase().replace(/[\s\-_]/g, "");
  return { name: value, hex: COLOR_MAP[key] ?? null };
}

function Swatch({ raw, size = 14 }: { raw: string; size?: number }) {
  const { hex } = resolveColor(raw);
  const dim = { height: size, width: size };

  if (!hex) {
    // Unknown colour: neutral chequer so it is clearly "no swatch" not black.
    return (
      <span
        aria-hidden="true"
        className="inline-block shrink-0 rounded-full ring-1 ring-brand-navy/25"
        style={{
          ...dim,
          backgroundImage:
            "linear-gradient(45deg, #cbd0d6 25%, transparent 25%, transparent 75%, #cbd0d6 75%), linear-gradient(45deg, #cbd0d6 25%, #eef0f2 25%, #eef0f2 75%, #cbd0d6 75%)",
          backgroundSize: "6px 6px",
          backgroundPosition: "0 0, 3px 3px",
        }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full ${
        isLightHex(hex) ? "ring-1 ring-brand-navy/25" : "ring-1 ring-black/10"
      }`}
      style={{ ...dim, backgroundColor: hex }}
    />
  );
}

// Clean display name (drops any "|#hex" suffix, keeps raw hex as-is).
function colorDisplayName(raw: string): string {
  return resolveColor(raw).name;
}

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
type Review = {
  id: string;
  author_name: string;
  author_role: string | null;
  rating: number;
  body: string;
  created_at: string;
};

// Shape of the current configuration we mirror from the configurator so the
// WhatsApp order message reflects exactly what the customer selected.
type Selection = {
  quantity: number;
  color: string | null;
  size: string | null;
  method: string | null;
  unitPrice: number;
  total: number;
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
          <div className="mx-auto max-w-md border border-dashed border-brand-navy/20 bg-brand-surface/50 p-10 text-center">
            <AlertCircle className="mx-auto h-6 w-6 text-brand-orange" />
            <h1 className="mt-4 text-lg font-bold text-brand-navy">Could not load product</h1>
            <p className="mt-1.5 text-sm text-brand-navy/60">{(query.error as Error).message}</p>
            <Link to="/shop" className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand-orange hover:gap-2.5 transition-all">
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
          <div className="mx-auto max-w-md border border-dashed border-brand-navy/20 bg-brand-surface/50 p-10 text-center">
            <Package className="mx-auto h-6 w-6 text-brand-navy/40" />
            <h1 className="mt-4 text-lg font-bold text-brand-navy">Product not found</h1>
            <p className="mt-1.5 text-sm text-brand-navy/60">This item may have been removed or is not currently available.</p>
            <Link to="/shop" className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand-orange hover:gap-2.5 transition-all">
              <ChevronLeft className="h-4 w-4" /> Back to shop
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  const { product, tiers, variants, setupFees, reviews } = query.data;
  return (
    <ProductView
      product={product}
      tiers={tiers}
      variants={variants}
      setupFees={setupFees}
      reviews={reviews}
      onAddToCart={addLine}
    />
  );
}

function ProductView({
  product, tiers, variants, setupFees, reviews, onAddToCart,
}: {
  product: Product;
  tiers: Tier[];
  variants: Variant[];
  setupFees: Record<string, number>;
  reviews: Review[];
  onAddToCart: (payload: any) => void;
}) {
  const images = toArray<string>(product.images);
  const bullets = toArray<string>(product.key_bullets);

  // Mirror the current configuration so the WhatsApp order reflects it.
  // Seeded with sensible defaults so the button works before any change.
  const [selection, setSelection] = useState<Selection>(() => ({
    quantity: product.moq || 1,
    color: toArray<string>(product.colors)[0] ?? null,
    size: toArray<string>(product.sizes)[0] ?? null,
    method: toArray<string>(product.print_methods)[0] ?? null,
    unitPrice: Number(product.price),
    total: Number(product.price) * (product.moq || 1),
  }));

  // Resolve unit price from the tier table for a given quantity, so the
  // fallback selection bar and the WhatsApp total stay accurate even if the
  // configurator does not report changes.
  const priceForQty = useMemo(() => {
    const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
    return (qty: number) => {
      let unit = Number(product.price);
      for (const t of sorted) {
        if (qty >= t.min_qty) unit = t.unit_price;
      }
      return unit;
    };
  }, [tiers, product.price]);

  const productUrl =
    typeof window !== "undefined" ? window.location.href : `/shop/${product.slug}`;

  return (
    <SiteLayout>
      {/* Breadcrumb */}
      <div className="border-b border-brand-navy/12 bg-brand-surface/40">
        <div className="container-page flex items-center gap-1.5 overflow-x-auto whitespace-nowrap py-3 text-[11px] font-medium text-brand-navy/55 sm:py-4 sm:text-xs">
          <Link to="/" className="transition-colors hover:text-brand-orange">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/shop" className="transition-colors hover:text-brand-orange">Shop</Link>
          {product.categories && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link to="/shop" search={{ category: product.categories.slug }} className="transition-colors hover:text-brand-orange">
                {product.categories.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="truncate font-semibold text-brand-navy">{product.name}</span>
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
                  <li key={i} className="group flex items-start gap-2.5 text-sm text-brand-navy/75 transition-colors hover:text-brand-navy">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange transition-transform group-hover:scale-125" />
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
                onAddToCart={(payload: any) => {
                  onAddToCart(payload);
                  // Mirror the configured selection into the WhatsApp order.
                  syncFromPayload(payload, priceForQty, setSelection);
                }}
              />
            </div>

            {/* Direct WhatsApp order */}
            <WhatsAppOrderBar
              product={product}
              selection={selection}
              setSelection={setSelection}
              priceForQty={priceForQty}
              productUrl={productUrl}
            />

            {/* Trust row */}
            <div className="mt-7 grid grid-cols-3 gap-2 border-t border-brand-navy/12 pt-5 sm:mt-8 sm:gap-3 sm:pt-6">
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

/* ================================================================
   Try to read quantity / color / size / method / price out of the
   configurator payload, whatever its exact field names are.
   ================================================================ */

function syncFromPayload(
  payload: any,
  priceForQty: (qty: number) => number,
  setSelection: (s: Selection) => void
) {
  if (!payload || typeof payload !== "object") return;

  const quantity =
    Number(payload.quantity ?? payload.qty ?? payload.count ?? 0) || 0;
  if (quantity <= 0) return;

  const color = payload.color ?? payload.colour ?? payload.variantColor ?? null;
  const size = payload.size ?? payload.variantSize ?? null;
  const method =
    payload.method ?? payload.printMethod ?? payload.print_method ?? payload.technique ?? null;

  const unitPrice =
    Number(payload.unitPrice ?? payload.unit_price ?? priceForQty(quantity)) ||
    priceForQty(quantity);

  const total =
    Number(payload.total ?? payload.lineTotal ?? unitPrice * quantity) ||
    unitPrice * quantity;

  setSelection({ quantity, color, size, method, unitPrice, total });
}

/* ================================================================
   WhatsApp order bar
   Lets the customer place the exact configured order over WhatsApp,
   with a live editable quantity fallback and a copyable summary.
   ================================================================ */

function WhatsAppOrderBar({
  product,
  selection,
  setSelection,
  priceForQty,
  productUrl,
}: {
  product: Product;
  selection: Selection;
  setSelection: (s: Selection) => void;
  priceForQty: (qty: number) => number;
  productUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  const colors = toArray<string>(product.colors);
  const sizes = toArray<string>(product.sizes);
  const methods = toArray<string>(product.print_methods);

  const setQty = (raw: number) => {
    const qty = Math.max(product.moq || 1, Math.floor(raw) || product.moq || 1);
    const unitPrice = priceForQty(qty);
    setSelection({ ...selection, quantity: qty, unitPrice, total: unitPrice * qty });
  };

  const setField = (patch: Partial<Selection>) => {
    const next = { ...selection, ...patch };
    setSelection({ ...next, total: next.unitPrice * next.quantity });
  };

  const message = useMemo(() => {
    const lines = [
      "Hello Protocol Promotions, I would like to order:",
      "",
      `Product: ${product.name}`,
      product.sku ? `SKU: ${product.sku}` : "",
      `Quantity: ${selection.quantity}`,
      selection.color ? `Colour: ${colorDisplayName(selection.color)}` : "",
      selection.size ? `Size: ${selection.size}` : "",
      selection.method ? `Print method: ${selection.method}` : "",
      `Unit price: ${KSH.format(selection.unitPrice)}`,
      `Estimated total: ${KSH.format(selection.total)} (before artwork setup)`,
      "",
      `Link: ${productUrl}`,
      "",
      "Please confirm availability, setup cost and lead time. Thank you.",
    ];
    return lines.filter(Boolean).join("\n");
  }, [product, selection, productUrl]);

  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable; silently ignore.
    }
  };

  return (
    <div className="mt-6 border border-brand-navy/15 bg-brand-surface/60">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-brand-navy/12 bg-white px-4 py-3">
        <FaWhatsapp className="h-5 w-5 text-[#25D366]" />
        <div className="text-sm font-extrabold text-brand-navy">Order directly on WhatsApp</div>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          Usually replies fast
        </span>
      </div>

      {/* Quick selectors (fallback / confirmation) */}
      <div className="space-y-3 px-4 py-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Quantity stepper */}
          <div className="inline-flex items-center border border-brand-navy/20 bg-white">
            <button
              type="button"
              onClick={() => setQty(selection.quantity - 1)}
              className="grid h-9 w-9 place-items-center text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <input
              type="number"
              min={product.moq || 1}
              value={selection.quantity}
              onChange={(e) => setQty(Number(e.target.value))}
              className="h-9 w-16 border-x border-brand-navy/15 bg-white text-center text-sm font-bold tabular-nums text-brand-navy outline-none focus:bg-brand-surface"
            />
            <button
              type="button"
              onClick={() => setQty(selection.quantity + 1)}
              className="grid h-9 w-9 place-items-center text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-brand-navy/45">
            MOQ {product.moq || 1}
          </span>

          <div className="ml-auto text-right">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-brand-navy/45">
              Est. total
            </div>
            <div className="text-lg font-extrabold tabular-nums text-brand-navy">
              {KSH.format(selection.total)}
            </div>
          </div>
        </div>

        {/* Chip selectors, only shown when the product offers options */}
        {colors.length > 0 && (
          <ChipRow
            label="Colour"
            options={colors}
            value={selection.color}
            onSelect={(v) => setField({ color: v })}
            withSwatch
          />
        )}
        {sizes.length > 0 && (
          <ChipRow
            label="Size"
            options={sizes}
            value={selection.size}
            onSelect={(v) => setField({ size: v })}
          />
        )}
        {methods.length > 0 && (
          <ChipRow
            label="Print method"
            options={methods}
            value={selection.method}
            onSelect={(v) => setField({ method: v })}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 border-t border-brand-navy/12 bg-white p-4 sm:flex-row">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex flex-1 items-center justify-center gap-2 bg-[#25D366] px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--color-brand-navy)] active:translate-y-0"
        >
          <FaWhatsapp className="h-5 w-5 transition-transform duration-300 group-hover:rotate-6" />
          Send order on WhatsApp
        </a>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center justify-center gap-2 border border-brand-navy px-5 py-3.5 text-sm font-bold uppercase tracking-wide text-brand-navy transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-orange hover:text-brand-orange active:translate-y-0"
        >
          {copied ? <CheckCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <p className="px-4 pb-4 text-[11px] leading-relaxed text-brand-navy/50">
        Sends your exact selection to our team. Final price is confirmed after artwork and setup.
      </p>
    </div>
  );
}

function ChipRow({
  label, options, value, onSelect, withSwatch = false,
}: {
  label: string;
  options: string[];
  value: string | null;
  onSelect: (v: string) => void;
  withSwatch?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-brand-navy/45">
        {label}
        {withSwatch && value && (
          <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-brand-navy/70">
            <Swatch raw={value} size={12} />
            {colorDisplayName(value)}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onSelect(opt)}
              title={withSwatch ? colorDisplayName(opt) : opt}
              className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                selected
                  ? "border-brand-navy bg-brand-navy text-white"
                  : "border-brand-navy/20 bg-white text-brand-navy/75 hover:-translate-y-0.5 hover:border-brand-orange hover:text-brand-orange"
              }`}
            >
              {withSwatch && <Swatch raw={opt} size={14} />}
              {withSwatch ? colorDisplayName(opt) : opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   Gallery
   ================================================================ */

function Gallery({ images, name, badge }: { images: string[]; name: string; badge: string | null }) {
  const [active, setActive] = useState(0);
  const hasImages = images.length > 0;

  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      <div className="group relative aspect-square overflow-hidden border border-brand-navy/15 bg-brand-surface">
        {badge && (
          <span className="absolute left-4 top-4 z-10 bg-brand-navy px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white">
            {badge}
          </span>
        )}
        {hasImages ? (
          <img
            src={images[active]}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
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
              className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center border border-brand-navy bg-white/90 text-brand-navy backdrop-blur-sm transition-colors hover:bg-brand-navy hover:text-white"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setActive((a) => (a + 1) % images.length)}
              className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center border border-brand-navy bg-white/90 text-brand-navy backdrop-blur-sm transition-colors hover:bg-brand-navy hover:text-white"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Counter */}
            <span className="absolute bottom-3 right-3 bg-brand-navy/80 px-2 py-0.5 text-[11px] font-bold tabular-nums text-white">
              {active + 1} / {images.length}
            </span>
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
              className={`h-16 w-16 shrink-0 overflow-hidden border-2 transition-all ${
                i === active
                  ? "border-brand-orange"
                  : "border-transparent opacity-60 hover:opacity-100"
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
    <div className="mt-6 overflow-hidden border border-brand-navy/15 sm:mt-8">
      <div className="bg-brand-surface px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-brand-navy/60">
        Available colours & stock
      </div>
      <ul className="divide-y divide-brand-navy/8">
        {variants.map((v) => {
          const out = v.stock_qty <= 0;
          const low = !out && v.stock_qty <= v.low_stock_at;
          return (
            <li key={v.id} className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-brand-surface/60">
              <span className="flex items-center gap-2 font-semibold text-brand-navy">
                {v.color && <Swatch raw={v.color} size={14} />}
                {[v.color ? colorDisplayName(v.color) : null, v.size].filter(Boolean).join(" · ") || "Standard"}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${out ? "text-brand-navy/40" : low ? "text-brand-orange" : "text-green-600"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${out ? "bg-brand-navy/30" : low ? "bg-brand-orange" : "bg-green-500"}`} />
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
    <div className="group flex flex-col items-center gap-2 text-center">
      <span className="grid h-10 w-10 place-items-center border border-brand-navy/12 bg-brand-surface transition-colors duration-300 group-hover:border-brand-orange group-hover:bg-brand-orange/10">
        <Icon className="h-5 w-5 text-brand-orange" />
      </span>
      <span className="text-[11px] font-semibold leading-tight text-brand-navy/70">{label}</span>
    </div>
  );
}

function ProductTabs({ product, reviews }: { product: Product; reviews: Review[] }) {
  const [tab, setTab] = useState<"description" | "specs" | "reviews">("description");
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
            <div className="max-w-2xl overflow-hidden border border-brand-navy/15">
              <dl className="divide-y divide-brand-navy/8">
                {specs.map((s, i) => {
                  const label = s.label ?? s.name ?? "";
                  return (
                    <div
                      key={i}
                      className="grid gap-0.5 px-4 py-3 transition-colors hover:bg-brand-surface/50 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] sm:gap-4 sm:px-5 sm:py-3.5"
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