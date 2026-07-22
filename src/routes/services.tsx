import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { 
  ArrowRight, 
  Star, 
  Compass, 
  Layers, 
  PenTool, 
  Maximize 
} from "lucide-react";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Capabilities | Protocol Promotions" },
      { name: "description", content: "Custom corporate apparel, promotional merchandise, signage, packaging, and commercial printing services delivered across Kenya." },
      { property: "og:title", content: "Capabilities | Protocol Promotions" },
      { property: "og:description", content: "From executive merchandise and custom apparel to packaging and sign production, delivered in-house and through partners." },
    ],
  }),
  component: ServicesPage,
});

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
      <div
        className="press-grid pointer-events-none absolute inset-0 opacity-[0.16]"
        aria-hidden="true"
      />
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
      <div 
        className="dot-matrix pointer-events-none absolute inset-0" 
        aria-hidden="true" 
      />
    </>
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

type Capability = {
  category: string;
  items: string;
  min: string;
  turnaround: string;
  substrates: string;
};

const CAPABILITIES: Capability[] = [
  {
    category: "Custom Apparel",
    items: "Polo shirts, round neck t-shirts, hoodies, caps, uniforms, corporate safety wear.",
    min: "10 units",
    turnaround: "4 to 6 days",
    substrates: "Premium cotton, poly-cotton blends, heavy fleece, canvas, twill",
  },
  {
    category: "Promotional Items",
    items: "Branded pens, mugs, water bottles, lanyards, key holders, corporate gift sets.",
    min: "20 units",
    turnaround: "3 to 5 days",
    substrates: "Anodised metal, stainless steel, ceramic, polymers, acrylic",
  },
  {
    category: "Signage & Displays",
    items: "Roll-up banners, PVC boards, acrylic signs, shopfront signs, 3D built-up lettering.",
    min: "1 unit",
    turnaround: "3 to 7 days",
    substrates: "Aluminium composite (Alucobond), acrylic sheets, PVC, LED modules",
  },
  {
    category: "Vehicle Branding",
    items: "Partial wraps, full vehicle wraps, transit fleet graphics, window micro-perforated film.",
    min: "1 vehicle",
    turnaround: "2 to 4 days",
    substrates: "Cast wrap vinyl, calendered vinyl, one-way vision film",
  },
  {
    category: "Custom Packaging",
    items: "Branded boxes, product sleeves, shopping bags, kraft paper bags, custom product labels, 3D stand-up pouches.",
    min: "100 units",
    turnaround: "1 to 2 weeks",
    substrates: "Fluted corrugate, duplex board, kraft paper, self-adhesive chrome/clear",
  },
  {
    category: "Commercial Printing",
    items: "Business cards, event flyers, corporate brochures, posters, receipt books, company calendars.",
    min: "1 unit",
    turnaround: "24 to 48 hrs",
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
    title: "Automated Pre-Flight & Ingestion",
    description: "Cloud-based asset ingestion runs your vector layouts through algorithmic color-matching and digital substrate simulations to catch structural anomalies before rendering."
  },
  {
    step: "02",
    title: "3D Digital Twins & Web Proofing",
    description: "Flat dielines are converted into interactive 3D digital twins. Review packaging layouts, apparel mapping, and spatial signage via responsive web proofs for absolute precision."
  },
  {
    step: "03",
    title: "Computer-Integrated Manufacturing",
    description: "Approved assets are pushed directly to IoT-monitored fabrication hubs. Automated cutting plotters and digital print arrays execute the file with zero analogue degradation."
  },
  {
    step: "04",
    title: "Optical QA & API Logistics",
    description: "Optical sensors verify the finished output against the original digital twins. Batches are dispatched with live API tracking integrated directly into your procurement feed."
  }
];

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

function ServicesPage() {
  return (
    <SiteLayout>
      <Statement />
      <CapabilityTable />
      <DesignSection />
      <ProcessSection />
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
      <div className="container-page relative py-20 md:py-32">
        <div className="max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-orange">
            Capabilities
          </p>
          <h1 className="mt-6 text-[2.75rem] leading-[1.02] font-extrabold tracking-tight text-brand-navy sm:text-6xl lg:text-7xl">
            Corporate apparel,
            <br />
            custom merchandise,
            <br />
            <span className="text-brand-orange">sourced and finished in-house.</span>
          </h1>
          <div className="mt-10 max-w-2xl space-y-5 text-lg leading-relaxed text-brand-navy/75">
            <p>
              Stop managing separate vendors for your team uniforms, your executive gifts, your office signs, and your marketing collateral. 
            </p>
            <p className="font-semibold text-brand-navy">
              We operate an ecosystem where product sourcing, structural design, textile printing, embroidery, and fabrication are handled directly under a unified quality standard.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CapabilityTable() {
  return (
    <section className="border-b border-brand-navy bg-white overflow-hidden">
      <div className="container-page py-16 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-brand-navy pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-orange">
              What we produce
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy md:text-4xl">
              Core Production Matrix
            </h2>
          </div>
          <p className="text-sm font-semibold text-brand-navy/60 max-w-xs">
            Six production lines, sourced and finished under one quality standard.
          </p>
        </div>

        {/* Desktop view: full grid table */}
        <div className="mt-8 hidden lg:block overflow-x-auto">
          <table className="w-full border-collapse text-left table-fixed">
            <thead>
              <tr className="border-b-2 border-brand-navy/15">
                <th className="w-[20%] py-4 px-6 text-[11px] font-bold uppercase tracking-widest text-brand-navy/50">
                  Category
                </th>
                <th className="w-[34%] px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-brand-navy/50">
                  Products included
                </th>
                <th className="w-[12%] px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-brand-navy/50">
                  Min order
                </th>
                <th className="w-[13%] px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-brand-navy/50">
                  Turnaround
                </th>
                <th className="w-[21%] px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-brand-navy/50">
                  Key substrates
                </th>
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((c, i) => (
                <tr
                  key={c.category}
                  className="group border-b border-brand-navy/10 transition-colors duration-150 hover:bg-brand-navy"
                >
                  <td className="py-6 px-6 align-top">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-xs tabular-nums text-brand-orange">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-base font-extrabold text-brand-navy transition-colors group-hover:text-white">
                        {c.category}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-6 align-top text-sm leading-relaxed text-brand-navy/70 transition-colors group-hover:text-white/80">
                    {c.items}
                  </td>
                  <td className="px-6 py-6 align-top text-sm font-bold tabular-nums text-brand-navy transition-colors group-hover:text-white">
                    {c.min}
                  </td>
                  <td className="px-6 py-6 align-top text-sm font-bold tabular-nums text-brand-navy transition-colors group-hover:text-brand-orange">
                    {c.turnaround}
                  </td>
                  <td className="px-6 py-6 align-top text-xs leading-relaxed text-brand-navy/60 transition-colors group-hover:text-white/70">
                    {c.substrates}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tablet and mobile view: cards */}
        <div className="mt-8 space-y-4 lg:hidden">
          {CAPABILITIES.map((c, i) => (
            <article
              key={c.category}
              className="border-2 border-brand-navy/12 p-5 transition-colors group hover:border-brand-navy/30"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs tabular-nums text-brand-orange">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-lg font-extrabold text-brand-navy">{c.category}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-brand-navy/70">{c.items}</p>
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-brand-navy/10 pt-4">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-brand-navy/45">
                    Min order
                  </dt>
                  <dd className="mt-1 text-sm font-bold tabular-nums text-brand-navy">{c.min}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-brand-navy/45">
                    Turnaround
                  </dt>
                  <dd className="mt-1 text-sm font-bold tabular-nums text-brand-orange">
                    {c.turnaround}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-brand-navy/45">
                    Substrates
                  </dt>
                  <dd className="mt-1 text-xs leading-relaxed text-brand-navy/60">
                    {c.substrates}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DesignSection() {
  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-brand-navy text-white">
      <DotMatrixAnimation />
      <div className="container-page relative z-10 py-16 md:py-24">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">
            Before products get decorated,
            <span className="text-brand-orange"> they have to be engineered right.</span>
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70">
            Design isn't just graphic styling. It's understanding structural lines, material limitations, and technical assets. We prepare source files tailored to real manufacturing pipelines.
          </p>
        </div>

        {/* Card Grid Stack */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {DESIGN.map((d) => {
            const Icon = d.icon;
            return (
              <article
                key={d.name}
                className="group relative flex flex-col justify-between border border-white/10 bg-brand-navy/40 p-6 transition-all duration-300 backdrop-blur-sm hover:border-brand-orange hover:bg-brand-navy"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center border border-white/15 bg-brand-navy text-white transition-colors group-hover:border-brand-orange group-hover:text-brand-orange">
                      <Icon className="h-5 w-5 stroke-[1.75]" />
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-white/40 group-hover:text-white/60">
                      {d.window}
                    </span>
                  </div>
                  
                  <h3 className="mt-5 text-xl font-extrabold tracking-tight text-white transition-colors group-hover:text-brand-orange">
                    {d.name}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/70 transition-colors group-hover:text-white/90">
                    {d.body}
                  </p>
                </div>

                <div className="mt-6 border-l border-brand-orange pl-3 text-[11px] font-medium leading-normal text-white/50 group-hover:text-white/80">
                  {d.deliverable}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-[#0A0F1A] text-white">
      {/* Subtle tech background element */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 0%, #1e293b 0%, transparent 70%)'
        }}
      />
      
      <div className="container-page py-16 md:py-24 relative z-10">
        <div className="max-w-3xl mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">
            A fully digitized production pipeline.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/70">
            Eliminating analogue degradation. From cloud asset ingestion to computer-integrated manufacturing, your layouts remain perfectly calibrated through a strictly digital workflow.
          </p>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS_STEPS.map((p) => (
            <article 
              key={p.step} 
              className="group relative flex flex-col bg-white/5 border border-white/10 p-8 backdrop-blur-sm transition-all duration-300 hover:border-brand-orange hover:bg-white/10"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold tracking-widest text-brand-orange">
                  SYSTEM / {p.step}
                </span>
                {/* Simulated digital active light */}
                <div className="h-1.5 w-1.5 rounded-full bg-brand-orange/60 animate-pulse" />
              </div>
              
              <h3 className="text-lg font-bold text-white mb-3 transition-colors group-hover:text-brand-orange">
                {p.title}
              </h3>
              <p className="text-sm leading-relaxed text-white/60 transition-colors group-hover:text-white/90">
                {p.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Accountability() {
  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-white">
      <PressGrid />
      <div className="container-page relative py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-16">
          <div className="lg:col-span-2">
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

          <dl className="grid grid-cols-2 gap-y-8 self-start lg:grid-cols-1 lg:border-l-2 lg:border-brand-navy lg:pl-10">
            {[
              { k: "100%", v: "Pre-production proofed" },
              { k: "48 hrs", v: "Fast-run express lines" },
              { k: "Premium", v: "Apparel & Gift Blanks" },
              { k: "2,000+", v: "Corporate builds delivered" },
            ].map((s) => (
              <div key={s.v}>
                <dt className="text-3xl font-extrabold tabular-nums tracking-tight text-brand-navy lg:text-4xl">
                  {s.k}
                </dt>
                <dd className="mt-1 text-xs font-semibold uppercase tracking-wide text-brand-navy/55">
                  {s.v}
                </dd>
              </div>
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
        <h2 className="border-b-2 border-brand-navy pb-6 text-3xl font-extrabold tracking-tight text-brand-navy md:text-4xl">
          Operational answers you actually look for
        </h2>

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
                  <span className="font-mono text-xs tabular-nums text-brand-orange">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`flex-1 text-lg font-bold tracking-tight transition-colors md:text-xl ${
                      isOpen ? "text-brand-orange" : "text-brand-navy group-hover:text-brand-orange"
                    }`}
                  >
                    {f.q}
                  </span>
                  <span
                    className={`shrink-0 text-2xl font-light leading-none text-brand-navy/40 transition-transform ${
                      isOpen ? "rotate-45" : ""
                    }`}
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
  return (
    <section className="relative overflow-hidden bg-brand-navy text-white">
      <PressGrid />
      <div className="container-page relative py-20 md:py-28">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-end">
          <div>
            <h2 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl">
              Drop the inventory brief.
              <br />
              <span className="text-brand-orange">Get direct pricing.</span>
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/70">
              Send over your required item matrix, garment lines, or sizing specs. We respond with solid unit numbers and real production dates.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 lg:justify-end">
            <Link
              to="/request-quote"
              className="inline-flex items-center gap-2 bg-brand-orange px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all hover:-translate-y-0.5 hover:brightness-95"
            >
              Request a quote
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 border border-white/30 px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all hover:-translate-y-0.5 hover:border-brand-orange hover:text-brand-orange"
            >
              Browse items
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}