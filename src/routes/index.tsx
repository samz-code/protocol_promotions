import { useState, useEffect, useMemo, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <SiteLayout>
      <MotionStyles />
      <Statement />
      <LogoMarquee />
      <Catalogue />
      <FeaturedProducts />
      <Bestsellers />
      <Techniques />
      <Process />
      <Argument />
      <Sectors />
      <Reviews />
      <Close />
    </SiteLayout>
  );
}

/* ================================================================
   Shared & Global Configurations
   ================================================================ */

// Since files are in /public, we use the root path directly.
const LOGOS = ["monawanka.png", "protocol.png", "kazilab.png", "safaricom.png", "Samsung.png"];

const KSH = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function placeholder(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/800`;
}

/* ================================================================
   Live products (admin-editable, from the database)
   ================================================================ */

type LiveProduct = {
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
  // Products first (no embedded join, so a missing FK relationship can't break it).
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, slug, price, compare_at_price, moq, lead_time, badge, is_featured, images, category_id")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  const rows = products ?? [];

  // Resolve category names in a second, separate query (also join-free).
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
    staleTime: 5 * 60 * 1000,
  });
}

/* ================================================================
   Global animation layer
   Injected once from Index so every section can use the classes.
   ================================================================ */

function MotionStyles() {
  return (
    <style>{`
      @keyframes ppDotDrift {
        0%   { background-position: 0 0; }
        100% { background-position: 28px 28px; }
      }
      @keyframes ppDotPulse {
        0%, 100% { opacity: 0.18; }
        50%      { opacity: 0.42; }
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
        50%      { opacity: 0.35; }
      }

      .pp-dots {
        background-image:
          radial-gradient(var(--color-brand-navy) 1.15px, transparent 1.15px);
        background-size: 28px 28px;
        background-position: 0 0;
        animation: ppDotDrift 22s linear infinite, ppDotPulse 9s ease-in-out infinite;
      }
      .pp-dots-light {
        background-image:
          radial-gradient(rgba(255,255,255,0.9) 1.2px, transparent 1.2px);
        background-size: 30px 30px;
        background-position: 0 0;
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
   IntersectionObserver with a graceful fallback so content is never
   left invisible when the API is missing.
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

      <p className="relative mb-10 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-brand-navy/35">
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
              className="flex h-16 w-36 shrink-0 items-center justify-center opacity-45 grayscale transition-all duration-500 hover:opacity-100 hover:grayscale-0 sm:h-20 sm:w-48"
            >
              <img
                src={`/${fileName}`}
                alt="Client logo"
                loading="lazy"
                className="max-h-full w-auto object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Hero
   ================================================================ */

const HERO_STATS = [
  { value: "1,200+", label: "Jobs delivered" },
  { value: "48 hrs", label: "Fast-track runs" },
  { value: "100%", label: "Proof before print" },
];

function Statement() {
  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-white">
      {/* Animated dotted field, masked so it fades out toward the edges */}
      <DotField className="pp-mask-fade opacity-70" />

      <div className="container-page relative grid items-center gap-10 px-5 py-14 sm:px-6 sm:py-20 md:py-28 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div>
          <Reveal>
            <p className="inline-flex items-center gap-2 border border-brand-navy/15 bg-white/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-brand-orange backdrop-blur-sm">
              <span className="pp-ticker-dot inline-block h-1.5 w-1.5 bg-brand-orange" />
              Nairobi, Kenya
            </p>
          </Reveal>

          <Reveal delay={90}>
            <h1 className="mt-5 text-[2rem] font-extrabold leading-[1.1] tracking-tight text-brand-navy sm:mt-6 sm:text-5xl md:text-6xl lg:text-[4.25rem]">
              Premium printing &amp;
              <br />
              merchandise,
              <br />
              <span className="relative inline-block text-brand-orange">
                made real.
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 h-0.75 w-full origin-left bg-brand-orange/30"
                />
              </span>
            </h1>
          </Reveal>

          <Reveal delay={170}>
            <div className="mt-6 max-w-xl space-y-4 text-base leading-relaxed text-brand-navy/75 sm:mt-9 sm:text-lg">
              <p>
                Get high-quality branding, custom apparel, and corporate merchandise delivered
                across East Africa. We run production on our own advanced equipment to guarantee
                sharp finishes, clear timelines, and flawless execution.
              </p>
            </div>
          </Reveal>

          <Reveal delay={250}>
            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-4">
              <Link
                to="/shop"
                className="pp-sheen group inline-flex w-full items-center justify-center gap-2 bg-brand-navy px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--color-brand-orange)] sm:w-auto"
              >
                Browse products
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                to="/request-quote"
                className="group inline-flex w-full items-center justify-center gap-2 border border-brand-navy px-8 py-4 text-sm font-bold uppercase tracking-wide text-brand-navy transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-orange hover:text-brand-orange sm:w-auto"
              >
                Request a quote
                <ArrowRight className="h-4 w-4 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
              </Link>
            </div>
          </Reveal>

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
        </div>

        <Reveal delay={200}>
          <HeroCarousel />
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================
   Hero carousel
   Rotates through live product photography, falling back to the
   static hero image when the catalogue has none yet.
   ================================================================ */

function HeroCarousel() {
  const { data } = useNewestProducts(20);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides = useMemo(() => {
    const withPhotos = (data ?? []).filter(
      (p) => p.image && !p.image.includes("picsum") && !p.image.includes("placeholder")
    );

    const featured = withPhotos.filter((p) => p.tag);
    const rest = withPhotos.filter((p) => !p.tag);

    const live = [...featured, ...rest].slice(0, 5).map((p) => ({
      src: p.image,
      alt: p.name,
      label: p.name,
      price: p.price as number | null,
    }));

    if (live.length === 0) {
      return [
        {
          src: heroImg,
          alt: "Custom-branded apparel, mugs, tote bags and promotional items produced by Protocol Promotions",
          label: "Premium Quality",
          price: null as number | null,
        },
      ];
    }
    return live;
  }, [data]);

  const count = slides.length;

  useEffect(() => {
    if (paused || count <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), 4500);
    return () => clearInterval(timer);
  }, [paused, count]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [index, count]);

  const go = (next: number) => {
    if (count <= 0) return;
    setIndex(((next % count) + count) % count);
  };

  const active = slides[index] ?? slides[0];

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Offset frame gives the image real depth without a drop shadow */}
      <div
        aria-hidden="true"
        className="absolute -bottom-3 -right-3 hidden h-full w-full border border-brand-navy/25 sm:block"
      />

      <div
        className="relative overflow-hidden border border-brand-navy bg-brand-surface"
        style={{ aspectRatio: "16 / 12" }}
      >
        {slides.map((slide, i) => (
          <img
            key={`${slide.src}-${i}`}
            src={slide.src}
            alt={slide.alt}
            width={1600}
            height={1100}
            loading={i === 0 ? "eager" : "lazy"}
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-900 ease-out ${
              i === index ? "scale-100 opacity-100" : "scale-105 opacity-0"
            }`}
          />
        ))}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center border border-brand-navy bg-white/90 text-brand-navy backdrop-blur-sm transition-all duration-300 hover:bg-brand-navy hover:text-white sm:h-10 sm:w-10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center border border-brand-navy bg-white/90 text-brand-navy backdrop-blur-sm transition-all duration-300 hover:bg-brand-navy hover:text-white sm:h-10 sm:w-10"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-brand-navy/90 px-4 pb-3.5 pt-3.5 backdrop-blur-sm sm:px-5 sm:pb-4 sm:pt-4">
          <div className="flex items-end justify-between gap-3">
            <span className="text-sm font-bold leading-tight text-white sm:text-base">
              {active?.label ?? "Premium Quality"}
            </span>
            {active?.price != null && (
              <span className="shrink-0 bg-brand-orange px-2.5 py-1 text-[11px] font-bold tabular-nums text-white">
                {KSH.format(active.price)}
              </span>
            )}
          </div>

          {count > 1 && (
            <div
              key={index}
              className="mt-3 h-0.5 w-full overflow-hidden bg-white/20"
              aria-hidden="true"
            >
              <div
                className="h-full bg-brand-orange"
                style={{
                  animation: paused ? "none" : "ppSweepBar 4.5s linear forwards",
                  width: paused ? "100%" : undefined,
                }}
              />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes ppSweepBar { from { width: 0%; } to { width: 100%; } }
        @media (prefers-reduced-motion: reduce) {
          [style*="ppSweepBar"] { animation: none !important; width: 100% !important; }
        }
      `}</style>

      {count > 1 && (
        <div className="mt-4 flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to image ${i + 1}`}
              aria-current={i === index}
              className={`h-1.5 transition-all duration-500 ${
                i === index ? "w-8 bg-brand-orange" : "w-3 bg-brand-navy/20 hover:bg-brand-navy/45"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Catalogue
   ================================================================ */

type Line = {
  name: string;
  slug: string;
  what: string;
  from: string;
  min: string;
};

const LINES: Line[] = [
  {
    name: "Apparel",
    slug: "apparel",
    what: "Polos, tees, hoodies, caps, safety wear, staff uniforms",
    from: "KSh 550",
    min: "10 units",
  },
  {
    name: "Printing",
    slug: "printing",
    what: "Cards, flyers, brochures, calendars, receipt books, posters",
    from: "KSh 1,500",
    min: "1 unit",
  },
  {
    name: "Signage",
    slug: "signage",
    what: "Roll-ups, PVC boards, acrylic, shopfronts, vehicle wraps",
    from: "KSh 3,200",
    min: "1 unit",
  },
  {
    name: "Promotional items",
    slug: "promotional-items",
    what: "Pens, mugs, bottles, lanyards, notebooks, gift sets",
    from: "KSh 350",
    min: "12 units",
  },
  {
    name: "Packaging",
    slug: "packaging",
    what: "Boxes, shopping bags, paper bags, labels, stickers",
    from: "KSh 40",
    min: "50 units",
  },
  {
    name: "Corporate gifts",
    slug: "corporate-gifts",
    what: "Engraved awards, executive sets, curated client gifting",
    from: "KSh 950",
    min: "10 units",
  },
];

function Catalogue() {
  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-white">
      <DotField className="pp-mask-fade-center opacity-25" />

      <div className="container-page relative px-5 py-14 sm:px-6 sm:py-16 md:py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Production lines"
            title="What we make"
            action={
              <Link
                to="/shop"
                className="group inline-flex items-center gap-1.5 text-sm font-bold text-brand-navy transition-colors hover:text-brand-orange"
              >
                <span className="pp-underline">Full catalogue</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            }
          />
        </Reveal>

        <div className="hidden lg:block">
          <div className="mt-2 w-full text-left">
            <div className="grid grid-cols-[22%_44%_13%_13%_8%] border-b border-brand-navy/20 px-6 py-4">
              {["Line", "Covers", "From", "Min order"].map((h) => (
                <div
                  key={h}
                  className="text-[11px] font-bold uppercase tracking-widest text-brand-navy/45"
                >
                  {h}
                </div>
              ))}
              <div />
            </div>

            <div className="divide-y divide-brand-navy/10">
              {LINES.map((l, i) => (
                <Reveal key={l.slug} delay={i * 60}>
                  <div className="group relative grid grid-cols-[22%_44%_13%_13%_8%] items-center px-6 py-5 transition-colors duration-300 hover:bg-brand-navy hover:text-white">
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-0 h-full w-0.75 origin-top scale-y-0 bg-brand-orange transition-transform duration-300 group-hover:scale-y-100"
                    />
                    <div>
                      <Link
                        to="/shop"
                        search={{ category: l.slug }}
                        className="text-base font-extrabold text-brand-navy transition-colors duration-300 group-hover:text-white"
                      >
                        {l.name}
                      </Link>
                    </div>
                    <div className="text-sm leading-relaxed text-brand-navy/70 transition-colors duration-300 group-hover:text-white/80">
                      {l.what}
                    </div>
                    <div className="text-sm font-bold tabular-nums text-brand-navy transition-colors duration-300 group-hover:text-brand-orange">
                      {l.from}
                    </div>
                    <div className="text-sm font-bold tabular-nums text-brand-navy transition-colors duration-300 group-hover:text-white">
                      {l.min}
                    </div>
                    <div className="text-right">
                      <Link to="/shop" search={{ category: l.slug }} aria-label={`Shop ${l.name}`}>
                        <ArrowRight className="ml-auto h-4 w-4 text-brand-navy/30 transition-all duration-300 group-hover:translate-x-1 group-hover:text-brand-orange" />
                      </Link>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:hidden">
          {LINES.map((l, i) => (
            <Reveal key={l.slug} delay={i * 50}>
              <Link
                to="/shop"
                search={{ category: l.slug }}
                className="group relative block border-b border-brand-navy/15 py-6 transition-colors duration-300 hover:bg-brand-surface"
              >
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 h-full w-0.75 origin-top scale-y-0 bg-brand-orange transition-transform duration-300 group-hover:scale-y-100"
                />
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-extrabold text-brand-navy transition-colors group-hover:text-brand-orange">
                    {l.name}
                  </h3>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-brand-navy/30 transition-all duration-300 group-hover:translate-x-1 group-hover:text-brand-orange" />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-brand-navy/70">{l.what}</p>
                <div className="mt-4 flex gap-8">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-brand-navy/45">
                      From
                    </div>
                    <div className="mt-0.5 text-sm font-bold tabular-nums text-brand-orange">
                      {l.from}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-brand-navy/45">
                      Min order
                    </div>
                    <div className="mt-0.5 text-sm font-bold tabular-nums text-brand-navy">
                      {l.min}
                    </div>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   Featured products
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
      className={`absolute left-0 top-0 z-10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${tone}`}
    >
      {label}
    </span>
  );
}

function ProductCard({ p }: { p: LiveProduct }) {
  const discount =
    p.compareAt && p.compareAt > p.price
      ? Math.round(((p.compareAt - p.price) / p.compareAt) * 100)
      : null;

  return (
    <Link
      to="/shop/$slug"
      params={{ slug: p.slug }}
      className="group relative flex flex-col border border-brand-navy/15 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-brand-navy hover:shadow-[8px_8px_0_0_var(--color-brand-navy)]"
    >
      <div className="pp-sheen relative overflow-hidden border-b border-brand-navy/15 bg-brand-surface">
        {p.tag ? <ProductTag label={p.tag} /> : null}
        {discount !== null ? (
          <span className="absolute right-0 top-0 z-10 bg-brand-navy px-2.5 py-1.5 text-[10px] font-bold tabular-nums text-white">
            -{discount}%
          </span>
        ) : null}
        <img
          src={p.image}
          alt={p.name}
          width={800}
          height={800}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
          style={{ aspectRatio: "1 / 1" }}
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-brand-navy py-2.5 text-center text-[11px] font-bold uppercase tracking-widest text-white transition-transform duration-300 group-hover:translate-y-0">
          View product
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-brand-navy/45">
          {p.category}
        </div>
        <h3 className="mt-1.5 text-base font-extrabold leading-snug text-brand-navy transition-colors group-hover:text-brand-orange">
          {p.name}
        </h3>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-lg font-extrabold tabular-nums text-brand-navy">
            {KSH.format(p.price)}
          </span>
          {p.compareAt ? (
            <span className="text-sm tabular-nums text-brand-navy/40 line-through">
              {KSH.format(p.compareAt)}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-brand-navy/10 pt-3 text-[11px] font-semibold text-brand-navy/60">
          <span className="tabular-nums">MOQ {p.moq}</span>
          <span className="tabular-nums">{p.lead}</span>
        </div>
      </div>
    </Link>
  );
}

function ProductSkeleton() {
  return (
    <div className="animate-pulse border border-brand-navy/12 bg-white">
      <div className="aspect-square w-full bg-brand-navy/8" />
      <div className="space-y-3 p-5">
        <div className="h-2 w-1/3 bg-brand-navy/10" />
        <div className="h-3 w-4/5 bg-brand-navy/12" />
        <div className="h-4 w-1/2 bg-brand-navy/10" />
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
          <div className="mt-8 grid grid-cols-1 gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
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
          <div className="mt-8 grid grid-cols-1 gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={i * 70}>
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
  const { data } = useNewestProducts(12);
  const source = data ?? [];
  const tagged = source.filter((p) => p.tag);
  const picks = (tagged.length > 0 ? tagged : source).slice(0, 8);

  if (picks.length === 0) return null;

  const loop = [...picks, ...picks];

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
          className="pp-track flex w-max gap-5 px-5 sm:gap-6 sm:px-6"
          style={{ ["--pp-speed" as string]: "48s" }}
        >
          {loop.map((b, i) => (
            <Link
              key={`${b.id}-${i}`}
              to="/shop/$slug"
              params={{ slug: b.slug }}
              tabIndex={i >= picks.length ? -1 : 0}
              aria-hidden={i >= picks.length}
              className="group w-56 shrink-0 overflow-hidden border border-brand-navy/12 bg-white transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-navy hover:shadow-[8px_8px_0_0_var(--color-brand-orange)] sm:w-64"
            >
              <div className="pp-sheen relative overflow-hidden border-b border-brand-navy/12 bg-brand-surface">
                <img
                  src={b.image}
                  alt={b.name}
                  width={600}
                  height={600}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
                  style={{ aspectRatio: "1 / 1" }}
                />
                {b.tag ? (
                  <span className="absolute left-0 top-0 bg-brand-navy px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-white">
                    {b.tag}
                  </span>
                ) : null}
              </div>
              <div className="p-4">
                <div className="text-sm font-extrabold leading-snug text-brand-navy transition-colors group-hover:text-brand-orange">
                  {b.name}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold tabular-nums text-brand-navy">
                    {KSH.format(b.price)}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums text-brand-navy/50">
                    MOQ {b.moq}
                  </span>
                </div>
              </div>
            </Link>
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
    body: "Item, quantity, deadline, artwork if you have it. A photo of what you want is enough to start.",
  },
  {
    n: "02",
    icon: FileSignature,
    title: "Approve the proof",
    body: "A digital mockup with exact placement and colour. Nothing runs until you sign it off in writing.",
  },
  {
    n: "03",
    icon: PackageCheck,
    title: "We produce",
    body: "Production happens directly on our floor, meaning no brokers, no third-party excuses, and no drifting completion dates.",
  },
  {
    n: "04",
    icon: Truck,
    title: "Delivered",
    body: "Nairobi same-day or next-day. Countrywide courier with tracking. Off-spec goods are reprinted at our cost.",
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
              How it runs
            </h2>
          </div>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-px border border-brand-navy/15 bg-brand-navy/15 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.n} delay={i * 90}>
                <div className="group relative flex h-full flex-col gap-5 overflow-hidden bg-white p-7 transition-colors duration-300 hover:bg-brand-surface">
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-0.75 origin-left scale-x-0 bg-brand-orange transition-transform duration-500 group-hover:scale-x-100"
                  />
                  <span className="text-4xl font-extrabold leading-none tabular-nums text-brand-navy/12 transition-colors duration-300 group-hover:text-brand-orange/45">
                    {s.n}
                  </span>
                  <Icon className="h-6 w-6 text-brand-orange transition-transform duration-300 group-hover:scale-110" />
                  <h3 className="text-lg font-extrabold text-brand-navy">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-brand-navy/70">{s.body}</p>
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
    <section className="relative overflow-hidden border-b border-brand-navy bg-brand-navy text-white">
      <DotField variant="light" className="pp-mask-fade opacity-30" />

      <div className="container-page relative px-5 py-14 sm:px-6 sm:py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,24rem)_1fr] lg:gap-20">
          <Reveal className="lg:sticky lg:top-24 lg:self-start">
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              Nothing enters production
              <span className="text-brand-orange"> without a proof you signed.</span>
            </h2>
          </Reveal>

          <div className="space-y-6 text-base leading-relaxed text-white/70">
            <Reveal delay={80}>
              <p>
                Every job goes out as a digital proof before a single unit is made. You approve it
                in writing. If what arrives does not match what you approved, we reprint it at our
                cost, without a negotiation and without an invoice for the second run.
              </p>
            </Reveal>
            <Reveal delay={160}>
              <p>
                That is not generosity. It is what the proofing stage is for. A supplier who will
                not put that in writing is a supplier who expects to get it wrong and expects you to
                pay for the correction.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <p className="border-l-2 border-brand-orange pl-5 font-semibold text-white">
                Where your supplied artwork is the problem, we flag it before we run it, in writing,
                and we tell you exactly what will go wrong if we proceed.
              </p>
            </Reveal>
            <Reveal delay={320}>
              <Link
                to="/services"
                className="group inline-flex items-center gap-2 border-b-2 border-brand-orange pb-1 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:text-brand-orange"
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
  { name: "Corporate", icon: Building2 },
  { name: "Schools", icon: GraduationCap },
  { name: "Hospitals", icon: Stethoscope },
  { name: "Churches", icon: Church },
  { name: "NGOs", icon: Globe },
  { name: "Government", icon: Building },
  { name: "Hotels", icon: Hotel },
  { name: "Restaurants", icon: Utensils },
  { name: "Construction", icon: HardHat },
  { name: "Manufacturing", icon: Factory },
  { name: "Events", icon: CalendarDays },
  { name: "Sports clubs", icon: Trophy },
];

function Sectors() {
  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-white">
      <DotField className="pp-mask-fade opacity-20" />

      <div className="container-page relative px-5 py-14 sm:px-6 sm:py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-16">
          <Reveal>
            <div>
              <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-brand-navy md:text-4xl">
                Who we print for
              </h2>
              <p className="mt-5 max-w-sm text-base leading-relaxed text-brand-navy/70">
                Different industries demand specific standards, materials, and turnarounds. We have
                managed corporate portfolios long enough to build production setups suited for every
                sector framework.
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
                    <IconComponent className="h-5 w-5 text-brand-orange transition-transform duration-300 group-hover:scale-110" />
                    <span className="text-sm font-bold text-brand-navy transition-colors duration-300 group-hover:text-white">
                      {s.name}
                    </span>
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

function Reviews() {
  const loop = [...REVIEWS, ...REVIEWS];

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
                aria-hidden={i >= REVIEWS.length}
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
    </section>
  );
}

/* ================================================================
   Close
   ================================================================ */

function Close() {
  return (
    <section className="relative overflow-hidden bg-brand-navy text-white">
      <PressGrid />
      <DotField variant="light" className="pp-mask-fade-center opacity-35" />

      <div className="container-page relative px-5 py-14 sm:px-6 sm:py-20 md:py-28">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-end">
          <Reveal>
            <div>
              <h2 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl">
                Send the brief.
                <br />
                <span className="text-brand-orange">Get a real number.</span>
              </h2>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-white/70">
                No discovery call. No qualification form. Tell us what you need made and we come
                back with a price and a date we intend to keep.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="flex flex-wrap gap-4 lg:justify-end">
              <Link
                to="/request-quote"
                className="pp-sheen group inline-flex items-center gap-2 bg-brand-orange px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_rgba(255,255,255,0.35)]"
              >
                Request a quote
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                to="/shop"
                className="group inline-flex items-center gap-2 border border-white/30 px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-orange hover:text-brand-orange"
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