import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { 
  Target, 
  Eye, 
  ShieldCheck, 
  Cpu, 
  ArrowRight,
  Flame,
  Lightbulb,
  Handshake as HandshakeIcon,
  Globe2,
  Workflow,
  Printer,
  Shirt,
  Package,
  Award,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Check,
  X
} from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us | Protocol Promotions" },
      { name: "description", content: "Protocol Promotions is Kenya's partner for branding, printing, and promotional products. Discover our mission, vision, and how we work." },
      { property: "og:title", content: "About Us | Protocol Promotions" },
      { property: "og:description", content: "Who we are and how we make printing and branding easy for businesses in Kenya." },
    ],
  }),
  component: AboutPage,
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
        className="press-grid pointer-events-none absolute inset-0 opacity-[0.08]"
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

function AboutPage() {
  return (
    <SiteLayout>
      <HeroStatement />
      <MissionVision />
      <Philosophy />
      <CorePillars />
      <ProcessPipeline />
      <InHouse />
      <StatsSection />
      <Standards />
      <WhereToFindUs />
      <CallToAction />
    </SiteLayout>
  );
}

function HeroStatement() {
  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-white">
      <PressGrid />
      <div className="container-page relative py-14 sm:py-20 md:py-32">
        <div className="max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-orange">
            Our Story
          </p>
          <h1 className="mt-5 text-[2rem] leading-[1.08] font-extrabold tracking-tight text-brand-navy sm:text-5xl md:text-6xl lg:text-7xl sm:leading-[1.02] sm:mt-6">
            We turn your digital designs into
            <br />
            <span className="text-brand-blue">real-world products.</span>
          </h1>
          <div className="mt-7 max-w-2xl space-y-4 text-base leading-relaxed text-brand-navy/75 sm:mt-10 sm:space-y-5 sm:text-lg">
            <p>
              Protocol Promotions wasn't built to be just another print shop. We were founded to make it easy to turn great digital designs into high-quality physical items without the usual stress.
            </p>
            <p className="font-semibold text-brand-blue">
              We combine the speed and ease of modern software with the hands-on care of traditional printing, packaging, and custom merchandise making.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function MissionVision() {
  return (
    <section className="border-b border-brand-navy bg-white">
      <div className="container-page grid divide-y divide-brand-navy/15 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        
        {/* Mission */}
        <div className="group relative p-7 sm:p-12 lg:p-20 transition-colors hover:bg-brand-navy/5">
          <div className="mb-6 flex h-14 w-14 items-center justify-center border-2 border-brand-navy text-brand-navy group-hover:border-brand-blue group-hover:text-brand-blue transition-colors">
            <Target className="h-6 w-6" />
          </div>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-navy/50">
            Our Mission
          </h2>
          <p className="mt-3.5 text-xl font-extrabold leading-tight tracking-tight text-brand-navy sm:mt-4 sm:text-2xl md:text-3xl">
            To make high-quality physical branding easy and reliable for every business, from small orders to large national campaigns.
          </p>
        </div>

        {/* Vision */}
        <div className="group relative p-7 sm:p-12 lg:p-20 transition-colors hover:bg-brand-navy/5">
          <div className="mb-6 flex h-14 w-14 items-center justify-center border-2 border-brand-navy text-brand-navy group-hover:border-brand-blue group-hover:text-brand-blue transition-colors">
            <Eye className="h-6 w-6" />
          </div>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-navy/50">
            Our Vision
          </h2>
          <p className="mt-3.5 text-xl font-extrabold leading-tight tracking-tight text-brand-navy sm:mt-4 sm:text-2xl md:text-3xl">
            To be the most trusted printing, packaging, and branding partner for businesses across East Africa.
          </p>
        </div>

      </div>
    </section>
  );
}

function Philosophy() {
  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-brand-navy text-white">
      <DotMatrixAnimation />
      <div className="container-page relative z-10 py-14 sm:py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.3em] text-brand-orange">
            Our Philosophy
          </h2>
          <p className="mt-6 text-2xl font-extrabold leading-[1.15] tracking-tight sm:mt-8 sm:text-4xl sm:leading-[1.1] md:text-5xl lg:text-6xl">
            "A logo on a screen is just an idea. It becomes a brand when people can hold it in their hands."
          </p>
          <div className="mt-9 grid gap-7 text-left sm:mt-12 sm:grid-cols-2 sm:gap-8 md:gap-16">
            <div>
              <h3 className="text-lg font-bold text-brand-orange">Perfect Color Matching.</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                Your brand colors should look exactly the same whether they are printed on a paper coffee pouch or stitched into a cotton hoodie. We make sure your final product matches your original design perfectly.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-brand-orange">Designs made to be printed.</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                A beautiful design only works if it can actually be printed. We plan for the physical product right from the start, whether it's an embroidered cap or a folded box, so the final result always looks great.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CorePillars() {
  const PILLARS = [
    {
      name: "Commitment",
      desc: "We finish what we start, on the date we agreed. If a deadline is genuinely at risk we tell you early, while there is still time to do something about it.",
      icon: HandshakeIcon
    },
    {
      name: "Integrity",
      desc: "The quote you approve is the invoice you receive. We never swap a material for a cheaper one without asking, and when the fault is ours we replace the work at our cost.",
      icon: ShieldCheck
    },
    {
      name: "Creativity",
      desc: "A logo dropped onto a product is not branding. We think about placement, method and material so the finished item does your brand justice, not just carries it.",
      icon: Lightbulb
    },
    {
      name: "Passion",
      desc: "We care how the last unit in a run of five thousand looks, because that is the one somebody receives. Nothing leaves here that we would not hand over ourselves.",
      icon: Flame
    }
  ];

  return (
    <section className="border-b border-brand-navy bg-white">
      <div className="container-page py-14 sm:py-16 md:py-24">
        <div className="mb-12 max-w-2xl">
          <h2 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl md:text-5xl">
            Our Core Values
          </h2>
          <p className="mt-4 text-base leading-relaxed text-brand-navy/70 sm:text-lg">
            Four things we hold to. They decide what we take on, how we price it, and what we do when something goes wrong.
          </p>
        </div>

        <div className="grid gap-px bg-brand-navy/15 border border-brand-navy/15 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <div 
                key={i} 
                className="group relative bg-white p-6 transition-all hover:bg-brand-navy sm:p-8"
              >
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center border border-brand-navy/20 bg-transparent text-brand-navy transition-colors group-hover:border-brand-orange group-hover:text-brand-orange">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-brand-navy transition-colors group-hover:text-white">
                  {pillar.name}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-brand-navy/70 transition-colors group-hover:text-white/70">
                  {pillar.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProcessPipeline() {
  const STEPS = [
    {
      num: "01",
      title: "Advice & Planning",
      desc: "We listen to your needs and help you choose the best materials, products, and printing methods for your brand's unique goals.",
      icon: Workflow
    },
    {
      num: "02",
      title: "Digital Proofs & Review",
      desc: "Before we print anything, we create clear digital proofs and 3D mockups. You get to see exactly what your product will look like before you say yes.",
      icon: Globe2
    },
    {
      num: "03",
      title: "In-House Production",
      desc: "Once you approve the proof, our in-house team starts printing, cutting, or embroidering your items using high-quality machines.",
      icon: Cpu
    },
    {
      num: "04",
      title: "Quality Check & Delivery",
      desc: "Every item is checked to make sure it matches your approved design. Then, we pack it safely and deliver it directly to your door.",
      icon: Flame
    }
  ];

  return (
    <section className="relative overflow-hidden border-b border-brand-navy bg-[#00a7a7] text-white">
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(circle at 80% 50%, #1e293b 0%, transparent 60%)'
        }}
      />
      <div className="container-page relative z-10 py-16 md:py-24">
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">
              How We Work
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/70">
              A simple, clear step-by-step process designed to eliminate surprises and make sure you get exactly what you ordered.
            </p>
          </div>
          <div className="hidden md:block">
             <div className="h-px w-32 bg-brand-blue"></div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden lg:block absolute top-18 left-0 w-full h-px bg-white/10 z-0" />
          
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="group relative z-10">
                <div className="mb-6 flex items-center justify-between lg:justify-start lg:gap-4">
                  <div className="flex h-16 w-16 items-center justify-center border-2 border-brand-white bg-[#783190] text-brand-white transition-transform group-hover:scale-110">
                    <span className="font-mono text-xl font-bold">{step.num}</span>
                  </div>
                  <Icon className="h-6 w-6 text-white/20 lg:hidden" />
                </div>
                <div className="border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:border-brand-blue/50 hover:bg-white/10">
                  <h3 className="text-lg font-bold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/60">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="relative overflow-hidden bg-brand-navy text-white">
      <PressGrid />
      <div className="container-page relative py-14 sm:py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-5 lg:items-center">
          
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl md:text-4xl">
              Built for big orders.
              <br />
              <span className="text-brand-orange">Focused on quality.</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-white/70 sm:mt-6 sm:text-lg">
              Whether you are a growing coffee brand needing stand-up pouches and flyers, or a large corporation needing uniforms for your entire staff, we have the team and the tools to deliver.
            </p>
            <div className="mt-10">
              <a
                href="/services"
                className="inline-flex w-full items-center justify-center gap-2 bg-brand-orange px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all hover:-translate-y-0.5 hover:brightness-95 sm:w-auto"
              >
                View our capabilities
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-3">
            <dl className="grid grid-cols-2 gap-px bg-white/10 border border-white/10">
              {[
                ["500+", "Products Available"],
                ["2,000+", "Orders Delivered"],
                ["48 Hrs", "Standard Turnaround"],
                ["100%", "Quality Guarantee"]
              ].map(([stat, label], i) => (
                <div key={i} className="bg-brand-navy/80 p-6 backdrop-blur-md sm:p-8">
                  <dt className="text-[1.75rem] font-extrabold tabular-nums tracking-tight text-white sm:text-4xl md:text-5xl">
                    {stat}
                  </dt>
                  <dd className="mt-2.5 text-[10px] font-bold uppercase tracking-widest text-brand-orange sm:mt-3 sm:text-xs">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

        </div>
      </div>
    </section>
  );
}

/**
 * What we run ourselves. This answers the unspoken question behind every
 * lead time promise: are you actually making this, or subcontracting it?
 */
export function InHouse() {
  const LINES = [
    {
      icon: Printer,
      name: "Digital & Large Format",
      detail:
        "Business cards, flyers, posters, banners, pull up stands and vehicle graphics. Short runs are viable because there is no plate setup.",
      tag: "Zero Setup Fees",
      color: "text-[#00a7a7]",
      bg: "bg-[#00a7a7]/10",
      border: "group-hover:border-[#00a7a7]",
    },
    {
      icon: Shirt,
      name: "Apparel Decoration",
      detail:
        "Screen printing, embroidery, vinyl transfer and sublimation. Method chosen by quantity, garment and design, not by what is convenient for us.",
      tag: "Multi-Process",
      color: "text-[#de166a]",
      bg: "bg-[#de166a]/10",
      border: "group-hover:border-[#de166a]",
    },
    {
      icon: Package,
      name: "Packaging & Finishing",
      detail:
        "Stand up pouches, labels, boxes, laser engraving and pad printing on drinkware and executive gifts.",
      tag: "Precision Detail",
      color: "text-[#f78e1f]",
      bg: "bg-[#f78e1f]/10",
      border: "group-hover:border-[#f78e1f]",
    },
    {
      icon: Workflow,
      name: "Studio & Prepress",
      detail:
        "Artwork clean up, vector redraws, colour separation and proofing. Most files arriving from clients need work before they can be printed properly.",
      tag: "Free Verification",
      color: "text-[#783190]",
      bg: "bg-[#783190]/10",
      border: "group-hover:border-[#783190]",
    },
  ];

  return (
    <section className="relative overflow-hidden border-b border-[#783190]/10 bg-slate-50/50">
      {/* Subtle background decoration */}
      <div className="pointer-events-none absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-[#783190] opacity-[0.03] blur-3xl"></div>
      
      <div className="container-page relative z-10 py-16 sm:py-24 md:py-32">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 items-start">
          
          {/* Left Column: The Narrative */}
          <div className="lg:col-span-5 lg:sticky lg:top-32">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f78e1f]/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[#f78e1f] animate-pulse"></span>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f78e1f]">
                Under one roof
              </h2>
            </div>
            
            <h3 className="mt-6 text-3xl font-extrabold leading-tight tracking-tight text-[#783190] sm:text-4xl md:text-5xl">
              We make it, so we can promise the date.
            </h3>
            
            <div className="mt-6 space-y-4 text-base leading-relaxed text-[#783190]/70">
              <p>
                Suppliers who subcontract everything can only pass on someone else's timeline. Running
                the main production lines ourselves means a delay is ours to solve rather than ours to
                explain.
              </p>
              <p>
                Where a job genuinely needs a specialist, we say so upfront and we still manage it end
                to end. You deal with one contract and one point of contact either way.
              </p>
            </div>

            {/* Value Proposition Box */}
            <div className="mt-10 rounded-xl bg-white p-6 shadow-sm border border-slate-200">
              <h4 className="font-bold text-[#783190] mb-4 uppercase tracking-wide text-xs">
                The In-House Advantage
              </h4>
              <ul className="space-y-3">
                {[
                  "Direct quality control at every stage",
                  "No middleman markup on core products",
                  "Immediate troubleshooting if artwork fails",
                  "Enterprise-grade capacity guarantees"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#00a7a7]" />
                    <span className="text-sm font-medium text-[#783190]/80">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: The Grid */}
          <div className="lg:col-span-7">
            <div className="grid gap-6 sm:grid-cols-2">
              {LINES.map((l) => (
                <div 
                  key={l.name} 
                  className={`group relative flex flex-col rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border border-slate-150 ${l.border}`}
                >
                  {/* Top Header of Card */}
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${l.bg} ${l.color} transition-transform duration-300 group-hover:scale-110`}>
                      <l.icon className="h-6 w-6" />
                    </div>
                    <span className="inline-flex rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition-colors group-hover:bg-slate-200">
                      {l.tag}
                    </span>
                  </div>

                  {/* Body of Card */}
                  <div className="flex-1">
                    <h4 className="text-lg font-extrabold tracking-tight text-[#783190]">
                      {l.name}
                    </h4>
                    <p className="mt-2 text-sm leading-relaxed text-[#783190]/65">
                      {l.detail}
                    </p>
                  </div>
                  
                  {/* Decorative corner accent */}
                  <div className="absolute -bottom-2 -right-2 h-16 w-16 rounded-tl-3xl bg-slate-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100 -z-10"></div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
/**
 * What we commit to and what we will not do. Being specific about
 * refusals is more credible than a page of promises.
 */
function Standards() {
  const WE_DO = [
    "Send a digital proof and wait for your written approval before anything is printed",
    "Quote the full cost including setup, so the invoice matches the number you agreed",
    "Tell you honestly when a deadline is not achievable rather than accepting and failing",
    "Reprint at our cost when the fault is ours, no argument and no paperwork",
    "Keep your artwork on file so a reorder does not start from scratch",
  ];

  const WE_DO_NOT = [
    "Substitute a cheaper material or garment without telling you first",
    "Print from a low resolution file and hope it passes, we fix it or we flag it",
    "Quote a headline price and add setup fees at invoice stage",
    "Take on a rush job we cannot deliver just to hold the order",
  ];

  return (
    <section className="relative overflow-hidden border-b border-[#783190]/10 bg-slate-50/50 py-16 sm:py-24 md:py-28">
      <div className="container-page relative z-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f78e1f]/10 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[#f78e1f]"></span>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f78e1f]">
              How we hold ourselves
            </h2>
          </div>
          <h3 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-[#783190] sm:text-4xl md:text-5xl">
            The commitments that matter are the ones with teeth.
          </h3>
          <p className="mt-4 text-base leading-relaxed text-[#783190]/70 sm:text-lg">
            Every supplier claims quality. What tells you more is what they refuse to do when it
            would be easier not to refuse.
          </p>
        </div>

        <div className="mt-12 sm:mt-16 grid overflow-hidden rounded-2xl border border-slate-200 shadow-lg lg:grid-cols-2">
          <div className="bg-white p-7 sm:p-10 md:p-12">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00a7a7]/10 text-[#00a7a7]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#00a7a7]">
                  Standard Operating Procedure
                </h4>
                <h5 className="text-xl font-extrabold text-[#783190]">
                  What we always do
                </h5>
              </div>
            </div>

            <ul className="mt-8 space-y-5">
              {WE_DO.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3.5 text-sm leading-relaxed text-slate-700">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00a7a7]/15 text-[#00a7a7]">
                    <Check className="h-3.5 w-3.5 stroke-3" />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden bg-[#783190] p-7 text-white sm:p-10 md:p-12">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full "></div>

            <div className="relative z-10 flex items-center gap-3 border-b border-white/15 pb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#00a7a7]">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#00a7a7]">
                  Non-Negotiables
                </h4>
                <h5 className="text-xl font-extrabold text-white">
                  What we never do
                </h5>
              </div>
            </div>

            <ul className="relative z-10 mt-8 space-y-5">
              {WE_DO_NOT.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3.5 text-sm leading-relaxed text-white/85">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00a7a7] text-[ #783190]">
                    <X className="h-3.5 w-3.5 stroke-3" />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-[#00a7a7]/30 bg-linear-to-r from-[#00a7a7]/10 via-white to-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#00a7a7] text-white shadow-md">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#00a7a7]">
                  Ironclad Promise
                </span>
                <span className="h-1 w-1 rounded-full bg-[#00a7a7]"></span>
                <span className="text-xs font-bold text-[#783190]">Zero Risk</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-700 sm:text-base">
                <strong className="font-extrabold text-[#783190]">Our reprint guarantee:</strong> If the finished
                work does not match the proof you approved, we reproduce it immediately at our cost. That is the
                whole policy, which is why the proof stage is never skipped.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Where we are and how to reach a person. Local buyers want to know
 * there is a real place behind the website.
 */
function WhereToFindUs() {
  return (
    <section className="border-b border-brand-navy bg-brand-surface">
      <div className="container-page py-14 sm:py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.3em] text-brand-orange">
              Where we are
            </h2>
            <p className="mt-5 text-2xl font-extrabold leading-tight tracking-tight text-brand-navy sm:mt-6 sm:text-3xl md:text-4xl">
              Nairobi based, delivering across the region.
            </p>
            <p className="mt-5 text-base leading-relaxed text-brand-navy/70">
              Our production and studio sit in Nairobi, which is where most proofing, sampling and
              collection happens. From there we deliver nationwide through courier partners, and
              regularly handle orders into Uganda, Tanzania and beyond.
            </p>
            <p className="mt-4 text-base leading-relaxed text-brand-navy/70">
              Clients who want to see a sample before committing are welcome to visit. For large
              corporate rollouts we come to you.
            </p>
          </div>

          <div className="space-y-px border border-brand-navy/15 bg-brand-navy/15">
            <div className="flex items-start gap-4 bg-white p-6">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-brand-navy/50">
                  Studio and production
                </div>
                <div className="mt-1.5 text-base font-bold text-brand-navy">Nairobi, Kenya</div>
                <div className="mt-1 text-sm text-brand-navy/60">
                  Visits by appointment so someone is free to walk you through options
                </div>
              </div>
            </div>

            <a
              href="tel:+254762446077"
              className="flex items-start gap-4 bg-white p-6 transition-colors hover:bg-brand-navy/5"
            >
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-brand-navy/50">
                  Call or WhatsApp
                </div>
                <div className="mt-1.5 text-base font-bold text-brand-navy">+254 762 446 077</div>
                <div className="mt-1 text-sm text-brand-navy/60">
                  Fastest way to get a quick answer on a spec or a deadline
                </div>
              </div>
            </a>

            <a
              href="mailto:protocolpromotions@gmail.com"
              className="flex items-start gap-4 bg-white p-6 transition-colors hover:bg-brand-navy/5"
            >
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-brand-navy/50">
                  Email
                </div>
                <div className="mt-1.5 break-all text-base font-bold text-brand-navy">
                  protocolpromotions@gmail.com
                </div>
                <div className="mt-1 text-sm text-brand-navy/60">
                  Best for artwork files, purchase orders and formal quotes
                </div>
              </div>
            </a>

            <div className="flex items-start gap-4 bg-white p-6">
              <Globe2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-brand-navy/50">
                  Delivery reach
                </div>
                <div className="mt-1.5 text-base font-bold text-brand-navy">
                  Nationwide and East Africa
                </div>
                <div className="mt-1 text-sm text-brand-navy/60">
                  Courier delivery countrywide, with regional shipping on request
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Closing move. An about page that ends without a next step wastes
 * the trust it just built.
 */
function CallToAction() {
  return (
    <section className="relative overflow-hidden bg-white">
      <PressGrid />
      <div className="container-page relative py-14 sm:py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <Flame className="mx-auto h-8 w-8 text-brand-orange" />
          <h2 className="mt-7 text-2xl font-extrabold leading-tight tracking-tight text-brand-navy sm:mt-8 sm:text-3xl md:text-5xl">
            Tell us what you need made.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-brand-navy/70 sm:mt-6 sm:text-lg">
            Send the item, the quantity and the deadline. We will come back with an itemised quote,
            usually within one business day, and tell you honestly if the timeline is tight.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href="/request-quote"
              className="inline-flex w-full items-center justify-center gap-2 bg-brand-blue px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all hover:-translate-y-0.5 hover:brightness-95 sm:w-auto"
            >
              Request a quote
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/shop"
              className="inline-flex w-full items-center justify-center gap-2 border-2 border-brand-navy px-8 py-4 text-sm font-bold uppercase tracking-wide text-brand-navy transition-all hover:-translate-y-0.5 hover:border-brand-orange hover:text-brand-orange sm:w-auto"
            >
              Browse the catalogue
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}