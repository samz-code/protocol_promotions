import { useMemo, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductConfigurator } from "@/components/shop/ProductConfigurator";
import { useCart } from "@/lib/cart";
import { FaWhatsapp, FaFacebookF, FaLinkedinIn, FaTelegramPlane } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import {
  Star, ChevronRight, ChevronLeft, Package, Loader2, AlertCircle,
  Check, ShieldCheck, Truck, Layers, Copy, CheckCheck, Share2,
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

const WHATSAPP_NUMBER = "254762446077";

const KSH = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

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

function isLightHex(hex: string): boolean {
  const m = hex.replace("#", "");
  if (m.length !== 6) return false;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.8;
}

function resolveColor(raw: string): { name: string; hex: string | null } {
  const value = (raw ?? "").trim();

  if (value.includes("|")) {
    const [name, hex] = value.split("|").map((s) => s.trim());
    return { name: name || hex, hex: /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex) ? hex : null };
  }

  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
    return { name: value, hex: value };
  }

  const key = value.toLowerCase().replace(/[\s\-_]/g, "");
  return { name: value, hex: COLOR_MAP[key] ?? null };
}

function Swatch({ raw, size = 12 }: { raw: string; size?: number }) {
  const { hex } = resolveColor(raw);
  const dim = { height: size, width: size };

  if (!hex) {
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
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-navy" />
        </div>
      </SiteLayout>
    );
  }

  if (query.isError) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-md border border-dashed border-brand-navy/20 bg-brand-surface/50 p-6 text-center rounded-xl">
            <AlertCircle className="mx-auto h-5 w-5 text-brand-orange" />
            <h1 className="mt-3 text-sm font-bold text-brand-navy">Could not load product</h1>
            <p className="mt-1 text-xs text-brand-navy/60">{(query.error as Error).message}</p>
            <Link to="/shop" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-orange hover:underline">
              <ChevronLeft className="h-3.5 w-3.5" /> Back to shop
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (!query.data) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-md border border-dashed border-brand-navy/20 bg-brand-surface/50 p-6 text-center rounded-xl">
            <Package className="mx-auto h-5 w-5 text-brand-navy/40" />
            <h1 className="mt-3 text-sm font-bold text-brand-navy">Product not found</h1>
            <p className="mt-1 text-xs text-brand-navy/60">This item may have been removed or is not available.</p>
            <Link to="/shop" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-orange hover:underline">
              <ChevronLeft className="h-3.5 w-3.5" /> Back to shop
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

  const [selection, setSelection] = useState<Selection>(() => ({
    quantity: product.moq || 1,
    color: toArray<string>(product.colors)[0] ?? null,
    size: toArray<string>(product.sizes)[0] ?? null,
    method: toArray<string>(product.print_methods)[0] ?? null,
    unitPrice: Number(product.price),
    total: Number(product.price) * (product.moq || 1),
  }));

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
      <div className="w-full">
        {/* Breadcrumb */}
        <div className="border-b border-brand-navy/10 bg-brand-surface/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap py-2 text-[11px] font-medium text-brand-navy/60 no-scrollbar">
            <Link to="/" className="transition-colors hover:text-brand-orange shrink-0">Home</Link>
            <ChevronRight className="h-3 w-3 shrink-0 text-brand-navy/30" />
            <Link to="/shop" className="transition-colors hover:text-brand-orange shrink-0">Shop</Link>
            {product.categories && (
              <>
                <ChevronRight className="h-3 w-3 shrink-0 text-brand-navy/30" />
                <Link to="/shop" search={{ category: product.categories.slug }} className="transition-colors hover:text-brand-orange shrink-0 truncate max-w-25 sm:max-w-none">
                  {product.categories.name}
                </Link>
              </>
            )}
            <ChevronRight className="h-3 w-3 shrink-0 text-brand-navy/30" />
            <span className="truncate font-semibold text-brand-navy max-w-35ax-w-xs">{product.name}</span>
          </div>
        </div>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-8 items-start">
            <div className="lg:col-span-5">
              <Gallery images={images} name={product.name} badge={product.badge} />
            </div>

            <div className="lg:col-span-7 min-w-0">
              {product.categories && (
                <div className="text-[10px] font-bold uppercase tracking-widest text-brand-orange truncate">
                  {product.categories.name}
                </div>
              )}
              <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-brand-navy sm:text-2xl md:text-3xl wrap-break-word">
                {product.name}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(product.rating) ? "fill-brand-orange text-brand-orange" : "text-brand-navy/20"}`} />
                  ))}
                  <span className="ml-1 font-bold text-brand-navy">{product.rating > 0 ? product.rating.toFixed(1) : "New"}</span>
                  {product.review_count > 0 && <span className="text-brand-navy/50">({product.review_count})</span>}
                </div>
                {product.sku && <span className="font-mono text-[11px] text-brand-navy/45 border-l border-brand-navy/15 pl-2.5">SKU: {product.sku}</span>}
              </div>

              {product.short_description && (
                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-brand-navy/75 wrap-break-word">
                  {product.short_description}
                </p>
              )}

              {bullets.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-brand-navy/80">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-orange" />
                      <span className="wrap-break-word">{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              <SocialShareBar title={product.name} url={productUrl} />

              {variants.length > 0 && <VariantStockTable variants={variants} />}

              <div className="mt-5 min-w-0">
                <ProductConfigurator
                  product={product}
                  tiers={tiers}
                  setupFees={setupFees}
                  onAddToCart={(payload: any) => {
                    onAddToCart(payload);
                    syncFromPayload(payload, priceForQty, setSelection);
                  }}
                />
              </div>

              <WhatsAppOrderBar
                product={product}
                selection={selection}
                setSelection={setSelection}
                priceForQty={priceForQty}
                productUrl={productUrl}
              />

              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-brand-navy/10 pt-4">
                <TrustItem icon={Truck} label="East Africa delivery" />
                <TrustItem icon={ShieldCheck} label="Free visual proof" />
                <TrustItem icon={Layers} label="Automatic scaling" />
              </div>
            </div>
          </div>

          <ProductTabs product={product} reviews={reviews} />
        </section>
      </div>
    </SiteLayout>
  );
}

function syncFromPayload(
  payload: any,
  priceForQty: (qty: number) => number,
  setSelection: (s: Selection) => void
) {
  if (!payload || typeof payload !== "object") return;

  const quantity = Number(payload.quantity ?? payload.qty ?? payload.count ?? 0) || 0;
  if (quantity <= 0) return;

  const color = payload.color ?? payload.colour ?? payload.variantColor ?? null;
  const size = payload.size ?? payload.variantSize ?? null;
  const method = payload.method ?? payload.printMethod ?? payload.print_method ?? payload.technique ?? null;

  const unitPrice = Number(payload.unitPrice ?? payload.unit_price ?? priceForQty(quantity)) || priceForQty(quantity);
  const total = Number(payload.total ?? payload.lineTotal ?? unitPrice * quantity) || unitPrice * quantity;

  setSelection({ quantity, color, size, method, unitPrice, total });
}

function SocialShareBar({ title, url }: { title: string; url: string }) {
  const shareText = `Check out ${title} on Protocol Promotions:`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText);

  const channels = [
    {
      name: "WhatsApp",
      icon: FaWhatsapp,
      href: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
      color: "hover:bg-[#25D366] hover:text-white hover:border-[#25D366]",
    },
    {
      name: "Facebook",
      icon: FaFacebookF,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]",
    },
    {
      name: "X",
      icon: FaXTwitter,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      color: "hover:bg-black hover:text-white hover:border-black",
    },
    {
      name: "LinkedIn",
      icon: FaLinkedinIn,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: "hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2]",
    },
    {
      name: "Telegram",
      icon: FaTelegramPlane,
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      color: "hover:bg-[#229ED9] hover:text-white hover:border-[#229ED9]",
    },
  ];

  return (
    <div className="mt-4 pt-3 border-t border-brand-navy/10">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-brand-navy/50 flex items-center gap-1 mr-1">
          <Share2 className="h-3 w-3 text-brand-orange shrink-0" /> Share
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {channels.map((c) => {
            const Icon = c.icon;
            return (
              <a
                key={c.name}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                title={`Share on ${c.name}`}
                className={`h-7 w-7 rounded-md border border-brand-navy/15 bg-white text-brand-navy/70 flex items-center justify-center transition-all duration-200 ${c.color}`}
              >
                <Icon className="h-3 w-3 shrink-0" />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
      // Clipboard fallback ignored
    }
  };

  return (
    <div className="mt-5 border border-brand-navy/15 bg-brand-surface/60 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 border-b border-brand-navy/10 bg-white px-3.5 py-2">
        <FaWhatsapp className="h-4 w-4 text-[#25D366] shrink-0" />
        <div className="text-xs font-extrabold text-brand-navy truncate">Direct WhatsApp Order</div>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 shrink-0">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
          Fast Response
        </span>
      </div>

      <div className="space-y-2.5 px-3.5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center border border-brand-navy/20 bg-white rounded-md overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => setQty(selection.quantity - 1)}
              className="grid h-7 w-7 place-items-center text-xs text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <input
              type="number"
              min={product.moq || 1}
              value={selection.quantity}
              onChange={(e) => setQty(Number(e.target.value))}
              className="h-7 w-12 border-x border-brand-navy/15 bg-white text-center text-xs font-bold tabular-nums text-brand-navy outline-none"
            />
            <button
              type="button"
              onClick={() => setQty(selection.quantity + 1)}
              className="grid h-7 w-7 place-items-center text-xs text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <div className="text-right">
            <div className="text-[9px] font-bold uppercase tracking-widest text-brand-navy/45">
              Est. Total
            </div>
            <div className="text-sm font-black tabular-nums text-brand-navy">
              {KSH.format(selection.total)}
            </div>
          </div>
        </div>

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

      <div className="flex flex-col gap-1.5 border-t border-brand-navy/10 bg-white p-3 sm:flex-row">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex flex-1 items-center justify-center gap-1.5 bg-[#25D366] px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide text-white hover:bg-[#20bd5a] transition-colors"
        >
          <FaWhatsapp className="h-3.5 w-3.5 shrink-0" />
          Send Order on WhatsApp
        </a>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center justify-center gap-1.5 border border-brand-navy/20 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wide text-brand-navy hover:bg-brand-surface transition-colors shrink-0"
        >
          {copied ? <CheckCheck className="h-3.5 w-3.5 text-green-600 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
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
    <div className="w-full">
      <div className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-brand-navy/45">
        {label}
        {withSwatch && value && (
          <span className="inline-flex items-center gap-1 normal-case tracking-normal text-brand-navy/70 truncate">
            <Swatch raw={value} size={9} />
            {colorDisplayName(value)}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onSelect(opt)}
              title={withSwatch ? colorDisplayName(opt) : opt}
              className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                selected
                  ? "border-brand-navy bg-brand-navy text-white font-semibold"
                  : "border-brand-navy/15 bg-white text-brand-navy/75 hover:border-brand-navy/40"
              }`}
            >
              {withSwatch && <Swatch raw={opt} size={10} />}
              <span className="truncate max-w-25">{withSwatch ? colorDisplayName(opt) : opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Gallery({ images, name, badge }: { images: string[]; name: string; badge: string | null }) {
  const [active, setActive] = useState(0);
  const hasImages = images.length > 0;

  return (
    <div className="lg:sticky lg:top-20">
      <div className="group relative aspect-square max-w-md mx-auto lg:max-w-none overflow-hidden rounded-lg border border-brand-navy/15 bg-brand-surface">
        {badge && (
          <span className="absolute left-2.5 top-2.5 z-10 rounded bg-brand-navy px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-xs max-w-[70%] truncate">
            {badge}
          </span>
        )}
        {hasImages ? (
          <img
            src={images[active]}
            alt={name}
            className="h-full w-full object-contain p-2 transition-transform duration-300 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center">
            <Package className="h-12 w-12 text-brand-navy/15 shrink-0" />
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActive((a) => (a - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-brand-navy/20 bg-white/90 text-brand-navy backdrop-blur-xs transition-colors hover:bg-brand-navy hover:text-white"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setActive((a) => (a + 1) % images.length)}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-brand-navy/20 bg-white/90 text-brand-navy backdrop-blur-xs transition-colors hover:bg-brand-navy hover:text-white"
              aria-label="Next image"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            <span className="absolute bottom-2 right-2 rounded bg-brand-navy/80 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-white">
              {active + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar justify-center lg:justify-start">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`h-11 w-11 shrink-0 overflow-hidden rounded border transition-all ${
                i === active
                  ? "border-brand-orange shadow-xs"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={img} alt={`${name} thumbnail ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VariantStockTable({ variants }: { variants: Variant[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-brand-navy/15">
      <div className="bg-brand-surface px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-brand-navy/60">
        Available Options & Stock
      </div>
      <ul className="divide-y divide-brand-navy/8 max-h-36 overflow-y-auto">
        {variants.map((v) => {
          const out = v.stock_qty <= 0;
          const low = !out && v.stock_qty <= v.low_stock_at;
          return (
            <li key={v.id} className="flex items-center justify-between px-3 py-1.5 text-xs hover:bg-brand-surface/60">
              <span className="flex items-center gap-1.5 font-medium text-brand-navy truncate pr-2">
                {v.color && <Swatch raw={v.color} size={10} />}
                <span className="truncate">
                  {[v.color ? colorDisplayName(v.color) : null, v.size].filter(Boolean).join(" · ") || "Standard"}
                </span>
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold shrink-0 ${
                out ? "text-brand-navy/40" : low ? "text-brand-orange" : "text-green-600"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${out ? "bg-brand-navy/30" : low ? "bg-brand-orange" : "bg-green-500"}`} />
                {out ? "Out of stock" : low ? `Low (${v.stock_qty})` : `In stock (${v.stock_qty})`}
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
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="grid h-7 w-7 place-items-center rounded-md border border-brand-navy/12 bg-brand-surface shrink-0">
        <Icon className="h-3.5 w-3.5 text-brand-orange shrink-0" />
      </span>
      <span className="text-[10px] font-bold leading-tight text-brand-navy/75 wrap-break-word">{label}</span>
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
    <div className="mt-8 sm:mt-10">
      <div className="flex gap-1 overflow-x-auto border-b border-brand-navy/10 pb-px no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
              tab === t.key ? "border-brand-orange text-brand-navy" : "border-transparent text-brand-navy/45 hover:text-brand-navy"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="py-4">
        {tab === "description" && (
          <div className="max-w-2xl whitespace-pre-line text-xs sm:text-sm leading-relaxed text-brand-navy/75 wrap-break-wordword">
            {product.long_description || product.short_description || "No detailed description available."}
          </div>
        )}

        {tab === "specs" && (
          specs.length > 0 ? (
            <div className="max-w-xl overflow-hidden rounded-lg border border-brand-navy/15">
              <dl className="divide-y divide-brand-navy/8">
                {specs.map((s, i) => {
                  const label = s.label ?? s.name ?? "";
                  return (
                    <div
                      key={i}
                      className="grid gap-1 px-3 py-2 hover:bg-brand-surface/50 sm:grid-cols-[140px_1fr] sm:gap-4 sm:px-4"
                    >
                      <dt className="text-[10px] font-extrabold uppercase text-brand-navy/50 sm:text-xs sm:normal-case sm:text-brand-navy wrap-break-word">
                        {label}
                      </dt>
                      <dd className="text-xs leading-relaxed text-brand-navy/75 wrap-break-word">
                        {s.value}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ) : (
            <p className="text-xs text-brand-navy/50">No specifications listed for this product.</p>
          )
        )}

        {tab === "reviews" && (
          reviews.length > 0 ? (
            <ul className="max-w-xl space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="border-b border-brand-navy/8 pb-3 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-brand-navy truncate block">{r.author_name}</span>
                      {r.author_role && <span className="text-[10px] text-brand-navy/45 truncate block">{r.author_role}</span>}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-brand-orange text-brand-orange" : "text-brand-navy/20"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-brand-navy/70 wrap-break-word">{r.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-brand-navy/50">No reviews yet.</p>
          )
        )}
      </div>
    </div>
  );
}