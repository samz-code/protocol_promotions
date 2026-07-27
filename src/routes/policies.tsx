import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import {
  FileText,
  ShieldCheck,
  RefreshCw,
  Truck,
  CreditCard,
  PencilRuler,
  Copyright,
  Lock,
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  Mail,
  Phone,
  Ban,
  Beaker,
  Scale,
  Clock,
  MapPin,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/policies")({
  head: () => ({
    meta: [
      { title: "Policies — Protocol Promotions" },
      {
        name: "description",
        content:
          "Terms of service, ordering, artwork and proofing, samples, payment, production, shipping, cancellations, refunds, warranties, intellectual property, privacy and governing law for Protocol Promotions Ltd, Nairobi.",
      },
      { property: "og:title", content: "Policies — Protocol Promotions" },
      {
        property: "og:description",
        content:
          "Clear, written commitments on ordering, proofing, payment, delivery, refunds and more.",
      },
    ],
  }),
  component: Policies,
});

/* ================================================================
   Contact + effective date
   Keep these in one place so every reference stays in sync.
   ================================================================ */

const COMPANY = "Protocol Promotions Ltd";
const CONTACT_EMAIL = "protocolpromotions@gmail.com";
const CONTACT_PHONE = "+254 762 446 077";
const EFFECTIVE_DATE = "1 July 2026";

/* ================================================================
   Policy content
   ================================================================ */

type Block =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "checks"; items: string[] }
  | { kind: "definitions"; items: { term: string; def: string }[] }
  | { kind: "note"; text: string };

type PolicySection = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  summary: string;
  blocks: Block[];
};

const SECTIONS: PolicySection[] = [
  {
    id: "terms",
    icon: FileText,
    title: "Terms of service",
    summary: "The agreement that governs every quote, order and delivery.",
    blocks: [
      {
        kind: "p",
        text: `These terms govern your use of ${COMPANY} ("we", "us", "our") and any order you place with us, whether online, by email, by phone, over WhatsApp or in person. Placing an order, approving a quotation or approving a proof means you accept these terms in full, and they take priority over any conflicting terms on your own purchase order unless we agree otherwise in writing.`,
      },
      {
        kind: "p",
        text: "A binding order exists once you have approved a written quotation and, where a deposit is required, that deposit has cleared into our account. Until both conditions are met, prices, stock availability and lead times are indicative and may change without notice.",
      },
      {
        kind: "definitions",
        items: [
          {
            term: "Quotation",
            def: "A written price we issue for a specific item, quantity, branding method and deadline. Valid for 14 days unless stated otherwise.",
          },
          {
            term: "Proof",
            def: "A digital mockup showing exact placement, size and colour, issued for your written approval before production.",
          },
          {
            term: "Order",
            def: "A quotation you have approved, together with any required deposit, that we have accepted and scheduled.",
          },
          {
            term: "Working day",
            def: "Monday to Friday, excluding public holidays observed in Kenya.",
          },
        ],
      },
      {
        kind: "p",
        text: "Every quotation is specific to the details stated on it. Changing the item, quantity, branding method or deadline after approval may change both the price and the completion date, and we will confirm the revised figures in writing before proceeding.",
      },
      {
        kind: "note",
        text: "Quotations are valid for 14 days from the date issued. After that, material, garment and stock prices may require a fresh quote.",
      },
    ],
  },
  {
    id: "ordering",
    icon: PencilRuler,
    title: "Ordering & specifications",
    summary: "What we need from you, and what counts as a complete brief.",
    blocks: [
      {
        kind: "p",
        text: "To open an order we need five things: the item, the quantity, the branding method, the delivery destination and the deadline. A photo or reference of what you want is enough to begin a conversation, but production only starts once the full specification is confirmed in writing and any required deposit has been received.",
      },
      {
        kind: "p",
        text: "You are responsible for the accuracy of every detail you supply. We reproduce exactly what you approve, so spelling, phone numbers, URLs, sizes, quantity-per-size breakdowns and colour references must be checked carefully by you before approval.",
      },
      {
        kind: "list",
        items: [
          "Minimum order quantities apply per product and are stated on each quotation; below the minimum, unit prices and setup costs change.",
          "Garment sizes and colour breakdowns must be confirmed before cutting, printing or embroidery begins.",
          "Stock items are subject to availability at the time your deposit is received; where an item is out of stock we will offer the closest equivalent for your approval rather than substitute silently.",
          "Slight variation in fabric shade, dye lot, weave and finish between production batches is normal and is not a defect.",
          "Where you reorder an item later, we cannot guarantee an identical shade match to a previous batch unless the same dye lot is still available.",
        ],
      },
      {
        kind: "note",
        text: "An incomplete brief is not an order. Nothing is reserved, scheduled or produced until the specification and deposit are confirmed.",
      },
    ],
  },
  {
    id: "artwork",
    icon: PencilRuler,
    title: "Artwork & proofing",
    summary: "Nothing enters production without a proof you have signed off.",
    blocks: [
      {
        kind: "p",
        text: "Every job is issued as a digital proof showing placement, size and colour before a single unit is made. Production does not begin until you approve that proof in writing. Verbal or implied approvals are not accepted, because the proof is the record we both rely on if a question arises later.",
      },
      {
        kind: "p",
        text: "Supply artwork as vector files (AI, EPS, PDF or SVG) or high-resolution raster files (300 DPI at final print size) wherever possible. Where supplied artwork is low resolution, incorrectly coloured, missing fonts or otherwise unsuitable, we will flag the risk in writing and set out exactly what will go wrong if we proceed.",
      },
      {
        kind: "checks",
        items: [
          "Basic artwork setup and one round of amendments are included at no extra charge.",
          "Extensive redesign, redrawing a logo from a photo, or vectorising low-quality art is quoted separately before we start.",
          "We keep your approved artwork on file so reorders skip the setup step.",
        ],
      },
      {
        kind: "list",
        items: [
          "Colours are matched as closely as each process allows; exact Pantone matching is only guaranteed where a Pantone reference is supplied and quoted for.",
          "Colours on a screen will not perfectly match colours on fabric, coated metal, glass or paper, because each material takes ink differently.",
          "Fine detail, small text and thin lines have practical limits that vary by method; we will advise if your artwork sits below them.",
          "Once you approve a proof, responsibility for any error visible on that proof passes to you.",
        ],
      },
      {
        kind: "note",
        text: "If what we deliver does not match the proof you approved, we reprint it at our cost. See the Refund & remedy policy below.",
      },
    ],
  },
  {
    id: "samples",
    icon: Beaker,
    title: "Samples & pre-production",
    summary: "When to ask for a physical sample, and how it is charged.",
    blocks: [
      {
        kind: "p",
        text: "For large runs, critical colour matching or a first-time product, we recommend a physical pre-production sample so you can approve the real item, not just a proof on screen. A sample is the surest way to remove uncertainty before we commit a full batch.",
      },
      {
        kind: "list",
        items: [
          "Sample costs and lead times are quoted separately and are additional to the main order.",
          "Where you proceed to a full order, the sample charge may be credited against it, as stated on your quotation.",
          "Approving a physical sample sets the standard the full run is measured against, allowing for the normal batch variation described above.",
          "Plain, unbranded stock samples can usually be provided faster than a fully branded pre-production sample.",
        ],
      },
      {
        kind: "note",
        text: "For any order where getting the colour or feel exactly right matters more than speed, ask for a sample first. It is cheaper than reprinting a full run.",
      },
    ],
  },
  {
    id: "payment",
    icon: CreditCard,
    title: "Payment terms",
    summary: "Deposits, balances and accepted payment methods.",
    blocks: [
      {
        kind: "p",
        text: "Custom production requires a deposit of 50% of the order value before work begins, with the balance due on completion and before dispatch or collection, unless written credit terms have been agreed. The deposit secures your slot in the production schedule and covers materials committed on your behalf.",
      },
      {
        kind: "checks",
        items: [
          "We accept M-Pesa, bank transfer and cash.",
          "Payment details are printed on the invoice we issue to you.",
          "A receipt is issued for every payment received.",
        ],
      },
      {
        kind: "list",
        items: [
          "Prices are quoted in Kenyan Shillings (KES), inclusive or exclusive of VAT exactly as stated on the quotation.",
          "Goods remain the property of " + COMPANY + " until they have been paid for in full.",
          "For approved credit accounts, invoices are due within the agreed term; overdue balances may pause active and future orders until settled.",
          "Where prices are tied to imported materials, significant currency movement between quotation and order may require a revised quote, which we will confirm before proceeding.",
        ],
      },
      {
        kind: "note",
        text: "Always confirm payment details against the invoice we issue. We will never ask you to send payment to a personal account or to a number sent by text alone. If in doubt, call us on " + CONTACT_PHONE + " to verify.",
      },
    ],
  },
  {
    id: "production",
    icon: RefreshCw,
    title: "Production & lead times",
    summary: "How we schedule work and what affects the completion date.",
    blocks: [
      {
        kind: "p",
        text: "Lead times quoted are working days counted from the later of two events: your written proof approval, and receipt of the required deposit. A quote approved late in the day, or after our daily cut-off, is scheduled from the next working day.",
      },
      {
        kind: "p",
        text: "Production runs on our own equipment, which is why we can commit to dates and hold to them. Where a delay is within our control we will tell you as soon as we know and agree a revised date with you. Delays caused by factors outside our reasonable control do not entitle you to cancel a confirmed order without settling work already completed.",
      },
      {
        kind: "list",
        items: [
          "Rush orders may be accommodated where capacity allows and are quoted with any express surcharge stated up front.",
          "Circumstances beyond our reasonable control, including supplier failure, power interruption, import and clearing delays, courier disruption and force majeure, may extend lead times.",
          "Quantities may vary by a small margin on large runs owing to the nature of the process; we bill for the quantity actually delivered, not the quantity ordered.",
          "If your deadline is immovable, tell us at the quotation stage so we can schedule against it rather than around it.",
        ],
      },
    ],
  },
  {
    id: "shipping",
    icon: Truck,
    title: "Shipping & delivery",
    summary: "Nairobi and countrywide delivery, fees and passing of risk.",
    blocks: [
      {
        kind: "p",
        text: "We deliver across Kenya through trusted courier partners, and offer same-day or next-day delivery within Nairobi where the order is ready and paid for. Delivery fees and windows depend on destination, weight and volume, and are confirmed on your invoice rather than hidden until the last step.",
      },
      {
        kind: "list",
        items: [
          "Nairobi: same-day or next-day delivery on ready, paid orders, subject to daily cut-off times.",
          "Countrywide: courier with tracking; transit time depends on the destination and the courier's own schedule.",
          "Collection from our premises is available by prior arrangement at no charge.",
          "Risk in the goods passes to you on delivery to the address you provide, or on collection by you or your representative.",
          "Where an order ships in parts by agreement, each part is treated as delivered when it reaches you.",
        ],
      },
      {
        kind: "p",
        text: "You are responsible for supplying a correct, complete delivery address and a reachable contact number. Re-delivery costs arising from an incorrect address, an unavailable recipient or a refused delivery are charged to you.",
      },
    ],
  },
  {
    id: "cancellations",
    icon: Ban,
    title: "Cancellations & changes",
    summary: "What happens if you need to change or stop an order.",
    blocks: [
      {
        kind: "p",
        text: "You may request a change or cancellation at any time, but what it costs depends on how far the order has progressed. Because custom work commits materials and machine time to you specifically, we cannot simply return everything to stock.",
      },
      {
        kind: "list",
        items: [
          "Before proof approval and before materials are committed: you may cancel with no charge beyond any design work already done.",
          "After proof approval but before production starts: any materials and stock already committed to your order are chargeable.",
          "Once production has started: the order is chargeable in full, as the branded goods cannot be resold to anyone else.",
          "Changes after approval are treated as a new specification and re-quoted; they may reset the lead time.",
        ],
      },
      {
        kind: "note",
        text: "The earlier you raise a change, the cheaper it is. Tell us the moment something needs to move.",
      },
    ],
  },
  {
    id: "refunds",
    icon: AlertTriangle,
    title: "Refund & remedy policy",
    summary: "When we reprint, when we refund and what is non-refundable.",
    blocks: [
      {
        kind: "p",
        text: "Custom-produced items are made to your specification and are non-refundable once production has begun, because they cannot be resold. This is standard for custom branding, and it is exactly why the proofing and sampling stages exist: to catch problems before they are printed.",
      },
      {
        kind: "p",
        text: "Where the fault is ours, we put it right at our cost. If delivered goods do not match the proof you approved, are misprinted, are the wrong colour, or arrive defective, we reproduce or refund the affected goods at our cost, with no invoice for the corrective run and no negotiation.",
      },
      {
        kind: "list",
        items: [
          "Report any issue within 5 working days of delivery, with clear photographs and your order reference.",
          "Faulty or off-spec goods must be available for inspection or return before a remedy is issued.",
          "Errors that were visible on a proof you approved are not covered, because approval transfers responsibility for that content to you.",
          "Normal batch variation in shade, weave or finish, as described in the ordering section, is not a defect.",
          "Where you cancel a confirmed order before completion, any work and materials already committed are chargeable.",
        ],
      },
      {
        kind: "note",
        text: "The remedy for a fault on our part is reproduction or refund of the affected goods. Our liability is limited to the value of the order concerned.",
      },
    ],
  },
  {
    id: "warranties",
    icon: ShieldCheck,
    title: "Warranties & liability",
    summary: "What we stand behind, and the limits of our responsibility.",
    blocks: [
      {
        kind: "p",
        text: "We warrant that goods will be produced with reasonable skill and care and will match the proof you approved, allowing for the normal material and batch variation described in these policies. That is a real commitment, backed by our reprint-at-our-cost remedy.",
      },
      {
        kind: "list",
        items: [
          "Our total liability for any order is limited to the value of that order.",
          "We are not liable for indirect or consequential loss, including lost profit, lost events or lost opportunity, arising from a delay or defect.",
          "We are not responsible for the durability of branding where the item is used or laundered outside our care instructions.",
          "Nothing in these policies limits any liability that cannot be limited by law.",
        ],
      },
    ],
  },
  {
    id: "ip",
    icon: Copyright,
    title: "Intellectual property",
    summary: "Who owns the artwork, and the warranty you give us.",
    blocks: [
      {
        kind: "p",
        text: "You retain ownership of logos, trademarks and artwork you supply. By sending them to us you confirm you have the right to use and reproduce them, and you agree to cover us against any third-party claim arising from their use in your order.",
      },
      {
        kind: "p",
        text: "Design work we originate for you is licensed to you for the agreed purpose on full payment. We may display finished, delivered work in our portfolio, on our website and in our marketing, unless you ask us in writing not to before the work is delivered.",
      },
    ],
  },
  {
    id: "privacy",
    icon: Lock,
    title: "Privacy policy",
    summary: "What data we hold, why, and your rights over it.",
    blocks: [
      {
        kind: "p",
        text: "We collect only the information we need to quote for, produce and deliver your order and to communicate with you about it. This typically means your name, business, contact details, delivery address and the artwork and order details you choose to provide.",
      },
      {
        kind: "list",
        items: [
          "We do not sell your personal data to anyone, for any reason.",
          "We share delivery details with our courier partners solely to complete your delivery.",
          "We keep records of orders and invoices for as long as the law requires and for legitimate business purposes.",
          "Payment is processed through the method you choose; we do not store full payment card details.",
          "Our website uses only the cookies needed to make it work and to understand, in aggregate, how it is used.",
        ],
      },
      {
        kind: "p",
        text: `You may ask us what personal data we hold about you, ask us to correct it, or ask us to delete it where we are not required to retain it, by contacting us at ${CONTACT_EMAIL}. We handle personal data in line with the Kenya Data Protection Act, 2019.`,
      },
    ],
  },
  {
    id: "law",
    icon: Scale,
    title: "Governing law",
    summary: "The law that applies, and how disputes are handled.",
    blocks: [
      {
        kind: "p",
        text: "These policies and any order placed under them are governed by the laws of Kenya, and the courts of Kenya have jurisdiction over any dispute.",
      },
      {
        kind: "p",
        text: "Before any dispute goes further, we ask that you raise it with us directly so we can try to resolve it quickly and fairly. In our experience almost everything is settled with a phone call and a photograph.",
      },
    ],
  },
  {
    id: "contact",
    icon: Mail,
    title: "Questions about these policies",
    summary: "How to reach us, and how changes are communicated.",
    blocks: [
      {
        kind: "p",
        text: `If anything here is unclear, or you would like a specific commitment in writing before ordering, contact us and we will confirm it. We may update these policies from time to time; the version in force is always the one published on this page, dated below, and it applies to orders placed after that date.`,
      },
    ],
  },
];

/* ================================================================
   Local animation layer
   ================================================================ */

function MotionStyles() {
  return (
    <style>{`
      @keyframes ppDotDriftP { 0% { background-position: 0 0; } 100% { background-position: 28px 28px; } }
      @keyframes ppRiseP { from { opacity: 0; transform: translate3d(0, 18px, 0); } to { opacity: 1; transform: none; } }
      @keyframes ppSweepP { 0% { transform: translateX(-120%); } 100% { transform: translateX(240%); } }

      .pp-dotsP {
        background-image: radial-gradient(var(--color-brand-navy) 1.15px, transparent 1.15px);
        background-size: 28px 28px;
        opacity: 0.08;
        animation: ppDotDriftP 24s linear infinite;
      }
      .pp-mask-fadeP {
        -webkit-mask-image: radial-gradient(ellipse 90% 80% at 30% 30%, #000 30%, transparent 80%);
        mask-image: radial-gradient(ellipse 90% 80% at 30% 30%, #000 30%, transparent 80%);
      }
      .pp-riseP { opacity: 0; }
      .pp-riseP.pp-inP { animation: ppRiseP 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

      .pp-underlineP {
        background-image: linear-gradient(var(--color-brand-orange), var(--color-brand-orange));
        background-repeat: no-repeat;
        background-position: 0 100%;
        background-size: 0% 2px;
        transition: background-size 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .pp-underlineP:hover { background-size: 100% 2px; }

      /* Card: animated left rail that grows on hover */
      .pp-card { position: relative; }
      .pp-card::before {
        content: "";
        position: absolute;
        left: 0; top: 0;
        height: 100%; width: 3px;
        background: var(--color-brand-orange);
        transform: scaleY(0);
        transform-origin: top;
        transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .pp-card:hover::before { transform: scaleY(1); }

      /* Sheen swipe across the icon tile on card hover */
      .pp-tile { position: relative; overflow: hidden; }
      .pp-tile::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(100deg, transparent, rgba(255,255,255,0.5), transparent);
        transform: translateX(-120%);
        pointer-events: none;
      }
      .pp-card:hover .pp-tile::after { animation: ppSweepP 0.8s ease-out; }

      @media (prefers-reduced-motion: reduce) {
        .pp-dotsP { animation: none !important; }
        .pp-riseP { opacity: 1 !important; }
        .pp-riseP.pp-inP { animation: none !important; }
        .pp-card::before { transition: none !important; }
        .pp-card:hover .pp-tile::after { animation: none !important; }
      }
    `}</style>
  );
}

/* ================================================================
   Scroll reveal, self-contained.
   ================================================================ */

function useReveal<T extends HTMLElement>(delay = 0) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = () => {
      if (delay) el.style.animationDelay = `${delay}ms`;
      el.classList.add("pp-inP");
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
        for (const e of entries) {
          if (e.isIntersecting) {
            show();
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return ref;
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useReveal<HTMLDivElement>(delay);
  return (
    <div ref={ref} className={`pp-riseP ${className}`}>
      {children}
    </div>
  );
}

/* ================================================================
   Active-section tracking for the sidebar table of contents.
   ================================================================ */

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string>(ids[0] ?? "");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids.join("|")]);
  return active;
}

/* ================================================================
   Block renderer
   ================================================================ */

function BlockView({ block }: { block: Block }) {
  if (block.kind === "p") {
    return <p className="text-[15px] leading-relaxed text-brand-navy/75">{block.text}</p>;
  }

  if (block.kind === "list") {
    return (
      <ul className="space-y-2.5">
        {block.items.map((item, i) => (
          <li
            key={i}
            className="group/li flex gap-3 text-[15px] leading-relaxed text-brand-navy/75 transition-colors hover:text-brand-navy"
          >
            <span
              aria-hidden="true"
              className="mt-2 h-1.5 w-1.5 shrink-0 bg-brand-orange transition-transform duration-300 group-hover/li:scale-150"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === "checks") {
    return (
      <ul className="grid gap-2.5">
        {block.items.map((item, i) => (
          <li
            key={i}
            className="group/ck flex items-start gap-3 border border-brand-navy/10 bg-brand-surface px-4 py-3 text-[14px] leading-relaxed text-brand-navy/80 transition-all duration-300 hover:border-brand-orange hover:bg-white"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange transition-transform duration-300 group-hover/ck:scale-110" />
            <span className="transition-colors group-hover/ck:text-brand-navy">{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === "definitions") {
    return (
      <dl className="grid gap-px overflow-hidden border border-brand-navy/12 bg-brand-navy/12 sm:grid-cols-2">
        {block.items.map((d, i) => (
          <div
            key={i}
            className="group/df bg-white p-4 transition-colors duration-300 hover:bg-brand-navy"
          >
            <dt className="text-sm font-extrabold text-brand-navy transition-colors duration-300 group-hover/df:text-brand-orange">
              {d.term}
            </dt>
            <dd className="mt-1 text-[13px] leading-relaxed text-brand-navy/70 transition-colors duration-300 group-hover/df:text-white/80">
              {d.def}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  // note
  return (
    <div className="group/nt border-l-2 border-brand-orange bg-brand-surface px-5 py-4 transition-colors duration-300 hover:bg-brand-navy">
      <p className="text-[14px] font-semibold leading-relaxed text-brand-navy transition-colors duration-300 group-hover/nt:text-white">
        {block.text}
      </p>
    </div>
  );
}

/* ================================================================
   Page
   ================================================================ */

function Policies() {
  const ids = SECTIONS.map((s) => s.id);
  const active = useActiveSection(ids);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <SiteLayout>
      <MotionStyles />

      {/* ---- Page header ---- */}
      <section className="relative overflow-hidden border-b border-brand-navy bg-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 pp-dotsP pp-mask-fadeP" />
        <div className="container-page relative px-5 py-14 sm:px-6 sm:py-20">
          <Reveal>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-brand-orange">
              <span className="inline-block h-1.5 w-1.5 bg-brand-orange" />
              Policies
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-4 max-w-3xl text-[2rem] font-extrabold leading-[1.08] tracking-tight text-brand-navy sm:text-5xl">
              Clear commitments, put in writing
            </h1>
          </Reveal>
          <Reveal delay={150}>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-brand-navy/70 sm:text-lg">
              Everything that governs how we quote, produce and deliver your order, in plain
              language. If you want a specific point confirmed before you order, ask us and we will
              put it in writing.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 border border-brand-navy/15 bg-brand-surface px-3 py-1.5 text-[12px] font-semibold text-brand-navy/70 transition-colors hover:border-brand-orange">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-orange" />
                In effect from {EFFECTIVE_DATE}
              </span>
              <span className="inline-flex items-center gap-2 border border-brand-navy/15 bg-brand-surface px-3 py-1.5 text-[12px] font-semibold text-brand-navy/70 transition-colors hover:border-brand-orange">
                <MapPin className="h-3.5 w-3.5 text-brand-orange" />
                Nairobi, Kenya
              </span>
              <span className="inline-flex items-center gap-2 border border-brand-navy/15 bg-brand-surface px-3 py-1.5 text-[12px] font-semibold text-brand-navy/70 transition-colors hover:border-brand-orange">
                <Clock className="h-3.5 w-3.5 text-brand-orange" />
                {SECTIONS.length} sections
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Body: sidebar TOC + content ---- */}
      <section className="relative bg-white">
        <div className="container-page px-5 py-12 sm:px-6 sm:py-16 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[16rem_1fr] lg:gap-16">
            {/* Sidebar */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="hidden lg:block">
                <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-brand-navy/45">
                  On this page
                </p>
                <nav className="flex flex-col border-l border-brand-navy/12">
                  {SECTIONS.map((s, i) => {
                    const isActive = active === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => scrollTo(s.id)}
                        className={`group relative -ml-px flex items-center gap-2 border-l-2 py-2 pl-4 text-left text-sm transition-all duration-300 ${
                          isActive
                            ? "border-brand-orange font-bold text-brand-navy"
                            : "border-transparent font-semibold text-brand-navy/55 hover:border-brand-orange/40 hover:pl-5 hover:text-brand-navy"
                        }`}
                      >
                        <span
                          className={`text-[10px] font-bold tabular-nums transition-colors ${
                            isActive ? "text-brand-orange" : "text-brand-navy/30 group-hover:text-brand-orange"
                          }`}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {s.title}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Mobile: chip list */}
              <div className="flex flex-wrap gap-2 lg:hidden">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => scrollTo(s.id)}
                    className="border border-brand-navy/15 bg-brand-surface px-3 py-1.5 text-xs font-semibold text-brand-navy/75 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-orange hover:bg-brand-navy hover:text-white"
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </aside>

            {/* Content */}
            <div className="min-w-0 space-y-5 sm:space-y-6">
              {SECTIONS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <Reveal key={s.id} delay={Math.min(i, 4) * 50}>
                    <article
                      id={s.id}
                      className="pp-card group scroll-mt-24 overflow-hidden border border-brand-navy/15 bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-navy hover:shadow-[8px_8px_0_0_var(--color-brand-navy)] sm:p-8"
                    >
                      <div className="flex items-start gap-4 border-b border-brand-navy/10 pb-5">
                        <span className="pp-tile flex h-11 w-11 shrink-0 items-center justify-center border border-brand-navy/15 bg-brand-surface transition-colors duration-300 group-hover:border-brand-orange">
                          <Icon className="h-5 w-5 text-brand-orange" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold tabular-nums text-brand-navy/30">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <h2 className="text-xl font-extrabold leading-tight text-brand-navy sm:text-2xl">
                              {s.title}
                            </h2>
                          </div>
                          <p className="mt-1 text-sm text-brand-navy/55">{s.summary}</p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-4">
                        {s.blocks.map((b, bi) => (
                          <BlockView key={bi} block={b} />
                        ))}
                      </div>
                    </article>
                  </Reveal>
                );
              })}

              {/* Contact callout */}
              <Reveal delay={100}>
                <div className="group relative overflow-hidden border border-brand-navy bg-brand-navy p-6 text-white transition-shadow duration-300 hover:shadow-[8px_8px_0_0_var(--color-brand-orange)] sm:p-8">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-[0.12] transition-opacity duration-500 group-hover:opacity-[0.2]"
                    style={{
                      backgroundImage:
                        "radial-gradient(rgba(255,255,255,0.9) 1.2px, transparent 1.2px)",
                      backgroundSize: "30px 30px",
                    }}
                  />
                  <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold sm:text-2xl">
                        Want a commitment confirmed before you order?
                      </h2>
                      <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">
                        Tell us the point you need in writing. We would rather agree it up front than
                        argue it later.
                      </p>
                      <div className="mt-5 flex flex-col gap-2 text-sm sm:flex-row sm:gap-6">
                        <a
                          href={`mailto:${CONTACT_EMAIL}`}
                          className="inline-flex items-center gap-2 font-semibold text-white transition-colors hover:text-brand-orange"
                        >
                          <Mail className="h-4 w-4 text-brand-orange" />
                          {CONTACT_EMAIL}
                        </a>
                        <a
                          href={`tel:${CONTACT_PHONE.replace(/\s+/g, "")}`}
                          className="inline-flex items-center gap-2 font-semibold text-white transition-colors hover:text-brand-orange"
                        >
                          <Phone className="h-4 w-4 text-brand-orange" />
                          {CONTACT_PHONE}
                        </a>
                      </div>
                    </div>
                    <Link
                      to="/request-quote"
                      className="group/btn inline-flex shrink-0 items-center justify-center gap-2 bg-brand-orange px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_rgba(255,255,255,0.35)]"
                    >
                      Request a quote
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={120}>
                <p className="pt-2 text-center text-xs text-brand-navy/45">
                  These policies are in effect from {EFFECTIVE_DATE}. {COMPANY}, Nairobi, Kenya.
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Back to top */}
      <button
        type="button"
        onClick={() => {
          const reduced =
            typeof window !== "undefined" &&
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
        }}
        aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-40 grid h-11 w-11 place-items-center border border-brand-navy bg-white text-brand-navy shadow-[4px_4px_0_0_var(--color-brand-navy)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-navy hover:text-white hover:shadow-[4px_4px_0_0_var(--color-brand-orange)] ${
          showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </SiteLayout>
  );
}