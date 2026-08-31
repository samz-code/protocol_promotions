import { useState, useEffect, useMemo, useRef, useDeferredValue, createContext, useContext } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Preloader, shouldSplash } from "@/components/site/Preloader";
import { useCmsBlocks, getCmsString } from "@/lib/cms";
import {
  ArrowRight,
  Star,
  Building2,
  GraduationCap,
  Stethoscope,
  Church,
  Globe,
  Building,
  Hotel,
  Utensils,
  HardHat,
  Factory,
  CalendarDays,
  Trophy,
  Flame,
  Layers,
  Scissors,
  Sparkles,
  Paintbrush,
  FileSignature,
  Truck,
  PackageCheck,
  ClipboardList,
  Loader2,
  ChevronUp,
  ChevronDown,
  Printer,
  Presentation,
  Palette,
  Package,
  Gift,
  Shirt,
  ShoppingCart,
  Check,
  X,
  Plus,
  Minus,
  ShoppingBag,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  component: Index,
});

/* ================================================================
   Cart State Management & Drawer Context (Shopify Style)
   ================================================================ */

export type CartItem = {
  product: LiveProduct;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (product: LiveProduct, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  totalItems: number;
  subtotal: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("app_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("app_cart", JSON.stringify(items));
    } catch {
      // Storage failure silent handling
    }
  }, [items]);

  const addItem = (product: LiveProduct, quantity = 1) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity,
        };
        return next;
      }
      return [...prev, { product, quantity: Math.max(quantity, product.moq || 1) }];
    });
    setIsOpen(true);
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        isOpen,
        openCart,
        closeCart,
        totalItems,
        subtotal,
      }}
    >
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

/* ================================================================
   Shopify-Style Slide-over Cart Drawer Component
   ================================================================ */

function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, subtotal, totalItems } = useCart();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="relative z-50">
      <div
        className="fixed inset-0 bg-brand-navy/60 backdrop-blur-xs transition-opacity"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md border-l border-brand-navy/15 bg-white shadow-2xl flex flex-col">
          <div className="flex items-center justify-between border-b border-brand-navy/10 px-6 py-5">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-brand-orange" />
              <h2 className="text-lg font-extrabold text-brand-navy">Your Cart</h2>
              <span className="rounded-full bg-brand-surface px-2.5 py-0.5 text-xs font-bold text-brand-navy">
                {totalItems}
              </span>
            </div>
            <button
              type="button"
              onClick={closeCart}
              className="rounded-lg p-2 text-brand-navy/60 hover:bg-brand-surface hover:text-brand-navy"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <ShoppingBag className="h-16 w-16 stroke-1 text-brand-navy/20" />
                <p className="mt-4 text-base font-bold text-brand-navy">Your cart is empty</p>
                <p className="mt-1 text-xs text-brand-navy/60">
                  Add items to your cart to see them listed here.
                </p>
                <button
                  type="button"
                  onClick={closeCart}
                  className="mt-6 border border-brand-navy bg-brand-navy px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-brand-orange hover:border-brand-orange"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className="divide-y divide-brand-navy/10">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex gap-4 py-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-brand-navy/10 bg-brand-surface p-1">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <div className="flex justify-between text-sm font-bold text-brand-navy">
                          <h3 className="line-clamp-1">{product.name}</h3>
                          <p className="ml-2 tabular-nums">{KSH.format(product.price * quantity)}</p>
                        </div>
                        <p className="mt-0.5 text-[11px] text-brand-navy/50">{product.category}</p>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center rounded-lg border border-brand-navy/15 bg-white">
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            className="p-1.5 text-brand-navy hover:text-brand-orange"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center font-bold tabular-nums text-brand-navy">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                            className="p-1.5 text-brand-navy hover:text-brand-orange"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(product.id)}
                          className="font-bold text-red-600 hover:underline text-[11px]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t border-brand-navy/10 bg-brand-surface p-6">
              <div className="flex justify-between text-base font-extrabold text-brand-navy">
                <p>Subtotal</p>
                <p className="tabular-nums">{KSH.format(subtotal)}</p>
              </div>
              <p className="mt-1 text-xs text-brand-navy/60">
                Taxes, artwork setup, and shipping calculated at checkout.
              </p>
              <div className="mt-6 space-y-2">
                <Link
                  to="/checkout"
                  onClick={closeCart}
                  className="flex w-full items-center justify-center bg-brand-navy py-4 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-brand-orange"
                >
                  Checkout
                </Link>
                <button
                  type="button"
                  onClick={closeCart}
                  className="w-full text-center text-xs font-bold uppercase tracking-wider text-brand-navy/70 hover:underline py-2"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Main Application Entry Point
   ================================================================ */

function Index() {
  const [ready, setReady] = useState(() => !shouldSplash());

  useNewestProducts(48);

  return (
    <CartProvider>
      <Preloader onDone={() => setReady(true)} />

      {ready ? (
        <SiteLayout>
          <MotionStyles />
          <Statement />
          <Showcase />
          <FeaturedProducts />
          <Bestsellers />
          <Techniques />
          <Process />
          <Argument />
          <Sectors />
          <Reviews />
          <LogoMarquee />
          <Close />
        </SiteLayout>
      ) : null}
    </CartProvider>
  );
}

/* ================================================================
   Shared & Global Configurations
   ================================================================ */

const LOGOS = ["monawanka.png", "protocol.png", "kazilab.png", "safaricom.png", "Samsung.png"];

const HERO_STATS: { value: string; label: string }[] = [];

const KSH = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function placeholder(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/900`;
}

/* ================================================================
   Live products
   ================================================================ */

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

async function fetchNewestProducts(limit: number): Promise<LiveProduct[]> {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, slug, price, compare_at_price, moq, lead_time, badge, is_featured, images, category_id")
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
    const tag: LiveProduct["tag"] | undefined =
      badge.includes("best") ? "Bestseller"
      : badge.includes("new") ? "New"
      : badge.includes("fast") || badge.includes("track") ? "Fast track"
      : p.is_featured ? "Bestseller"
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

function useNewestProducts(limit: number) {
  return useQuery({
    queryKey: ["home", "newest-products", limit],
    queryFn: () => fetchNewestProducts(limit),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/* ================================================================
   Global animation layer
   ================================================================ */

function MotionStyles() {
  return (
    <style>{`
      @keyframes ppDotDrift {
        0%   { background-position: 0 0; }
        100% { background-position: 28px 28px; }
      }
      @keyframes ppDotPulse {
        0%, 100% { opacity: 0.08; }
        30%      { opacity: 0.16; }
      }
      @keyframes ppSweep {
        0%   { transform: translateX(-120%); }
        100% { transform: translateX(220%); }
      }
      @keyframes ppRise {
        from { opacity: 0; transform: translate3d(0, 22px, 0); }
        to   { opacity: 1; transform: translate3d(0, 0, 0); }
      }
      @keyframes ppMarquee {
        from { transform: translateX(0); }
        to   { transform: translateX(-50%); }
      }
      @keyframes ppTicker {
        0%, 100% { opacity: 1; }
        30%      { opacity: 0.35; }
      }

      .pp-dots {
        background-image:
          radial-gradient(var(--color-brand-navy) 1.15px, transparent 1.15px);
        background-size: 28px 28px;
        background-position: 0 0;
        opacity: 0.1;
        animation: ppDotDrift 22s linear infinite, ppDotPulse 9s ease-in-out infinite;
      }
      .pp-dots-light {
        background-image:
          radial-gradient(rgba(255,255,255,0.9) 1.2px, transparent 1.2px);
        background-size: 30px 30px;
        background-position: 0 0;
        opacity: 0.12;
        animation: ppDotDrift 26s linear infinite reverse, ppDotPulse 11s ease-in-out infinite;
      }
      .pp-mask-fade {
        -webkit-mask-image: radial-gradient(ellipse 90% 75% at 30% 40%, #000 30%, transparent 78%);
        mask-image: radial-gradient(ellipse 90% 75% at 30% 40%, #000 30%, transparent 78%);
      }
      .pp-mask-fade-center {
        -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, #000 25%, transparent 80%);
        mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, #000 25%, transparent 80%);
      }
      .pp-rise { opacity: 0; }
      .pp-rise.pp-in { animation: ppRise 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

      .pp-sheen { position: relative; overflow: hidden; }
      .pp-sheen::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 45%;
        height: 100%;
        background: linear-gradient(100deg, transparent, rgba(255,255,255,0.42), transparent);
        transform: translateX(-120%);
        pointer-events: none;
      }
      .pp-sheen:hover::after { animation: ppSweep 0.9s ease-out; }

      .pp-track { animation: ppMarquee var(--pp-speed, 45s) linear infinite; }
      .pp-track:hover { animation-play-state: paused; }

      .pp-ticker-dot { animation: ppTicker 1.8s ease-in-out infinite; }

      .pp-underline {
        background-image: linear-gradient(var(--color-brand-orange), var(--color-brand-orange));
        background-repeat: no-repeat;
        background-position: 0 100%;
        background-size: 0% 2px;
        transition: background-size 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .pp-underline:hover { background-size: 100% 2px; }

      @media (prefers-reduced-motion: reduce) {
        .pp-dots,
        .pp-dots-light,
        .pp-track,
        .pp-ticker-dot { animation: none !important; }
        .pp-sheen:hover::after { animation: none !important; }
        .pp-rise { opacity: 1 !important; }
        .pp-rise.pp-in { animation: none !important; }
      }
    `}</style>
  );
}

/* ================================================================
   Scroll reveal
   ================================================================ */

function useReveal<T extends HTMLElement>(options?: { delay?: number }) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const show = () => {
      if (options?.delay) el.style.animationDelay = `${options.delay}ms`;
      el.classList.add("pp-in");
    };

    if (typeof IntersectionObserver === "undefined") {
      show();
      return;
    }

    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      show();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            show();
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [options?.delay]);

  return ref;
}

function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const ref = useReveal<HTMLDivElement>({ delay });
  return (
    <Tag ref={ref as never} className={`pp-rise ${className}`}>
      {children}
    </Tag>
  );
}

/* ================================================================
   Shared section heading
   ================================================================ */

function SectionHeading({
  eyebrow,
  title,
  action,
  tone = "dark",
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
  tone?: "dark" | "light";
}) {
  const light = tone === "light";
  return (
    <div
      className={`flex flex-wrap items-end justify-between gap-4 border-b pb-5 sm:gap-6 ${
        light ? "border-white/20" : "border-brand-navy/12"
      }`}
    >
      <div>
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-brand-orange">
          <span className="pp-ticker-dot inline-block h-1.5 w-1.5 bg-brand-orange" />
          {eyebrow}
        </p>
        <h2
          className={`mt-2.5 text-2xl font-extrabold tracking-tight sm:text-3xl md:text-[2.6rem] md:leading-[1.08] ${
            light ? "text-white" : "text-brand-navy"
          }`}
        >
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

/* ================================================================
   Dotted / grid backdrops
   ================================================================ */

function PressGrid() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage:
          "linear-gradient(var(--color-brand-navy) 1px, transparent 1px), linear-gradient(90deg, var(--color-brand-navy) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    />
  );
}

function DotField({
  variant = "dark",
  className = "",
}: {
  variant?: "dark" | "light";
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${
        variant === "light" ? "pp-dots-light" : "pp-dots"
      } ${className}`}
    />
  );
}

/* ================================================================
   Logo marquee
   ================================================================ */

function LogoMarquee() {
  return (
    <div className="relative w-full overflow-hidden border-y border-brand-navy/12 bg-white py-12">
      <div className="pointer-events-none absolute inset-0 opacity-[0.55]">
        <DotField className="pp-mask-fade-center opacity-30" />
      </div>

      <p className="relative mb-18 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-brand-navy/35">
        Trusted by industry leaders
      </p>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-linear-to-r from-white to-transparent sm:w-28" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l from-white to-transparent sm:w-28" />

        <div
          className="pp-track flex w-max gap-16 px-8"
          style={{ ["--pp-speed" as string]: "34s" }}
        >
          {[...LOGOS, ...LOGOS].map((fileName, i) => (
            <div
              key={i}
              className="flex h-16 w-36 shrink-0 items-center justify-center sm:h-20 sm:w-48"
            >
              <img
                src={`/${fileName}`}
                alt="Client logo"
                loading="lazy"
                decoding="async"
                className="max-h-full w-auto object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const OFFERINGS = [
  {
    icon: Printer,
    title: "Commercial Print & Stationery",
    desc: "Luxury business cards, spot UV varnish, foil stamping, booklets, catalog design, and letterheads.",
    color: "bg-[#00a7a7]",
  },
  {
    icon: Shirt,
    title: "Apparel & Custom Uniforms",
    desc: "High-density embroidery, direct-to-film (DTF), screen printing, and sublimation on workwear & tees.",
    color: "bg-[#de166a]",
  },
  {
    icon: Building2,
    title: "Large Format & Signage",
    desc: "Architectural 3D acrylic lettering, vinyl wall wraps, vehicle branding, and weatherproof outdoor banners.",
    color: "bg-[#f78e1f]",
  },
  {
    icon: Presentation,
    title: "Trade Show & Event Displays",
    desc: "Tension fabric media walls, roll-up pop banners, custom teardrop flags, and modular exhibition booths.",
    color: "bg-[#783190]",
  },
  {
    icon: Package,
    title: "Bespoke Packaging & Boxes",
    desc: "Rigid magnetic boxes, eco-friendly kraft packaging, stand-up pouches, and custom product sleeves.",
    color: "bg-[#00a7a7]",
  },
  {
    icon: Gift,
    title: "Executive Gifts & Merch",
    desc: "Branded drinkware, stainless tumblers, leather notebooks, tech accessories, and welcome kits.",
    color: "bg-[#f78e1f]",
  },
  {
    icon: Palette,
    title: "Prepress & Vector Redraws",
    desc: "Artwork vectorization, Pantone match proofing, file preflight checks, and identity creative direction.",
    color: "bg-[#783190]",
  },
  {
    icon: Sparkles,
    title: "Specialty Finishing & Cut",
    desc: "Laser cutting, embossing, soft-touch lamination, custom die-cutting, and edge gilding.",
    color: "bg-[#de166a]",
  },
] as const;

export function OfferingsFlip() {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const DURATION = 3200;

  useEffect(() => {
    if (isPaused) return;

    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % OFFERINGS.length);
    }, DURATION);

    return () => window.clearInterval(id);
  }, [isPaused]);

  return (
    <div className="mt-8 max-w-xl">
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="group relative min-h-26 overflow-hidden rounded-4xl border border-slate-200/80 bg-white/90 backdrop-blur-md shadow-[0_12px_32px_rgba(8,28,78,0.08)] transition-all duration-300 hover:border-slate-300 hover:shadow-[0_16px_40px_rgba(8,28,78,0.14)] sm:min-h-28"
      >
        {OFFERINGS.map((offer, index) => {
          const OfferIcon = offer.icon;
          const isActive = index === active;

          return (
            <div
              key={`${offer.title}-${index}`}
              className={`absolute inset-0 flex items-center gap-3 p-4 transition-all duration-500 ease-out sm:gap-4 sm:p-5 ${
                isActive
                  ? "pointer-events-auto z-10 translate-x-0 opacity-100"
                  : "pointer-events-none z-0 translate-x-2 opacity-0"
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${offer.color} text-white shadow-md sm:h-14 sm:w-14 sm:rounded-2xl`}
              >
                <OfferIcon className="h-5 w-5 stroke-[2.2] sm:h-6 sm:w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-extrabold tracking-tight text-[#783190] sm:text-base">
                  {offer.title}
                </h3>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
                  {offer.desc}
                </p>
              </div>
            </div>
          );
        })}

        {!isPaused && (
          <div
            key={active}
            className="absolute bottom-0 left-0 h-0.5 bg-[#f78e1f]"
            style={{ animation: `shrink ${DURATION}ms linear forwards` }}
          />
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-center gap-1.5 sm:justify-start">
        {OFFERINGS.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Show offering ${i + 1}`}
            onClick={() => setActive(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === active ? "w-5 bg-[#f78e1f]" : "w-1.5 bg-slate-300"
            }`}
          />
        ))}
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

function ProductCardMini({ p }: { p: LiveProduct }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(p);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <Link
      to="/shop/$slug"
      params={{ slug: p.slug }}
      className="group block overflow-hidden rounded-[24px] border border-brand-navy/10 bg-white p-2.5 transition-colors hover:bg-brand-surface"
    >
      <div className="relative aspect-4/5 overflow-hidden rounded-[18px] bg-brand-surface p-2">
        <img
          src={p.image}
          alt={p.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full rounded-[14px] object-contain transition-transform duration-500 group-hover:scale-105"
        />
        {p.tag ? (
          <span className="absolute left-3 top-3 bg-brand-orange px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            {p.tag}
          </span>
        ) : null}
      </div>
      <div className="mt-2.5 min-w-0">
        <p className="line-clamp-1 text-[13px] font-bold text-brand-navy">{p.name}</p>
        <div className="mt-1 flex items-center justify-between gap-1">
          <p className="text-[12px] font-bold text-brand-orange">{KSH.format(p.price)}</p>
          <button
            type="button"
            onClick={handleAddToCart}
            aria-label={`Add ${p.name} to cart`}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all active:scale-95 ${
              added
                ? "bg-emerald-600 text-white"
                : "bg-brand-navy text-white hover:bg-brand-orange"
            }`}
          >
            {added ? <Check className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </Link>
  );
}

function nudgeProductRail(el: HTMLDivElement | null, delta: number) {
  if (!el) return;

  const maxScroll = Math.max(el.scrollHeight - el.clientHeight, 0);
  const next = Math.min(Math.max(el.scrollTop + delta, 0), maxScroll);

  el.scrollTo({ top: next, behavior: "smooth" });
}

function ProductsRail() {
  const { data, isLoading } = useNewestProducts(70);
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedUntilRef = useRef(0);

  const products = data ?? [];
  const ready = products.length > 0;
  const items = ready ? [...products, ...products] : [];

  useEffect(() => {
    const el = trackRef.current;
    if (!el || !ready) return;

    const half = el.scrollHeight / 2;
    el.scrollTop = half;

    const targetDuration = 160;
    const speed = Math.max(12, half / targetDuration);

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      if (half > 0 && now >= pausedUntilRef.current) {
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

  return (
    <div
      className="relative overflow-hidden bg-white"
      onWheel={(event) => {
        event.preventDefault();
        handleNudge(event.deltaY > 0 ? 160 : -160);
      }}
    >
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
              <div key={i} className="h-24 animate-pulse bg-brand-surface" />
            ))}
          </div>
        ) : !ready ? (
          <p className="p-5 text-sm font-semibold text-brand-navy/60">
            No products published yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-3">
            {items.map((p, i) => (
              <ProductCardMini key={`${p.id}-${i}`} p={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Statement() {
  const { data: blocks } = useCmsBlocks([
    "home.hero_badge",
    "home.hero_title",
    "home.hero_description",
    "home.hero_cta_primary",
    "home.hero_cta_secondary",
  ]);

  const heroBadge = getCmsString(blocks, "home.hero_badge", "Nairobi, Kenya");
  const heroTitle = getCmsString(
    blocks,
    "home.hero_title",
    "Premium printing & merchandise, made real."
  );
  const heroDescription = getCmsString(
    blocks,
    "home.hero_description",
    "We deliver branding, custom apparel, and corporate merchandise across East Africa with sharp finishes, clear timelines, and reliable execution."
  );
  const heroPrimary = getCmsString(blocks, "home.hero_cta_primary", "Browse products");
  const heroSecondary = getCmsString(blocks, "home.hero_cta_secondary", "Request a quote");

  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-white">
      <DotField className="pp-mask-fade opacity-70" />

      <div className="container-page relative px-5 py-8 sm:px-6 sm:py-10 md:py-14">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] xl:items-start xl:pt-1">
          <div className="order-1 max-w-2xl xl:order-0 xl:col-start-1 xl:row-start-1">
            <Reveal>
              <p className="inline-flex items-center gap-2 border border-brand-navy/15 bg-white/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-brand-orange backdrop-blur-sm">
                <span className="pp-ticker-dot inline-block h-1.5 w-1.5 bg-brand-orange" />
                {heroBadge}
              </p>
            </Reveal>
          </div>

          <div className="order-2 xl:order-0 xl:col-start-2 xl:row-start-1 xl:row-span-2 xl:pt-2">
            <Reveal delay={280}>
              <ProductsRail />
            </Reveal>
          </div>

          <div className="order-3 max-w-2xl xl:order-0 xl:col-start-1 xl:row-start-2">
            <Reveal delay={90}>
              <h1 className="mt-5 text-[2rem] font-extrabold leading-[1.1] tracking-tight text-brand-navy sm:mt-6 sm:text-5xl md:text-6xl lg:text-[4.25rem]">
                {heroTitle.split("\n").map((line, index) => (
                  <span key={index}>
                    {line}
                    {index < heroTitle.split("\n").length - 1 ? <br /> : null}
                  </span>
                ))}
              </h1>
            </Reveal>

            <Reveal delay={170}>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-brand-blue sm:mt-9 sm:text-lg">
                {heroDescription}
              </p>
            </Reveal>

            <Reveal delay={220}>
              <OfferingsFlip />
            </Reveal>

            <Reveal delay={250}>
              <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-4">
                <Link
                  to="/shop"
                  className="pp-sheen group inline-flex w-full items-center justify-center gap-2 bg-brand-blue px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--color-brand-navy)] sm:w-auto"
                >
                  {heroPrimary}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/request-quote"
                  className="group inline-flex w-full items-center justify-center gap-2 border border-brand-navy px-8 py-4 text-sm font-bold uppercase tracking-wide text-brand-navy transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-orange hover:text-brand-orange sm:w-auto"
                >
                  {heroSecondary}
                  <ArrowRight className="h-4 w-4 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                </Link>
              </div>
            </Reveal>

            {HERO_STATS.length > 0 && (
              <Reveal delay={330}>
                <dl className="mt-10 grid max-w-lg grid-cols-3 border-t border-brand-navy/12 pt-6 sm:mt-12">
                  {HERO_STATS.map((s) => (
                    <div key={s.label} className="pr-4">
                      <dt className="sr-only">{s.label}</dt>
                      <dd className="text-xl font-extrabold tabular-nums text-brand-navy sm:text-2xl">
                        {s.value}
                      </dd>
                      <span className="mt-1 block text-[10px] font-bold uppercase tracking-widest text-brand-navy/45">
                        {s.label}
                      </span>
                    </div>
                  ))}
                </dl>
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Showcase
   ================================================================ */

function Showcase() {
  const { data, isLoading, isError } = useNewestProducts(120);
  const deferredProducts = useDeferredValue(data ?? []);

  const { data: blocks } = useCmsBlocks([
    "home.section_catalogue_eyebrow",
    "home.section_catalogue_title",
  ]);

  const catalogueEyebrow = getCmsString(blocks, "home.section_catalogue_eyebrow", "In the catalogue");
  const catalogueTitle = getCmsString(blocks, "home.section_catalogue_title", "Products we have");

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; slug: string | null; items: LiveProduct[] }>();
    for (const p of deferredProducts) {
      const key = p.category || "Products";
      if (!map.has(key)) {
        map.set(key, { name: key, slug: p.categorySlug, items: [] });
      }
      map.get(key)!.items.push(p);
    }
    return Array.from(map.values());
  }, [deferredProducts]);

  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-white">
      <DotField className="pp-mask-fade-center opacity-25" />

      <div className="container-page relative px-5 py-14 sm:px-6 sm:py-16 md:py-24">
        <Reveal>
          <SectionHeading
            eyebrow={catalogueEyebrow}
            title={catalogueTitle}
            action={
              <Link
                to="/shop"
                className="group inline-flex items-center gap-1.5 text-sm font-bold text-brand-navy transition-colors hover:text-brand-orange"
              >
                <span className="pp-underline">{catalogueTitle}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            }
          />
        </Reveal>

        {isLoading && deferredProducts.length === 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="mt-10 flex items-center gap-3 border border-brand-navy/15 bg-white p-5">
            <Loader2 className="h-4 w-4 text-brand-orange" />
            <p className="text-sm font-semibold text-brand-navy/70">
              Products could not be loaded right now. Please refresh the page.
            </p>
          </div>
        ) : deferredProducts.length === 0 ? (
          <p className="mt-10 text-sm font-semibold text-brand-navy/60">
            No products published yet.
          </p>
        ) : (
          <div className="mt-10 space-y-14 sm:space-y-16">
            {groups.map((group, gi) => (
              <div key={group.name}>
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-brand-navy/12 pb-3">
                  <h3 className="text-lg font-extrabold tracking-tight text-brand-navy sm:text-xl">
                    {group.name}
                  </h3>
                  {group.slug ? (
                    <Link
                      to="/shop"
                      search={{ category: group.slug }}
                      className="group inline-flex items-center gap-1.5 text-[13px] font-bold text-brand-navy/60 transition-colors hover:text-brand-orange"
                    >
                      <span className="pp-underline">Shop {group.name}</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  ) : null}
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
                  {group.items.map((p, i) => (
                    <Reveal key={p.id} delay={gi * 40 + i * 50}>
                      <ProductCard p={p} />
                    </Reveal>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ================================================================
   Featured products & Components
   ================================================================ */

function ProductTag({ label }: { label: "Bestseller" | "New" | "Fast track" }) {
  const tone =
    label === "Bestseller"
      ? "bg-brand-orange text-white"
      : label === "New"
        ? "bg-brand-navy text-white"
        : "border border-brand-navy bg-white text-brand-navy";
  return (
    <span
      className={`absolute left-3 top-3 z-10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest shadow-sm ${tone}`}
    >
      {label}
    </span>
  );
}

function ProductCard({ p }: { p: LiveProduct }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const discount =
    p.compareAt && p.compareAt > p.price
      ? Math.round(((p.compareAt - p.price) / p.compareAt) * 100)
      : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(p);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[22px] border border-brand-navy/15 bg-white p-3 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-brand-navy hover:shadow-[8px_8px_0_0_var(--color-brand-navy)]">
      <Link
        to="/shop/$slug"
        params={{ slug: p.slug }}
        className="pp-sheen relative block overflow-hidden rounded-3xl-brand-surface p-3"
      >
        {p.tag ? <ProductTag label={p.tag} /> : null}
        {discount !== null ? (
          <span className="absolute right-3 top-3 z-10 bg-brand-navy px-2.5 py-1.5 text-[10px] font-bold tabular-nums text-white">
            -{discount}%
          </span>
        ) : null}
        <img
          src={p.image}
          alt={p.name}
          width={800}
          height={800}
          loading="lazy"
          decoding="async"
          className="h-full w-full rounded-2xl object-contain transition-transform duration-500 ease-out group-hover:scale-105"
          style={{ aspectRatio: "4 / 5" }}
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-brand-navy py-2.5 text-center text-[11px] font-bold uppercase tracking-widest text-white transition-transform duration-300 ease-out group-hover:translate-y-0">
          View product
        </span>
      </Link>

      <div className="flex flex-1 flex-col pt-3 px-1.5 pb-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-brand-navy/45">
          {p.category}
        </div>
        <Link
          to="/shop/$slug"
          params={{ slug: p.slug }}
          className="mt-1.5 text-base font-extrabold leading-snug text-brand-navy transition-colors hover:text-brand-orange sm:text-base"
        >
          {p.name}
        </Link>

        <div className="mt-3 flex items-baseline gap-2 sm:mt-4">
          <span className="text-lg font-extrabold tabular-nums text-brand-navy sm:text-lg">
            {KSH.format(p.price)}
          </span>
          {p.compareAt ? (
            <span className="text-sm tabular-nums text-brand-navy/40 line-through">
              {KSH.format(p.compareAt)}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          className={`mt-4 inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all duration-200 active:scale-98 ${
            added
              ? "bg-emerald-600"
              : "bg-brand-navy hover:bg-brand-orange"
          }`}
        >
          {added ? (
            <>
              <Check className="h-4 w-4" />
              Added to Cart
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              Add To Cart
            </>
          )}
        </button>

        <div className="mt-4 flex items-center justify-between border-t border-brand-navy/10 pt-3 text-[11px] font-semibold text-brand-navy/60">
          <span className="tabular-nums">MOQ {p.moq}</span>
          <span className="tabular-nums">{p.lead}</span>
        </div>
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="animate-pulse rounded-[22px] border border-brand-navy/12 bg-white p-3">
      <div className="aspect-4/5 w-full rounded-3xl bg-brand-navy/8" />
      <div className="space-y-3 p-3">
        <div className="h-2 w-1/3 bg-brand-navy/10" />
        <div className="h-4 w-4/5 bg-brand-navy/12" />
        <div className="h-5 w-1/2 bg-brand-navy/10" />
      </div>
    </div>
  );
}

function FeaturedProducts() {
  const { data, isLoading, isError } = useNewestProducts(8);
  const products = data ?? [];

  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-brand-surface">
      <DotField className="pp-mask-fade-center opacity-20" />

      <div className="container-page relative px-5 py-14 sm:px-6 sm:py-16 md:py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Off the shelf"
            title="Ready to brand today"
            action={
              <Link
                to="/shop"
                className="group inline-flex items-center gap-1.5 text-sm font-bold text-brand-navy transition-colors hover:text-brand-orange"
              >
                <span className="pp-underline">See all products</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            }
          />
        </Reveal>

        <Reveal delay={80}>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-brand-navy/70 sm:mt-6 sm:text-base">
            Stocked lines we hold in the Nairobi warehouse. Prices are per unit at the stated
            minimum order quantity, before artwork setup. Volume brackets drop the unit price
            further.
          </p>
        </Reveal>

        {isLoading ? (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="mt-10 flex items-center gap-3 border border-brand-navy/15 bg-white p-5">
            <Loader2 className="h-4 w-4 text-brand-orange" />
            <p className="text-sm font-semibold text-brand-navy/70">
              Products could not be loaded right now. Please refresh the page.
            </p>
          </div>
        ) : products.length === 0 ? (
          <p className="mt-10 text-sm font-semibold text-brand-navy/60">
            No products published yet.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={i * 50}>
                <ProductCard p={p} />
              </Reveal>
            ))}
          </div>
        )}

        <Reveal delay={120}>
          <div className="relative mt-12 flex flex-wrap items-center justify-between gap-6 overflow-hidden border border-brand-navy bg-white p-6 md:p-8">
            <DotField className="opacity-25" />
            <div className="relative">
              <h3 className="text-xl font-extrabold text-brand-navy">
                Need something not listed here?
              </h3>
              <p className="mt-1.5 text-sm text-brand-navy/70">
                We source and brand to spec. Send the item, the quantity and the deadline.
              </p>
            </div>
            <Link
              to="/request-quote"
              className="pp-sheen group relative inline-flex items-center gap-2 bg-brand-orange px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--color-brand-navy)]"
            >
              Request a quote
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================
   Bestsellers
   ================================================================ */

function Bestsellers() {
  const { data } = useNewestProducts(25);
  const { addItem } = useCart();
  const [addedId, setAddedId] = useState<string | null>(null);

  const source = data ?? [];
  const tagged = source.filter((p) => p.tag);
  const picks = tagged.length > 0 ? tagged : source;

  if (picks.length === 0) return null;

  const loop = [...picks, ...picks];

  const handleAddToCart = (e: React.MouseEvent, product: LiveProduct) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 2000);
  };

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="container-page relative px-5 pt-14 sm:px-6 sm:pt-16 md:pt-24">
        <Reveal>
          <SectionHeading
            eyebrow="Moving fastest this quarter"
            title="Bestsellers"
            action={
              <Link
                to="/shop"
                className="group inline-flex items-center gap-1.5 text-sm font-bold text-brand-navy transition-colors hover:text-brand-orange"
              >
                <span className="pp-underline">Shop bestsellers</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            }
          />
        </Reveal>
      </div>

      <div className="relative mt-8 overflow-hidden pb-14 sm:mt-10 sm:pb-16 md:pb-24">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-linear-to-r from-white to-transparent sm:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-linear-to-l from-white to-transparent sm:w-24" />

        <div
          className="pp-track flex w-max gap-5 px-5 hover:paused sm:gap-6 sm:px-6"
          style={{ ["--pp-speed" as string]: `${picks.length * 2.5}s` }}
        >
          {loop.map((b, i) => (
            <div
              key={`${b.id}-${i}`}
              tabIndex={i >= picks.length ? -1 : 0}
              aria-hidden={i >= picks.length}
              className="group flex w-56 shrink-0 flex-col overflow-hidden rounded-4xl border border-brand-navy/12 bg-white p-2.5 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-navy hover:shadow-[8px_8px_0_0_var(--color-brand-orange)] sm:w-64"
            >
              <Link
                to="/shop/$slug"
                params={{ slug: b.slug }}
                className="pp-sheen relative block overflow-hidden rounded-[14px] bg-brand-surface p-2"
              >
                <img
                  src={b.image}
                  alt={b.name}
                  width={800}
                  height={900}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full rounded-[10px] object-contain transition-transform duration-500 ease-out group-hover:scale-105"
                  style={{ aspectRatio: "1 / 1" }}
                />
                {b.tag ? (
                  <span className="absolute left-2 top-2 bg-brand-navy px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-white">
                    {b.tag}
                  </span>
                ) : null}
              </Link>
              <div className="flex flex-1 flex-col p-2.5">
                <Link
                  to="/shop/$slug"
                  params={{ slug: b.slug }}
                  className="text-sm font-extrabold leading-snug text-brand-navy transition-colors group-hover:text-brand-orange"
                >
                  {b.name}
                </Link>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold tabular-nums text-brand-navy">
                    {KSH.format(b.price)}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums text-brand-navy/50">
                    MOQ {b.moq}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleAddToCart(e, b)}
                  className={`mt-3 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white transition-all active:scale-95 ${
                    addedId === b.id
                      ? "bg-emerald-600"
                      : "bg-brand-navy hover:bg-brand-orange"
                  }`}
                >
                  {addedId === b.id ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Added
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Add To Cart
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Techniques
   ================================================================ */

const TECHNIQUES = [
  {
    name: "Screen printing",
    icon: Layers,
    best: "Bulk tees, tote bags, flat cotton",
    detail: "Lowest unit cost above 50 pieces. Up to 6 spot colours per pass.",
  },
  {
    name: "Embroidery",
    icon: Scissors,
    best: "Polos, caps, jackets, uniforms",
    detail: "12-head machine. Digitising included on the first run, never resold as setup.",
  },
  {
    name: "Sublimation",
    icon: Flame,
    best: "Mugs, mousepads, polyester kit",
    detail: "Full-colour photographic output. Permanent, will not peel or crack.",
  },
  {
    name: "UV and DTF printing",
    icon: Sparkles,
    best: "Bottles, pens, hard surfaces",
    detail: "Cures instantly on curved and coated substrates. Small runs stay viable.",
  },
  {
    name: "Laser engraving",
    icon: Paintbrush,
    best: "Awards, flasks, metal gifts",
    detail: "A permanent mark, no ink. The only finish that outlives the product.",
  },
  {
    name: "Large format",
    icon: FileSignature,
    best: "Banners, wraps, shopfronts",
    detail: "Eco-solvent and UV flatbed. Outdoor-rated for three years or more.",
  },
];

function Techniques() {
  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-brand-navy text-white">
      <DotField variant="light" className="pp-mask-fade-center opacity-30" />

      <div className="container-page relative px-5 py-14 sm:px-6 sm:py-16 md:py-24">
        <Reveal>
          <SectionHeading
            tone="light"
            eyebrow="How the brand gets onto the product"
            title="Branding techniques"
            action={
              <Link
                to="/services"
                className="group inline-flex items-center gap-1.5 text-sm font-bold text-white transition-colors hover:text-brand-orange"
              >
                <span className="pp-underline">Capability table</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            }
          />
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-px border border-white/15 bg-white/15 sm:grid-cols-2 lg:grid-cols-3">
          {TECHNIQUES.map((t, i) => {
            const Icon = t.icon;
            return (
              <Reveal key={t.name} delay={i * 70}>
                <div className="group relative flex h-full flex-col gap-4 overflow-hidden bg-brand-navy p-7 transition-colors duration-300 hover:bg-white">
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-0.75 origin-left scale-x-0 bg-brand-orange transition-transform duration-500 group-hover:scale-x-100"
                  />
                  <div className="flex items-start justify-between gap-4">
                    <Icon className="h-6 w-6 text-brand-orange transition-transform duration-300 group-hover:scale-110" />
                    <span className="border border-brand-orange px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-brand-orange">
                      In-house
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-white transition-colors duration-300 group-hover:text-brand-navy">
                    {t.name}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/65 transition-colors duration-300 group-hover:text-brand-navy/75">
                    {t.detail}
                  </p>
                  <div className="mt-auto border-t border-white/15 pt-4 transition-colors duration-300 group-hover:border-brand-navy/15">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 transition-colors duration-300 group-hover:text-brand-navy/45">
                      Best for
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white transition-colors duration-300 group-hover:text-brand-navy">
                      {t.best}
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Process
   ================================================================ */

const STEPS = [
  {
    n: "01",
    icon: ClipboardList,
    title: "Send the brief",
    kicker: "Even a bad photo works",
    body: "Item, quantity, deadline, artwork if you have it. A phone photo of a shirt you liked at someone else's event is a perfectly good starting point-we've built entire jobs off worse.",
    detail: "Reply inside 2 working hours",
  },
  {
    n: "02",
    icon: FileSignature,
    title: "Approve the proof",
    kicker: "The point of no return, deliberately",
    body: "A digital mockup with exact placement, matched colour, and real material-not a stock photo standing in for your job. Until you type back 'approved', nothing moves. That word is the only green light we accept.",
    detail: "Unlimited revisions before sign-off",
  },
  {
    n: "03",
    icon: PackageCheck,
    title: "We produce",
    kicker: "On our floor, not someone else's",
    body: "No broker in the middle marking up a job they didn't make. No subcontractor to blame when a date slips. If something's wrong, the person who can fix it is thirty feet from the machine.",
    detail: "In-house press, embroidery, finishing",
  },
  {
    n: "04",
    icon: Truck,
    title: "Delivered",
    kicker: "Wrong is our bill, not yours",
    body: "Nairobi same-day or next-day. Countrywide by tracked courier. If it lands and doesn't match the proof you signed, we reprint it at our cost-same day we hear about it, no argument required.",
    detail: "Nairobi CBD & environs: same-day",
  },
];

function Process() {
  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-white">
      <DotField className="pp-mask-fade-center opacity-20" />

      <div className="container-page relative px-5 py-14 sm:px-6 sm:py-16 md:py-24">
        <Reveal>
          <div className="border-b-2 border-brand-navy pb-6">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-brand-orange">
              <span className="pp-ticker-dot inline-block h-1.5 w-1.5 bg-brand-orange" />
              Order to delivery
            </p>
            <h2 className="mt-2.5 text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl md:text-[2.6rem] md:leading-[1.08]">
              Four steps. No surprises.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-brand-navy/60">
              Everything that can go wrong on a print job goes wrong between steps-so we made
              the steps hard to skip.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-px border border-brand-navy/15 bg-brand-navy/15 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.n} delay={i * 90}>
                <div className="group relative flex h-full flex-col gap-4 overflow-hidden bg-white p-7 transition-colors duration-300 hover:bg-brand-surface">
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-0.75 origin-left scale-x-0 bg-brand-orange transition-transform duration-500 group-hover:scale-x-100"
                  />
                  <span
                    aria-hidden="true"
                    className="pp-step-connector absolute -right-3 top-11 hidden h-px w-6 bg-brand-navy/15 lg:block"
                  />
                  <div className="flex items-start justify-between">
                    <span className="text-4xl font-extrabold leading-none tabular-nums text-brand-navy/12 transition-colors duration-300 group-hover:text-brand-orange/45">
                      {s.n}
                    </span>
                    <Icon className="h-6 w-6 text-brand-orange transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-brand-navy">{s.title}</h3>
                    <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-orange/80">
                      {s.kicker}
                    </p>
                  </div>
                  <p className="text-sm leading-relaxed text-brand-navy/70">{s.body}</p>
                  <p className="mt-auto border-t border-brand-navy/10 pt-3 text-[11px] font-bold uppercase tracking-wide text-brand-navy/50 transition-colors duration-300 group-hover:text-brand-orange">
                    {s.detail}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Argument
   ================================================================ */

function Argument() {
  return (
    <section className="relative overflow-hidden border-b border-brand-blue bg-brand-blue text-white">
      <DotField variant="light" className="pp-mask-fade opacity-30" />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 top-1/2 hidden -translate-y-1/2 select-none text-[22rem] font-extrabold leading-none text-white/3 lg:block"
      >
        OK
      </span>

      <div className="container-page relative px-5 py-14 sm:px-6 sm:py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,24rem)_1fr] lg:gap-20">
          <Reveal className="lg:sticky lg:top-24 lg:self-start">
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              Nothing enters production
              <span className="text-brand-navy"> without a proof you signed.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/50">
              One word decides whether a machine turns on: <span className="text-white/80 font-semibold">approved</span>.
              We take that seriously enough to build the whole workflow around it.
            </p>
          </Reveal>

          <div className="space-y-6 text-base leading-relaxed text-white/70">
            <Reveal delay={80}>
              <p>
                Every job-a single embroidered polo or a 500-unit corporate rollout-goes out as
                a digital proof before a blade cuts, a needle stitches, or a press touches paper.
                Placement to the millimetre. Colour matched, not guessed at. The actual material,
                not a placeholder. You approve it in writing. A verbal "looks good" doesn't count;
                we've seen too many "looks good"s turn into "that's not what I meant" three days
                later.
              </p>
            </Reveal>
            <Reveal delay={160}>
              <p>
                If what arrives doesn't match what you signed off-wrong placement, wrong shade,
                wrong finish-we reprint it at our cost. No negotiation, no second invoice, no
                "let's meet in the middle." That only works because the proof exists in the first
                place: it's the one moment a mistake costs one mockup instead of five hundred
                finished units.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <p className="border-l-2 border-brand-navy pl-5 font-semibold text-white">
                If your supplied artwork is the problem-low resolution, wrong colour mode, a logo
                that will not survive being shrunk onto a pen-we say so before we run it, in
                writing, with the exact failure mode spelled out. Not a vague "this might not work
                great."
              </p>
            </Reveal>
            <Reveal delay={300}>
              <p>
                A supplier who won't put a reprint guarantee in writing is one who's already budgeted
                for getting it wrong-and budgeted for you paying the difference. We'd rather build
                the correction into the process than negotiate it after the box is already open.
              </p>
            </Reveal>
            <Reveal delay={380}>
              <Link
                to="/services"
                className="group inline-flex items-center gap-2 border-b-2 border-brand-navy pb-1 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:text-brand-orange"
              >
                See the full capability table
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Sectors
   ================================================================ */

const SECTORS = [
  { name: "Corporate", icon: Building2, note: "Branded merch, uniforms, signage rollouts" },
  { name: "Schools", icon: GraduationCap, note: "Sportswear, ID cards, prospectus runs" },
  { name: "Hospitals", icon: Stethoscope, note: "Scrubs, wayfinding, patient forms" },
  { name: "Churches", icon: Church, note: "Event banners, choir robes, bulletins" },
  { name: "NGOs", icon: Globe, note: "Field gear, donor reports, campaign kits" },
  { name: "Government", icon: Building, note: "Compliance-grade signage & stationery" },
  { name: "Hotels", icon: Hotel, note: "Staff uniforms, menus, in-room collateral" },
  { name: "Restaurants", icon: Utensils, note: "Menus, staff apparel, packaging" },
  { name: "Construction", icon: HardHat, note: "Site signage, hi-vis wear, hoarding" },
  { name: "Manufacturing", icon: Factory, note: "Workwear, safety signage, labelling" },
  { name: "Events", icon: CalendarDays, note: "Backdrops, lanyards, 48-hour turnarounds" },
  { name: "Sports clubs", icon: Trophy, note: "Team kits, trophies, sponsor boards" },
];

function Sectors() {
  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-white">
      <DotField className="pp-mask-fade opacity-20" />

      <div className="container-page relative px-5 py-14 sm:px-6 sm:py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-16">
          <Reveal>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-orange">
                Twelve industries, zero copy-paste setups
              </p>
              <h2 className="mt-2.5 text-3xl font-extrabold leading-tight tracking-tight text-brand-navy md:text-4xl">
                Who we print for
              </h2>
              <p className="mt-5 max-w-sm text-base leading-relaxed text-brand-navy/70">
                A hospital's compliance signage and an event's 48-hour backdrop are not the same
                job wearing different colours. We've run corporate accounts long enough to build a
                dedicated setup per sector-not one generic process stretched thin across twelve.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 border-l border-t border-brand-navy/15 sm:grid-cols-3">
            {SECTORS.map((s, i) => {
              const IconComponent = s.icon;
              return (
                <Reveal key={s.name} delay={i * 45}>
                  <Link
                    to="/industries"
                    className="group relative flex h-full flex-col justify-between gap-6 overflow-hidden border-b-2 border-r border-brand-navy/15 px-5 py-6 transition-colors duration-300 hover:bg-brand-navy"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-0.75 origin-left scale-x-0 bg-brand-orange transition-transform duration-500 group-hover:scale-x-100"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute -right-4 -top-4 text-6xl font-extrabold text-brand-navy/4 transition-colors duration-300 group-hover:text-white/5"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <IconComponent className="h-5 w-5 text-brand-orange transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110" />
                    <div>
                      <span className="block text-sm font-bold text-brand-navy transition-colors duration-300 group-hover:text-white">
                        {s.name}
                      </span>
                      <span className="mt-1 block text-[11px] leading-snug text-brand-navy/45 transition-colors duration-300 group-hover:text-white/60">
                        {s.note}
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Reviews
   ================================================================ */

const GOOGLE_REVIEWS_URL =
  "https://www.google.com/maps/place/Protocol+Promotions+Ltd./@-1.2803404,36.8252491,1189m/data=!3m2!1e3!4b1!4m6!3m5!1s0x182f11a67bb07663:0x5b54221b99d2823f!8m2!3d-1.2803404!4d36.8252491?hl=en";

type Review = { name: string; meta: string; body: string };

const REVIEWS: Review[] = [
  {
    name: "Lynn Ngina",
    meta: "1 review",
    body: "Really appreciated the work of the team at Protocol. They are very effective and reliable. They have a great selection of products and merchandise that are delivered with good customer service. Would definitely recommend them.",
  },
  {
    name: "Muthii The Voice",
    meta: "Local Guide, 41 reviews",
    body: "Very resourceful suppliers when it comes to promotional merchandise. Keep at it.",
  },
  {
    name: "Fedinard Kitheka",
    meta: "1 review",
    body: "Unique products, good customer service and quality branding. My all time first priority shop in merchandise and branding.",
  },
  {
    name: "Dane Waithaka",
    meta: "6 reviews",
    body: "Protocol team is very efficient, consistent and observes time frames. They deliver products and branding. Customer care is good. I would recommend them any time of the season.",
  },
  {
    name: "Dynamic Vector",
    meta: "3 reviews",
    body: "High quality products, great customer service. Definitely a one-stop shop for all branding items.",
  },
  {
    name: "Racheal Njeri",
    meta: "1 review",
    body: "Very professional team. If you ever need gift ideas, especially branded items, this is your go-to vendor. They always understand the assignment.",
  },
  {
    name: "John Wakairi",
    meta: "2 reviews",
    body: "Great stuff. Quality branding, up to date technology in practice. Keep up the good work.",
  },
];

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.29 1.5-1.14 2.77-2.4 3.61v3h3.86c2.26-2.09 3.67-5.17 3.67-8.46z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.01C3.26 21.3 7.37 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.7H1.29C.47 8.32 0 10.11 0 12s.47 3.68 1.29 5.3l3.98-3.01z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.7 1.29 6.7l3.98 3.01c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => onChange(n)}
            className="p-0.5"
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                n <= value ? "fill-brand-orange text-brand-orange" : "fill-none text-brand-navy/25"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

function WriteReview({ onSubmit }: { onSubmit: (r: Review & { rating: number }) => void }) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    onSubmit({ name: name.trim(), meta: "New review", body: body.trim(), rating });
    setName("");
    setBody("");
    setRating(5);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-brand-navy/12 bg-white p-5 sm:p-6"
    >
      <h3 className="text-lg font-extrabold text-brand-navy">Write a review</h3>
      <p className="mt-1 text-sm text-brand-navy/55">
        Share your experience working with us.
      </p>

      <div className="mt-4 grid gap-4">
        <div>
          <label htmlFor="reviewer-name" className="mb-1 block text-xs font-bold uppercase tracking-wide text-brand-navy/60">
            Your name
          </label>
          <input
            id="reviewer-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Emoni Samuel"
            className="w-full border border-brand-navy/20 px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-navy"
            required
          />
        </div>

        <div>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-brand-navy/60">
            Rating
          </span>
          <StarPicker value={rating} onChange={setRating} />
        </div>

        <div>
          <label htmlFor="reviewer-body" className="mb-1 block text-xs font-bold uppercase tracking-wide text-brand-navy/60">
            Your review
          </label>
          <textarea
            id="reviewer-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Tell us what you thought..."
            rows={4}
            className="w-full resize-none border border-brand-navy/20 px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-navy"
            required
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 bg-brand-navy px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-orange"
        >
          Submit review
        </button>

        {submitted && (
          <p className="text-sm font-medium text-brand-orange">Thanks-your review was added below!</p>
        )}
      </div>
    </form>
  );
}

function SubmittedReviews({ reviews }: { reviews: (Review & { rating: number })[] }) {
  if (reviews.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-extrabold text-brand-navy">Recently submitted</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {reviews.map((r, i) => {
          const initial = r.name.charAt(0);
          return (
            <figure
              key={`${r.name}-${i}`}
              className="border border-brand-navy/12 bg-white p-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center bg-brand-navy text-sm font-bold uppercase text-white">
                  {initial}
                </div>
                <div>
                  <figcaption className="text-sm font-bold text-brand-navy">{r.name}</figcaption>
                  <div className="text-[11px] text-brand-navy/50">{r.meta}</div>
                </div>
              </div>

              <div className="mt-3 flex gap-0.5 text-brand-orange">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star
                    key={s}
                    className={`h-3.5 w-3.5 ${s < r.rating ? "fill-current" : "fill-none text-brand-navy/25"}`}
                  />
                ))}
              </div>

              <blockquote className="mt-3 text-sm leading-relaxed text-brand-navy/75">
                {r.body}
              </blockquote>
            </figure>
          );
        })}
      </div>
    </div>
  );
}

function Reviews() {
  const [userReviews, setUserReviews] = useState<(Review & { rating: number })[]>([]);

  const loop = [...userReviews, ...REVIEWS, ...userReviews, ...REVIEWS];

  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-brand-surface">
      <DotField className="pp-mask-fade-center opacity-20" />

      <div className="container-page relative px-5 pt-14 sm:px-6 sm:pt-16 md:pt-24">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-navy/12 pb-5 sm:gap-6">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center border border-brand-navy/15 bg-white p-2">
                <GoogleIcon />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl md:text-[2.6rem] md:leading-[1.08]">
                  What clients say on Google
                </h2>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-0.5 text-brand-orange">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-sm font-bold tabular-nums text-brand-navy">5.0</span>
                  <span className="text-sm text-brand-navy/55">verified listing metrics</span>
                </div>
              </div>
            </div>

            <a
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 text-sm font-bold text-brand-navy transition-colors hover:text-brand-orange"
            >
              <span className="pp-underline">Read them on Google</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>
        </Reveal>
      </div>

      <div className="relative mt-8 overflow-hidden pb-14 sm:mt-10 sm:pb-16 md:pb-24">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-linear-to-r from-brand-surface to-transparent sm:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-linear-to-l from-brand-surface to-transparent sm:w-24" />

        <div
          className="pp-track flex w-max gap-4 px-5 sm:gap-5 sm:px-6"
          style={{ ["--pp-speed" as string]: "64s" }}
        >
          {loop.map((r, i) => {
            const initial = r.name.charAt(0);
            return (
              <figure
                key={`${r.name}-${i}`}
                aria-hidden={i >= REVIEWS.length + userReviews.length}
                className="relative w-68 shrink-0 border border-brand-navy/12 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-navy hover:shadow-[8px_8px_0_0_var(--color-brand-navy)] sm:w-80 sm:p-6"
              >
                <div className="absolute right-5 top-5 hidden h-4 w-4 opacity-30 sm:block">
                  <GoogleIcon />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center bg-brand-navy text-sm font-bold uppercase text-white">
                    {initial}
                  </div>
                  <div>
                    <figcaption className="text-sm font-bold text-brand-navy">{r.name}</figcaption>
                    <div className="text-[11px] text-brand-navy/50">{r.meta}</div>
                  </div>
                </div>

                <div className="mt-4 flex gap-0.5 text-brand-orange">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>

                <blockquote className="mt-3 text-sm leading-relaxed text-brand-navy/75">
                  {r.body}
                </blockquote>
              </figure>
            );
          })}
        </div>
      </div>

      <div className="container-page relative px-5 pb-14 sm:px-6 sm:pb-16 md:pb-24">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <WriteReview onSubmit={(r) => setUserReviews((prev) => [r, ...prev])} />
          <SubmittedReviews reviews={userReviews} />
        </div>
      </div>
    </section>
  );
}

function Close() {
  return (
    <section className="relative overflow-hidden bg-brand-blue text-white">
      <PressGrid />
      <DotField variant="light" className="pp-mask-fade-center opacity-35" />

      <div className="container-page relative px-5 py-14 sm:px-6 sm:py-20 md:py-28">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-end">
          <Reveal>
            <div className="text-center lg:text-left">
              <h2 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl">
                Send the brief.
                <br />
                <span className="text-brand-navy">Get a real number.</span>
              </h2>
              <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-white/70 lg:mx-0">
                No discovery call. No qualification form. Tell us what you need made and we come
                back with a price and a date we intend to keep.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="flex flex-wrap justify-center gap-4 lg:justify-end">
              <Link
                to="/request-quote"
                className="pp-sheen group inline-flex items-center gap-2 bg-brand-navy px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_rgba(255,255,255,0.35)]"
              >
                Request a quote
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                to="/shop"
                className="group inline-flex items-center gap-2 border border-white/30 px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-navy hover:text-brand-navy"
              >
                Browse the shop
                <ArrowRight className="h-4 w-4 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}