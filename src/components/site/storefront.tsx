import {
  createContext,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/lib/cart";
import { useCmsBlocks, getCmsString } from "@/lib/cms";

/* ================================================================
   Shared helpers & types
   ================================================================ */

const KSH = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function kes(n: number) {
  return KSH.format(Number(n) || 0);
}

function placeholder(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/800`;
}

export type LiveProduct = {
  id: string;
  name: string;
  slug: string;
  category: string;
  categorySlug: string | null;
  price: number;
  compareAt?: number;
  moq: number;
  lead: string;
  tag?: "Bestseller" | "New" | "Fast track";
  image: string;
};

function firstImage(images: unknown, seedName: string): string {
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "string" && images[0]) {
    return images[0];
  }
  return placeholder(seedName);
}

/* ================================================================
   Live products
   ================================================================ */

async function fetchNewestProducts(limit: number): Promise<LiveProduct[]> {
  const { data: products, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, price, compare_at_price, moq, lead_time, badge, is_featured, images, category_id"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  const rows = products ?? [];

  const categoryIds = Array.from(new Set(rows.map((p: any) => p.category_id).filter(Boolean)));
  const catMap = new Map<string, { name: string; slug: string }>();
  if (categoryIds.length > 0) {
    const { data: cats } = await supabase
      .from("categories")
      .select("id, name, slug")
      .in("id", categoryIds);
    for (const c of cats ?? []) catMap.set(c.id, { name: c.name, slug: c.slug });
  }

  return rows.map((p: any) => {
    const badge = (p.badge ?? "").toLowerCase();
    const tag: LiveProduct["tag"] | undefined = badge.includes("best")
      ? "Bestseller"
      : badge.includes("new")
        ? "New"
        : badge.includes("fast") || badge.includes("track")
          ? "Fast track"
          : p.is_featured
            ? "Bestseller"
            : undefined;

    const cat = p.category_id ? catMap.get(p.category_id) : undefined;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: cat?.name ?? "Products",
      categorySlug: cat?.slug ?? null,
      price: Number(p.price),
      compareAt: p.compare_at_price != null ? Number(p.compare_at_price) : undefined,
      moq: p.moq ?? 1,
      lead: p.lead_time || "3 to 5 days",
      tag,
      image: firstImage(p.images, p.slug ?? p.name),
    };
  });
}

export function useNewestProducts(limit: number) {
  return useQuery({
    queryKey: ["home", "newest-products", limit],
    queryFn: () => fetchNewestProducts(limit),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/* ================================================================
   Cart drawer state (UI only). The cart data itself lives in @/lib/cart
   ================================================================ */

type DrawerContextType = { isOpen: boolean; open: () => void; close: () => void };

const DrawerContext = createContext<DrawerContextType | null>(null);

function useDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error("Storefront components must be rendered inside CartDrawerProvider");
  return ctx;
}

export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo<DrawerContextType>(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [isOpen]
  );

  return (
    <DrawerContext.Provider value={value}>
      {children}
      <CartDrawer />
    </DrawerContext.Provider>
  );
}

/** Adds a product to the real site cart. Returns true when it was added. */
export function useQuickAdd() {
  const { addLine } = useCart();

  return useCallback(
    (p: Pick<LiveProduct, "id" | "name" | "price" | "moq">): boolean => {
      const quantity = Math.max(p.moq || 1, 1);
      addLine({
        productId: p.id,
        name: p.name,
        quantity,
        baseUnitPrice: p.price,
        setupFee: 0,
        totalCost: p.price * quantity,
        configuration: {
          color: "",
          size: "",
          printMethod: "",
          artworkUrl: null,
          customBranding: false,
        },
      });
      return true;
    },
    [addLine]
  );
}

/* ================================================================
   Cart drawer
   ================================================================ */

async function fetchThumbnails(ids: string[]) {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;

  const { data, error } = await supabase.from("products").select("id, images").in("id", ids);
  if (error || !data) return map;

  for (const p of data as any[]) {
    const first = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null;
    if (typeof first === "string" && first) map.set(p.id, first);
  }
  return map;
}

function CartDrawer() {
  const { lines, count, subtotal, removeLine, setLineQty } = useCart();
  const { isOpen, close } = useDrawer();

  const productIds = useMemo(
    () => Array.from(new Set(lines.map((l) => l.productId).filter(Boolean))),
    [lines]
  );

  const { data: thumbs } = useQuery({
    queryKey: ["cart-thumbnails", productIds.join(",")],
    queryFn: () => fetchThumbnails(productIds),
    enabled: isOpen && productIds.length > 0,
  });

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div className="absolute inset-0 bg-brand-navy/50" onClick={close} />

      <aside className="absolute right-2 top-2 flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:right-4 sm:top-4 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)]">
        <header className="flex items-center justify-between border-b border-brand-navy/10 px-6 py-5">
          <h2 className="text-lg font-bold text-brand-navy">
            Cart <span className="font-medium text-brand-navy/50">({count})</span>
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close cart"
            className="rounded-full p-2 text-brand-navy/60 transition-colors hover:bg-brand-surface hover:text-brand-navy"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingBag className="h-12 w-12 stroke-1 text-brand-navy/25" />
              <p className="mt-4 text-base font-semibold text-brand-navy">Your cart is empty</p>
              <button
                type="button"
                onClick={close}
                className="mt-5 rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-orange"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-brand-navy/10">
              {lines.map((line) => {
                const thumb = thumbs?.get(line.productId);
                const { color, size, printMethod } = line.configuration ?? {};
                const specs = [color, size, printMethod].filter(Boolean).join(" · ");
                return (
                  <li key={line.lineId} className="flex gap-4 py-5">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-brand-surface">
                      {thumb ? (
                        <img src={thumb} alt={line.name} className="h-full w-full object-contain p-1" />
                      ) : null}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div className="flex justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-semibold text-brand-navy">
                            {line.name}
                          </p>
                          {specs ? (
                            <p className="mt-0.5 text-xs text-brand-navy/50">{specs}</p>
                          ) : null}
                        </div>
                        <p className="text-sm font-bold tabular-nums text-brand-navy">
                          {kes(line.totalCost)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="inline-flex items-center rounded-full border border-brand-navy/20">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() =>
                              line.quantity <= 1
                                ? removeLine(line.lineId)
                                : setLineQty(line.lineId, line.quantity - 1)
                            }
                            className="p-2 text-brand-navy transition-colors hover:text-brand-orange"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-8 text-center text-sm font-semibold tabular-nums text-brand-navy">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => setLineQty(line.lineId, line.quantity + 1)}
                            className="p-2 text-brand-navy transition-colors hover:text-brand-orange"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(line.lineId)}
                          className="text-xs font-medium text-brand-navy/60 underline underline-offset-2 hover:text-brand-orange"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <footer className="border-t border-brand-navy/10 px-6 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between text-base font-bold text-brand-navy">
              <span>Total</span>
              <span className="tabular-nums">{kes(subtotal)}</span>
            </div>
            <div className="mt-4 grid gap-2">
              <Link
                to="/checkout"
                onClick={close}
                className="flex items-center justify-center rounded-full bg-brand-navy py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange"
              >
                Checkout
              </Link>
              <Link
                to="/cart"
                onClick={close}
                className="flex items-center justify-center rounded-full border border-brand-navy/25 py-3.5 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-navy"
              >
                View cart
              </Link>
            </div>
          </footer>
        )}
      </aside>
    </div>
  );
}

/* ================================================================
   Product card (clean, Shopify-style)
   ================================================================ */

export function QuickAdd({
  product,
  className = "",
  solid = false,
}: {
  product: Pick<LiveProduct, "id" | "name" | "price" | "moq">;
  className?: string;
  solid?: boolean;
}) {
  const quickAdd = useQuickAdd();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 1800);
    return () => window.clearTimeout(t);
  }, [added]);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (quickAdd(product)) setAdded(true);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Add ${product.name} to cart`}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-bold transition-colors ${
        solid ? "px-4 py-2.5" : "px-4 py-2.5"
      } ${
        added
          ? "bg-emerald-600 text-white"
          : solid
            ? "bg-brand-orange text-white hover:bg-brand-navy"
            : "bg-white text-brand-navy shadow-sm ring-1 ring-brand-navy/15 hover:bg-brand-navy hover:text-white"
      } ${className}`}
    >
      {added ? (
        <>
          <Check className="h-4 w-4" /> Added
        </>
      ) : solid ? (
        <>
          <ShoppingCart className="h-4 w-4" /> Add to cart
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" /> Add to cart
        </>
      )}
    </button>
  );
}

function QuickAddIcon({ product }: { product: LiveProduct }) {
  const quickAdd = useQuickAdd();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 1800);
    return () => window.clearTimeout(t);
  }, [added]);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (quickAdd(product)) setAdded(true);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Add ${product.name} to cart`}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95 ${
        added ? "bg-emerald-600 text-white" : "bg-brand-navy text-white hover:bg-brand-orange"
      }`}
    >
      {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
    </button>
  );
}

export function ProductCard({ p }: { p: LiveProduct }) {
  const discount =
    p.compareAt && p.compareAt > p.price
      ? Math.round(((p.compareAt - p.price) / p.compareAt) * 100)
      : null;
  const badge = discount !== null ? `-${discount}%` : (p.tag ?? null);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-navy/10 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-brand-navy/20 hover:shadow-lg">
      <div className="relative overflow-hidden bg-brand-surface">
        <Link
          to="/shop/$slug"
          params={{ slug: p.slug }}
          className="block aspect-square"
          aria-label={p.name}
        >
          <img
            src={p.image}
            alt={p.name}
            width={800}
            height={800}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-[1.04] sm:p-4"
          />
        </Link>

        {badge ? (
          <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-brand-orange px-2.5 py-1 text-xs font-bold text-white shadow-sm sm:left-3 sm:top-3">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="min-w-0">
          <Link
            to="/shop/$slug"
            params={{ slug: p.slug }}
            className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug text-brand-navy transition-colors hover:text-brand-orange sm:text-base"
          >
            {p.name}
          </Link>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-base font-extrabold tabular-nums text-brand-navy sm:text-lg">{kes(p.price)}</span>
            {p.compareAt && p.compareAt > p.price ? (
              <span className="text-xs tabular-nums text-brand-navy/45 line-through sm:text-sm">
                {kes(p.compareAt)}
              </span>
            ) : null}
          </p>
        </div>
        <QuickAdd product={p} solid className="mt-3 w-full" />
      </div>
    </article>
  );
}

function ProductCardMini({ p }: { p: LiveProduct }) {
  return (
    <article className="group">
      <Link
        to="/shop/$slug"
        params={{ slug: p.slug }}
        className="relative block aspect-square overflow-hidden rounded-xl bg-brand-surface"
        aria-label={p.name}
      >
        <img
          src={p.image}
          alt={p.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain p-2.5 transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {p.tag ? (
          <span className="absolute left-2 top-2 rounded-full bg-brand-orange px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
            {p.tag}
          </span>
        ) : null}
      </Link>
      <div className="mt-2 flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <Link
            to="/shop/$slug"
            params={{ slug: p.slug }}
            className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug text-brand-navy transition-colors hover:text-brand-orange"
          >
            {p.name}
          </Link>
          <p className="mt-1 text-sm font-extrabold tabular-nums text-brand-orange">
            {kes(p.price)}
          </p>
        </div>
        <QuickAddIcon product={p} />
      </div>
    </article>
  );
}

function ProductSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square rounded-xl bg-brand-navy/8" />
      <div className="mt-3 h-3.5 w-4/5 rounded bg-brand-navy/10" />
      <div className="mt-2 h-3.5 w-1/3 rounded bg-brand-navy/10" />
    </div>
  );
}

const GRID = "grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-7 md:grid-cols-3 lg:grid-cols-5";

function ProductGrid({ products }: { products: LiveProduct[] }) {
  return (
    <div className={GRID}>
      {products.map((p) => (
        <ProductCard key={p.id} p={p} />
      ))}
    </div>
  );
}

function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className={GRID}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}

function StatusMessage({ children }: { children: ReactNode }) {
  return <p className="py-10 text-sm font-medium text-brand-navy/60">{children}</p>;
}

function SectionHeader({
  title,
  eyebrow,
  linkTo,
  linkLabel,
}: {
  title: string;
  eyebrow?: string;
  linkTo?: "/shop";
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-orange">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
          {title}
        </h2>
      </div>
      {linkTo && linkLabel ? (
        <Link
          to={linkTo}
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-navy underline-offset-4 transition-colors hover:text-brand-orange hover:underline"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      ) : null}
    </div>
  );
}

/* ================================================================
   Hero products rail (vertical auto-scroll, as before)
   ================================================================ */

function nudgeProductRail(el: HTMLDivElement | null, delta: number) {
  if (!el) return;

  const maxScroll = Math.max(el.scrollHeight - el.clientHeight, 0);
  const next = Math.min(Math.max(el.scrollTop + delta, 0), maxScroll);

  el.scrollTo({ top: next, behavior: "smooth" });
}

export function ProductsRail() {
  const { data, isLoading } = useNewestProducts(70);
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedUntilRef = useRef(0);

  const products = data ?? [];
  const ready = products.length > 0;
  const items = ready ? [...products, ...products] : [];

  useEffect(() => {
    const el = trackRef.current;
    if (!el || !ready) return;

    const half = el.scrollHeight / 2;
    if (half <= el.clientHeight) {
      el.scrollTop = 0;
      return;
    }

    el.scrollTop = half;

    const targetDuration = 160;
    const speed = Math.max(12, half / targetDuration);

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      if (now >= pausedUntilRef.current) {
        el.scrollTop += speed * dt;
        if (el.scrollTop >= half) {
          el.scrollTop -= half;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  function pauseAutoScroll(ms = 1800) {
    pausedUntilRef.current = performance.now() + ms;
  }

  function handleNudge(delta: number) {
    pauseAutoScroll();
    nudgeProductRail(trackRef.current, delta);
  }

  // Native non-passive wheel listener so preventDefault works (React's onWheel is passive).
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      pausedUntilRef.current = performance.now() + 1800;
      nudgeProductRail(trackRef.current, event.deltaY > 0 ? 160 : -160);
    };

    wrap.addEventListener("wheel", onWheel, { passive: false });
    return () => wrap.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div ref={wrapRef} className="relative overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => handleNudge(-160)}
        aria-label="Scroll products up"
        className="absolute left-1/2 top-3 z-20 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-brand-navy/15 bg-white text-brand-navy shadow-sm transition-all duration-200 hover:scale-110 hover:border-brand-orange hover:text-brand-orange hover:shadow-md active:scale-95"
      >
        <ChevronUp className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => handleNudge(160)}
        aria-label="Scroll products down"
        className="absolute bottom-3 left-1/2 z-20 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-brand-navy/15 bg-white text-brand-navy shadow-sm transition-all duration-200 hover:scale-110 hover:border-brand-orange hover:text-brand-orange hover:shadow-md active:scale-95"
      >
        <ChevronDown className="h-4 w-4" />
      </button>

      <div
        ref={trackRef}
        className="h-130 overflow-y-hidden sm:h-140 lg:h-155"
        style={{ scrollBehavior: "auto" }}
      >
        {isLoading && !ready ? (
          <div className="grid grid-cols-2 gap-3 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-xl bg-brand-surface" />
            ))}
          </div>
        ) : !ready ? (
          <p className="p-5 text-sm font-semibold text-brand-navy/60">No products published yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 p-3">
            {items.map((p, i) => (
              <ProductCardMini key={`${p.id}-${i}`} p={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Catalogue by category
   ================================================================ */

const PER_CATEGORY = 10;

export function Showcase() {
  const { data, isLoading, isError } = useNewestProducts(120);
  const deferredProducts = useDeferredValue(data ?? []);

  const { data: blocks } = useCmsBlocks([
    "home.section_catalogue_eyebrow",
    "home.section_catalogue_title",
  ]);

  const eyebrow = getCmsString(blocks, "home.section_catalogue_eyebrow", "In the catalogue");
  const title = getCmsString(blocks, "home.section_catalogue_title", "Products we have");

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; slug: string | null; items: LiveProduct[] }>();
    for (const p of deferredProducts) {
      const key = p.category || "Products";
      if (!map.has(key)) map.set(key, { name: key, slug: p.categorySlug, items: [] });
      map.get(key)!.items.push(p);
    }
    return Array.from(map.values());
  }, [deferredProducts]);

  return (
    <section className="border-b border-brand-navy/10 bg-white">
      <div className="mx-auto w-full max-w-360 lg:px-10 px-5 py-12 sm:px-6 md:py-16">
        <SectionHeader eyebrow={eyebrow} title={title} linkTo="/shop" linkLabel="Shop all" />

        {isLoading && deferredProducts.length === 0 ? (
          <SkeletonGrid />
        ) : isError ? (
          <StatusMessage>Products could not be loaded right now. Please refresh the page.</StatusMessage>
        ) : deferredProducts.length === 0 ? (
          <StatusMessage>No products published yet.</StatusMessage>
        ) : (
          <div className="space-y-10">
            {groups.map((group) => (
              <div key={group.name}>
                <div className="mb-5 flex items-baseline justify-between gap-3">
                  <h3 className="text-lg font-bold text-brand-navy">{group.name}</h3>
                  {group.slug ? (
                    <Link
                      to="/shop"
                      search={{ category: group.slug }}
                      className="text-sm font-semibold text-brand-navy/60 underline-offset-4 transition-colors hover:text-brand-orange hover:underline"
                    >
                      View all
                    </Link>
                  ) : null}
                </div>
                <ProductGrid products={group.items.slice(0, PER_CATEGORY)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ================================================================
   Featured products
   ================================================================ */

export function FeaturedProducts() {
  const { data, isLoading, isError } = useNewestProducts(120);
  const products = (data ?? []).slice(0, 10);

  return (
    <section className="border-b border-brand-navy/10 bg-brand-surface">
      <div className="mx-auto w-full max-w-360 lg:px-10 px-5 py-12 sm:px-6 md:py-16">
        <SectionHeader
          eyebrow="Off the shelf"
          title="Ready to brand today"
          linkTo="/shop"
          linkLabel="See all products"
        />
        <p className="-mt-4 mb-8 max-w-2xl text-sm leading-relaxed text-brand-navy/65">
          Stocked lines we hold in the Nairobi warehouse. Prices are per unit at the stated minimum
          order quantity, before artwork setup.
        </p>

        {isLoading ? (
          <SkeletonGrid />
        ) : isError ? (
          <StatusMessage>Products could not be loaded right now. Please refresh the page.</StatusMessage>
        ) : products.length === 0 ? (
          <StatusMessage>No products published yet.</StatusMessage>
        ) : (
          <ProductGrid products={products} />
        )}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-white p-6 md:p-8">
          <div>
            <h3 className="text-lg font-bold text-brand-navy">Need something not listed here?</h3>
            <p className="mt-1 text-sm text-brand-navy/65">
              We source and brand to spec. Send the item, the quantity and the deadline.
            </p>
          </div>
          <Link
            to="/request-quote"
            className="group inline-flex items-center gap-2 rounded-full bg-brand-orange px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-navy"
          >
            Request a quote
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Bestsellers (horizontal auto-scrolling marquee, as before)
   ================================================================ */

export function Bestsellers() {
  const { data } = useNewestProducts(120);

  const source = data ?? [];
  const tagged = source.filter((p) => p.tag);
  const picks = (tagged.length > 0 ? tagged : source).slice(0, 25);

  if (picks.length === 0) return null;

  const loop = [...picks, ...picks];

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto w-full max-w-360 lg:px-10 relative px-5 pt-12 sm:px-6 md:pt-14">
        <SectionHeader
          eyebrow="Moving fastest this quarter"
          title="Bestsellers"
          linkTo="/shop"
          linkLabel="Shop bestsellers"
        />
      </div>

      <div className="relative overflow-hidden pb-12 md:pb-16">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-linear-to-r from-white to-transparent sm:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-linear-to-l from-white to-transparent sm:w-24" />

        <div
          className="pp-track flex w-max gap-5 px-5 sm:gap-6 sm:px-6"
          style={{ ["--pp-speed" as string]: `${picks.length * 2.5}s` }}
        >
          {loop.map((p, i) => (
            <div
              key={`${p.id}-${i}`}
              aria-hidden={i >= picks.length}
              className="w-44 shrink-0 sm:w-56 lg:w-64"
            >
              <ProductCard p={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}