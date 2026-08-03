import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import {
  ArrowRight,
  Star,
  Compass,
  Layers,
  PenTool,
  Maximize,
  RotateCw,
  RefreshCw,
  ShieldCheck,
  Users,
  Quote,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Capabilities | Protocol Promotions" },
      { name: "description", content: "Custom corporate apparel, promotional merchandise, signage, packaging, and commercial printing-sourced, produced, and proofed in-house across Kenya." },
      { property: "og:title", content: "Capabilities | Protocol Promotions" },
      { property: "og:description", content: "From executive merchandise and custom apparel to packaging and sign production, delivered in-house and through partners." },
    ],
  }),
  component: ServicesPage,
});

/* ------------------------------------------------------------------ */
/*  Shared motion primitives                                          */
/* ------------------------------------------------------------------ */

/** Fades + lifts children into view the first time they cross the viewport. */
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      className={`transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** Counts up to a number once it scrolls into view. */
function CountUp({ end, suffix = "", duration = 1300 }: { end: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setValue(end);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const start = performance.now();
            const tick = (now: number) => {
              const progress = Math.min((now - start) / duration, 1);
              setValue(Math.floor(progress * end));
              if (progress < 1) requestAnimationFrame(tick);
              else setValue(end);
            };
            requestAnimationFrame(tick);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

/** Nudges an element toward the cursor, snaps back on leave. */
function useMagnetic(strength = 12) {
  const ref = useRef<HTMLElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  return {
    ref,
    style,
    onMouseMove: (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      setStyle({
        transform: `translate(${x / strength}px, ${y / strength}px)`,
        transition: "transform 0.15s ease-out",
      });
    },
    onMouseLeave: () => {
      setStyle({ transform: "translate(0,0)", transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)" });
    },
  };
}

/**
 * Animated background: a drifting registration grid keyed to the production theme.
 */
function PressGrid() {
  return (
    <>
      <style>{`
        @keyframes pressGridDrift {
          from { background-position: 0 0, 0 0; }
          to   { background-position: 80px 80px, 80px 80px; }
        }
        .press-grid {
          background-image:
            linear-gradient(var(--color-brand-navy) 1px, transparent 1px),
            linear-gradient(90deg, var(--color-brand-navy) 1px, transparent 1px);
          background-size: 40px 40px, 40px 40px;
          animation: pressGridDrift 30s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .press-grid { animation: none; }
        }
      `}</style>
      <div className="press-grid pointer-events-none absolute inset-0 opacity-[0.16]" aria-hidden="true" />
    </>
  );
}

/**
 * Animated micro dot-matrix background that drifts smoothly down and right at infinity.
 */
function DotMatrixAnimation() {
  return (
    <>
      <style>{`
        @keyframes dotMatrixDrift {
          from { background-position: 0 0; }
          to   { background-position: 32px 32px; }
        }
        .dot-matrix {
          background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px);
          background-size: 16px 16px;
          animation: dotMatrixDrift 20s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .dot-matrix { animation: none; }
        }
      `}</style>
      <div className="dot-matrix pointer-events-none absolute inset-0" aria-hidden="true" />
    </>
  );
}

/** Slow-spinning printer's registration marks-pure decoration, hidden on small screens. */
function RegistrationMarks() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
      <svg
        className="absolute right-14 top-14 h-20 w-20 text-brand-orange/25 motion-reduce:animate-none animate-[spin_26s_linear_infinite]"
        viewBox="0 0 100 100"
        fill="none"
      >
        <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="1.5" />
        <line x1="50" y1="4" x2="50" y2="26" stroke="currentColor" strokeWidth="1.5" />
        <line x1="50" y1="74" x2="50" y2="96" stroke="currentColor" strokeWidth="1.5" />
        <line x1="4" y1="50" x2="26" y2="50" stroke="currentColor" strokeWidth="1.5" />
        <line x1="74" y1="50" x2="96" y2="50" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="3.5" fill="currentColor" />
      </svg>
      <svg
        className="absolute right-48 top-40 h-12 w-12 text-brand-navy/15 motion-reduce:animate-none animate-[spin_19s_linear_infinite_reverse]"
        viewBox="0 0 100 100"
        fill="none"
      >
        <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="2" />
        <line x1="50" y1="4" x2="50" y2="96" stroke="currentColor" strokeWidth="2" />
        <line x1="4" y1="50" x2="96" y2="50" stroke="currentColor" strokeWidth="2" />
      </svg>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="100%" height="100%">
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

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

type Capability = {
  code: string;
  category: string;
  items: string;
  min: string;
  turnaround: string;
  substrates: string;
};

const CAPABILITIES: Capability[] = [
  {
    code: "APP",
    category: "Custom Apparel",
    items: "Polo shirts, round neck t-shirts, hoodies, caps, uniforms, corporate safety wear.",
    min: "10 units",
    turnaround: "4–6 days",
    substrates: "Premium cotton, poly-cotton blends, heavy fleece, canvas, twill",
  },
  {
    code: "PROMO",
    category: "Promotional Items",
    items: "Branded pens, mugs, water bottles, lanyards, key holders, corporate gift sets.",
    min: "20 units",
    turnaround: "3–5 days",
    substrates: "Anodised metal, stainless steel, ceramic, polymers, acrylic",
  },
  {
    code: "SIGN",
    category: "Signage & Displays",
    items: "Roll-up banners, PVC boards, acrylic signs, shopfront signs, 3D built-up lettering.",
    min: "1 unit",
    turnaround: "3–7 days",
    substrates: "Aluminium composite (Alucobond), acrylic sheets, PVC, LED modules",
  },
  {
    code: "VEH",
    category: "Vehicle Branding",
    items: "Partial wraps, full vehicle wraps, transit fleet graphics, window micro-perforated film.",
    min: "1 vehicle",
    turnaround: "2–4 days",
    substrates: "Cast wrap vinyl, calendered vinyl, one-way vision film",
  },
  {
    code: "PACK",
    category: "Custom Packaging",
    items: "Branded boxes, product sleeves, shopping bags, kraft paper bags, custom product labels, 3D stand-up pouches.",
    min: "100 units",
    turnaround: "1–2 weeks",
    substrates: "Fluted corrugate, duplex board, kraft paper, self-adhesive chrome/clear",
  },
  {
    code: "PRINT",
    category: "Commercial Printing",
    items: "Business cards, event flyers, corporate brochures, posters, receipt books, company calendars.",
    min: "1 unit",
    turnaround: "24–48 hrs",
    substrates: "Art board, matte/gloss text stock, NCR carbonless paper",
  },
];

type DesignService = {
  name: string;
  body: string;
  deliverable: string;
  window: string;
  icon: React.ComponentType<{ className?: string }>;
};

const DESIGN: DesignService[] = [
  {
    name: "Logo design",
    body: "We design for the hardest production applications first: the embroidered cap front, the laser-engraved plate, or the tiny favicon. If it survives physical branding constraints, it survives anywhere.",
    deliverable: "Primary, secondary, mono and reversed marks. SVG, EPS, PNG.",
    window: "5 to 10 days",
    icon: PenTool,
  },
  {
    name: "Brand identity",
    body: "Palette, typography, layout structures, and behavioral rules for your assets across digital media, textiles, hard merchandise, and environmental signs.",
    deliverable: "Guidelines document, color and type specs, asset library.",
    window: "2 to 3 weeks",
    icon: Compass,
  },
  {
    name: "Production artwork",
    body: "Technical layout files built directly to custom product templates, garment dielines, vehicle scale vectors, and strict material press specs, not just flat screen mockups.",
    deliverable: "Production-ready vector files, layout sources, full separation proofs.",
    window: "2 to 4 days",
    icon: Layers,
  },
  {
    name: "Corporate rollout",
    body: "Systematically migrating your brand across your operational assets. Stationery, building signs, field team uniforms, sales fleet, corporate decks, and office kits.",
    deliverable: "Rollout schedule, component asset matrix, application mockups.",
    window: "1 to 3 weeks",
    icon: Maximize,
  },
];

const PROCESS_STEPS = [
  {
    step: "01",
    title: "Brief & Technical Proof",
    description:
      "You send specs or a rough idea. We return a laid-out proof-exact dimensions, Pantone references, and material notes-before anything is cut, printed, or sewn.",
  },
  {
    step: "02",
    title: "Sourcing & Pre-Press",
    description:
      "Blanks and substrates are pulled from stock or ordered the same day. Artwork is separated and set up specifically for the press, plotter, or embroidery head that will run it.",
  },
  {
    step: "03",
    title: "In-House Production",
    description:
      "Screen printing, embroidery, UV and vinyl printing, laser engraving, and CNC routing happen on our own floor, run by the same technicians who checked your proof.",
  },
  {
    step: "04",
    title: "Quality Check & Dispatch",
    description:
      "Every finished unit is checked against the signed-off proof before packing. Orders travel with a delivery note and a named contact, not just a tracking number.",
  },
];

const LOYALTY_TIERS = [
  {
    name: "Standard",
    detail: "Where every new client starts. Full proofing on every order, standard 3–7 day production lines.",
    perk: "Transparent, per-unit pricing",
  },
  {
    name: "Preferred",
    detail: "Unlocked after your 3rd completed order. Your artwork, garment sizing, and colour matches stay on file.",
    perk: "Reorders skip re-approval",
  },
  {
    name: "Corporate Partner",
    detail: "For annual-volume accounts. A named account contact and rates that don't move mid-year.",
    perk: "Priority production slot + locked rates",
  },
];

const INDUSTRIES = [
  "Corporate HQs",
  "Schools & Universities",
  "Hospitals & Clinics",
  "Churches & Ministries",
  "NGOs",
  "County Government",
  "Hotels & Lodges",
  "Restaurants",
  "Construction Firms",
  "Sports Clubs",
  "SACCOs",
  "Events & Conferences",
];

/** Placeholder client voices-swap in verified quotes before publishing. */


const FAQS = [
  {
    q: "Can you supply the merchandise items, or do we have to bring them?",
    a: "We supply everything. We stock and procure premium garments (polos, tees, hoodies), high-end executive gifts, notebooks, drinkware, and packaging substrates directly. You don't need to shop around for blanks, since we handle the product sourcing and the custom decoration under one contract.",
  },
  {
    q: "What do you actually outsource or partner on?",
    a: "Large-scale structural signage fabrication and complex high-volume packaging runs. Both require specialized, heavy industrial plant facilities. We manage the structural engineers and partners, proof the work, and carry the full accountability for the delivery timeline and quality setup.",
  },
  {
    q: "Can you match an exact corporate brand colour across apparel and merchandise?",
    a: "Yes. Provide your Pantone® references and we calibrate the output across screen printing inks, custom embroidery threads, vinyl materials, and digital stocks. If a particular material limits exact accuracy, we point it out during the proof stage and show your options.",
  },
  {
    q: "What happens if a batch arrives defective or incorrect?",
    a: "If the delivered products do not match the physical or digital proofs you formally signed off on, we replace the batch at our own cost. We verify artwork and product lines before production to back this up.",
  },
  {
    q: "Do you fulfill and deliver outside Nairobi?",
    a: "Yes, we ship and deploy corporate branding setups, custom merchandise kits, and signage cross-country across Kenya and regional entry points. Logistics costs and transit lead times are calculated cleanly inside your initial quote.",
  },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

function ServicesPage() {
  return (
    <SiteLayout>
      <Statement />
      <IndustryMarquee />
      <CapabilityGrid />
      <DesignSection />
      <ProcessSection />
      <RetentionSection />
      <Accountability />
      <Questions />
      <Close />
    </SiteLayout>
  );
}

function Statement() {
  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-white">
      <PressGrid />
      <RegistrationMarks />
      <div className="container-page relative py-20 md:py-32">
        <div className="max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-orange">Capabilities</p>
          <h1 className="mt-6 text-[2.75rem] leading-[1.02] font-extrabold tracking-tight text-brand-navy sm:text-6xl lg:text-7xl">
            Six supply chains.
            <br />
            One point of contact.
            <br />
            <span className="text-brand-blue">Zero surprises at delivery.</span>
          </h1>
          <div className="mt-10 max-w-2xl space-y-5 text-lg leading-relaxed text-brand-navy/75">
            <p>Stop managing separate vendors for your team uniforms, your executive gifts, your office signs, and your marketing collateral.</p>
            <p className="font-semibold text-brand-blue">
              We operate an ecosystem where product sourcing, structural design, textile printing, embroidery, and fabrication are handled directly under a unified quality standard.
            </p>
          </div>

          {/* Jump-to-category compass: real in-page navigation, not decoration */}
          <nav aria-label="Jump to a capability" className="mt-10 flex flex-wrap gap-2">
            {CAPABILITIES.map((c) => (
              <a
                key={c.code}
                href={`#${slugify(c.category)}`}
                className="group inline-flex items-center gap-2 border border-brand-navy/20 px-4 py-2 text-xs font-bold uppercase tracking-widest text-brand-navy/70 transition-all hover:-translate-y-0.5 hover:border-brand-orange hover:text-brand-orange"
              >
                <span className="font-mono text-[10px] text-brand-orange group-hover:text-brand-orange">{c.code}</span>
                {c.category}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}

/** Infinite-scrolling strip of sectors served-ambient proof of range, pauses on hover. */
function IndustryMarquee() {
  const loop = [...INDUSTRIES, ...INDUSTRIES];
  return (
    <div
      className="relative overflow-hidden border-b border-brand-blue/15 bg-white py-4"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
      }}
    >
      <style>{`
        @keyframes marqueeScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-track { animation: marqueeScroll 34s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .marquee-track { animation: none; } }
      `}</style>
      <div className="marquee-track flex w-max gap-10">
        {loop.map((ind, i) => (
          <span key={i} className="flex items-center gap-3 whitespace-nowrap text-sm font-bold uppercase tracking-widest text-brand-blue/45">
            {ind}
            <span className="h-1 w-1 rounded-full bg-brand-orange" />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Flip-card production matrix: hover or tap a card to see specs and jump straight into a quote. */
function CapabilityGrid() {
  return (
    <section className="relative border-b border-brand-blue bg-white">
      <div className="container-page py-16 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-brand-blue pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-orange">What we produce</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy md:text-4xl">Core Production Matrix</h2>
          </div>
          <p className="max-w-xs text-sm font-semibold text-brand-navy/60">
            Hover or tap a card for specs. Six production lines, sourced and finished under one quality standard.
          </p>
        </div>

       <style>{`
  .flip-card { 
    perspective: 1400px; 
  }
  .flip-card-inner {
    position: relative;
    height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.65s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 1rem; /* Adjust this value for more/less rounding */
  }
  .flip-card-face {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    border-radius: 1rem; /* Matches the inner container */
    overflow: hidden;    /* Ensures children don't bleed past the corners */
  }
  .flip-card-back { 
    transform: rotateY(180deg); 
  }
  @media (prefers-reduced-motion: reduce) {
    .flip-card-inner { transition: none; }
  }
`}</style>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c, i) => (
            <Reveal key={c.category} delay={i * 70}>
              <CapabilityCard c={c} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function CapabilityCard({ c }: { c: Capability }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      id={slugify(c.category)}
      className="flip-card h-80 scroll-mt-24 cursor-pointer outline-none"
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onClick={() => setFlipped((f) => !f)}
      onFocus={() => setFlipped(true)}
      onBlur={() => setFlipped(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setFlipped((f) => !f);
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={`${c.category}-show production specs`}
    >
      <div className="flip-card-inner" style={{ transform: flipped ? "rotateY(180deg)" : undefined }}>
        {/* Front */}
        <div className="flip-card-face flex flex-col justify-between border-2 border-brand-blue bg-white p-6">
          <div className="flex items-start justify-between">
            <span className="font-mono text-xs tracking-widest text-brand-orange">{c.code}</span>
            <RotateCw className="h-4 w-4 text-brand-blue/30" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold tracking-tight text-brand-navy">{c.category}</h3>
            <p className="mt-3 text-sm leading-relaxed text-brand-navy/60">{c.items}</p>
          </div>
          <div className="flex items-center justify-between border-t border-brand-navy/10 pt-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-brand-navy/45">Turnaround</span>
            <span className="text-sm font-extrabold tabular-nums text-brand-orange">{c.turnaround}</span>
          </div>
        </div>

        {/* Back */}
        <div className="flip-card-face flip-card-back flex flex-col justify-between border-2 border-brand-navy bg-brand-navy p-6 text-white">
          <div>
            <span className="font-mono text-xs tracking-widest text-brand-orange">{c.code} / SPECS</span>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-white/45">Minimum order</dt>
                <dd className="mt-1 text-sm font-bold tabular-nums text-white">{c.min}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-white/45">Key substrates</dt>
                <dd className="mt-1 text-xs leading-relaxed text-white/70">{c.substrates}</dd>
              </div>
            </dl>
          </div>
          <Link
            to="/request-quote"
            search={{ category: c.category } as any}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2 self-start border border-white/30 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:border-brand-orange hover:text-brand-orange"
          >
            Start this order
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function DesignSection() {
  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-brand-navy text-white">
      <DotMatrixAnimation />
      <div className="container-page relative z-10 py-16 md:py-24">
        <Reveal>
          <div className="max-w-3xl">
            <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">
              Before products get decorated,
              <span className="text-brand-orange"> they have to be engineered right.</span>
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70">
              Design isn't just graphic styling. It's understanding structural lines, material limitations, and technical assets. We prepare source files tailored to real manufacturing pipelines.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {DESIGN.map((d, i) => {
            const Icon = d.icon;
            return (
              <Reveal key={d.name} delay={i * 80}>
                <article className="group relative flex h-full flex-col justify-between border border-white/10 bg-brand-navy/40 p-6 transition-all duration-300 backdrop-blur-sm hover:-translate-y-1 hover:border-brand-orange hover:bg-brand-navy">
                  <div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div className="flex h-10 w-10 items-center justify-center border border-white/15 bg-brand-navy text-white transition-all duration-300 group-hover:-rotate-6 group-hover:border-brand-orange group-hover:text-brand-orange">
                        <Icon className="h-5 w-5 stroke-[1.75]" />
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-white/40 group-hover:text-white/60">{d.window}</span>
                    </div>

                    <h3 className="mt-5 text-xl font-extrabold tracking-tight text-white transition-colors group-hover:text-brand-orange">{d.name}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/70 transition-colors group-hover:text-white/90">{d.body}</p>
                  </div>

                  <div className="mt-6 flex items-end justify-between border-l border-brand-orange pl-3">
                    <span className="text-[11px] font-medium leading-normal text-white/50 group-hover:text-white/80">{d.deliverable}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 -translate-x-1 text-brand-orange opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-[#00a7a7] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(circle at 50% 0%, #1e293b 0%, transparent 70%)" }}
      />

      <div className="container-page relative z-10 py-16 md:py-24">
        <Reveal>
          <div className="mb-12 max-w-3xl">
            <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">Four stages. Nothing hidden between them.</h2>
            <p className="mt-4 text-lg leading-relaxed text-white/70">
              You see the proof before it's cut. You see the specs before it's priced. Here's what actually happens between your brief and your delivery.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS_STEPS.map((p, i) => (
            <Reveal key={p.step} delay={i * 90}>
              <article className="group relative flex h-full flex-col border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-navy hover:bg-white/10">
                <div className="mb-6 flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold tracking-widest text-brand-navy">STAGE / {p.step}</span>
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-navy/60 group-hover:animate-pulse" />
                </div>

                <h3 className="mb-3 text-lg font-bold text-white transition-colors group-hover:text-brand-navy">{p.title}</h3>
                <p className="text-sm leading-relaxed text-white/60 transition-colors group-hover:text-white/90">{p.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Speaks directly to retention: what a repeat client gets that a first-time client doesn't. */
function RetentionSection() {
  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-white">
      <PressGrid />
      <div className="container-page relative py-16 md:py-24">
        <Reveal>
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center border border-brand-navy/15 bg-white text-brand-orange shadow-sm">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div className="max-w-2xl">
              <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-brand-navy md:text-4xl">
                Your second order shouldn't feel like your first.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-brand-navy/75">
                Every job leaves an artwork file, a colour match, and a sizing chart in your account. When you reorder, we pull the file-we don't rebuild it. That's the difference between a 5-day turnaround and a 48-hour one.
              </p>
            </div>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {LOYALTY_TIERS.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 90}>
              <article className="group flex h-full flex-col justify-between border-2 border-brand-navy/12 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-navy hover:shadow-lg">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-brand-orange">Tier {String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-2 text-xl font-extrabold tracking-tight text-brand-navy">{tier.name}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-brand-navy/65">{tier.detail}</p>
                </div>
                <div className="mt-6 flex items-center gap-2 border-t border-brand-navy/10 pt-4">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-orange" />
                  <span className="text-xs font-bold uppercase tracking-wide text-brand-navy">{tier.perk}</span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t-2 border-brand-navy pt-6 text-sm font-semibold text-brand-navy/70">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-orange" /> Proofed before production, every time
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-brand-orange" /> Named account contact from Preferred tier up
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}



function Accountability() {
  const stats: { label: string; numeric?: { value: number; suffix: string }; display?: string }[] = [
    { numeric: { value: 100, suffix: "%" }, label: "Pre-production proofed" },
    { numeric: { value: 48, suffix: " hrs" }, label: "Fast-run express lines" },
    { display: "Premium", label: "Apparel & Gift Blanks" },
    { numeric: { value: 2000, suffix: "+" }, label: "Corporate builds delivered" },
  ];

  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-white">
      <PressGrid />
      <div className="container-page relative py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-16">
          <Reveal className="lg:col-span-2">
            <div>
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center border border-brand-navy/15 bg-white p-2 shadow-sm">
                  <GoogleIcon />
                </div>
                <div>
                  <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-brand-navy md:text-4xl">
                    Verified accountability metric alignment.
                  </h2>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex gap-0.5 text-brand-orange">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <span className="text-sm font-bold tabular-nums text-brand-navy">5.0 Rating</span>
                    <span className="text-sm text-brand-navy/55">via active client reviews</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 max-w-2xl space-y-5 text-base leading-relaxed text-brand-navy/75">
                <p>
                  Every order goes through a strict digital technical confirmation layout before procurement or finishing starts. You sign off on product sizes, layout measurements, and brand assets.
                </p>
                <p>
                  If what drops at your office doesn't match the design specs you verified, we replace or adjust the line at our expense. No round-about negotiations, no hidden supplemental bills.
                </p>
              </div>
            </div>
          </Reveal>

          <dl className="grid grid-cols-2 gap-y-8 self-start lg:grid-cols-1 lg:border-l-2 lg:border-brand-navy lg:pl-10">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 90}>
                <div>
                  <dt className="text-3xl font-extrabold tabular-nums tracking-tight text-brand-navy lg:text-4xl">
                    {s.numeric ? <CountUp end={s.numeric.value} suffix={s.numeric.suffix} /> : s.display}
                  </dt>
                  <dd className="mt-1 text-xs font-semibold uppercase tracking-wide text-brand-navy/55">{s.label}</dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function Questions() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="border-b border-brand-navy bg-white">
      <div className="container-page py-16 md:py-24">
        <Reveal>
          <h2 className="border-b-2 border-brand-navy pb-6 text-3xl font-extrabold tracking-tight text-brand-navy md:text-4xl">
            Operational answers you actually look for
          </h2>
        </Reveal>

        <div className="mt-2">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="border-b border-brand-navy/15">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="group flex w-full items-baseline gap-5 py-6 text-left"
                >
                  <span className="font-mono text-xs tabular-nums text-brand-orange">{String(i + 1).padStart(2, "0")}</span>
                  <span
                    className={`flex-1 text-lg font-bold tracking-tight transition-colors md:text-xl ${
                      isOpen ? "text-brand-orange" : "text-brand-navy group-hover:text-brand-orange"
                    }`}
                  >
                    {f.q}
                  </span>
                  <span
                    className={`shrink-0 text-2xl font-light leading-none text-brand-navy/40 transition-transform ${isOpen ? "rotate-45" : ""}`}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="pb-8 pl-11 pr-8">
                    <p className="max-w-3xl text-[15px] leading-relaxed text-brand-navy/70">{f.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Close() {
  const magneticPrimary = useMagnetic(10);
  const magneticSecondary = useMagnetic(14);

  return (
    <section className="relative overflow-hidden bg-brand-blue text-white">
      <PressGrid />
      <div className="container-page relative py-20 md:py-28">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-end">
          <Reveal>
            <div>
              <h2 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl">
                Drop the inventory brief.
                <br />
                <span className="text-brand-navy">Get direct pricing.</span>
              </h2>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-white/70">
                Send over your required item matrix, garment lines, or sizing specs. We respond with solid unit numbers and real production dates.
              </p>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="flex flex-wrap gap-4 lg:justify-end">
              <Link
                to="/request-quote"
                ref={magneticPrimary.ref as any}
                style={magneticPrimary.style}
                onMouseMove={magneticPrimary.onMouseMove}
                onMouseLeave={magneticPrimary.onMouseLeave}
                className="inline-flex items-center gap-2 bg-brand-navy px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all hover:brightness-95"
              >
                Request a quote
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/shop"
                ref={magneticSecondary.ref as any}
                style={magneticSecondary.style}
                onMouseMove={magneticSecondary.onMouseMove}
                onMouseLeave={magneticSecondary.onMouseLeave}
                className="inline-flex items-center gap-2 border border-white/30 px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all hover:border-brand-navy hover:text-brand-navy"
              >
                Browse items
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}