import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import {
  Building2, GraduationCap, Stethoscope, Church, Globe,
  Building, Hotel, Utensils, HardHat, Factory,
  CalendarDays, Trophy, ArrowRight, Check,
} from "lucide-react";

export const Route = createFileRoute("/industries")({
  component: IndustriesPage,
});

type Sector = {
  name: string;
  icon: typeof Building2;
  desc: string;
  items: string[];
  note: string;
};

const SECTORS: Sector[] = [
  {
    name: "Corporate",
    icon: Building2,
    desc: "Executive welcome kits, office-wide stationery, and signage that reads as considered rather than templated. We run corporate accounts on standing specs, so a reorder six months out still matches the first run exactly.",
    items: ["Business cards & letterheads", "Branded notebooks & pens", "Office wayfinding signage", "Executive gift sets", "Presentation folders"],
    note: "Standing spec sheets for repeat orders",
  },
  {
    name: "Schools",
    icon: GraduationCap,
    desc: "Uniforms and sportswear that survive a full term of wear, plus the paperwork that keeps a school year running: ID cards, certificates, prospectus print runs, sized for cohorts, not one-off orders.",
    items: ["Sports kits & team wear", "Student ID cards", "Certificates printing", "Prospectus & brochure runs", "Event banners for open days"],
    note: "Bulk sizing across full cohorts",
  },
  {
    name: "Hospitals",
    icon: Stethoscope,
    desc: "Scrubs and staff uniforms in fabrics that hold up to repeated washing, directional signage that meets compliance requirements, and patient-facing forms that print clean at volume.",
    items: ["Staff scrubs & uniforms", "Wayfinding & compliance signage", "Patient forms & documentation", "Door plates & department signs", "Branded ID lanyards"],
    note: "Compliance-grade signage specs",
  },
  {
    name: "Churches",
    icon: Church,
    desc: "Outreach apparel, event banners for conferences and crusades, choir and ministry branding, and the bulletins and programs that go out weekly without fail.",
    items: ["Event & crusade banners", "Choir robes & ministry apparel", "Bulletins & programs", "Backdrop banners for services", "Branded merchandise for outreach"],
    note: "Reliable weekly print turnaround",
  },
  {
    name: "NGOs",
    icon: Globe,
    desc: "Field gear branded for visibility in the areas you operate, donor-facing reports that need to look credible, and campaign materials produced to a deadline that usually isn't moving.",
    items: ["Branded field gear & vests", "Donor report printing", "Campaign flyers & posters", "Branded jute & tote bags", "Awareness sticker campaigns"],
    note: "Deadline-locked campaign production",
  },
  {
    name: "Government",
    icon: Building,
    desc: "Protocol gifts for official functions, event infrastructure for public engagements, and the high-volume stationery runs that departments need without a broker markup in the middle.",
    items: ["Protocol & official gifts", "Event backdrops & signage", "High-volume stationery", "Certificates & official documents", "Branded flags"],
    note: "Direct in-house production, no subcontracting",
  },
  {
    name: "Hotels",
    icon: Hotel,
    desc: "Guest-facing amenities and collateral that carry the property's brand consistently from the room to the lobby, plus housekeeping and F&B uniforms built for daily wear.",
    items: ["Guest amenity branding", "Housekeeping & staff uniforms", "In-room welcome collateral", "Menu printing", "Branded drinkware"],
    note: "Consistent brand across guest touchpoints",
  },
  {
    name: "Restaurants",
    icon: Utensils,
    desc: "Aprons and front-of-house uniforms, menus reprinted fast when prices change, and packaging that holds up for delivery and takeaway without the branding smudging.",
    items: ["Aprons & staff uniforms", "Menu printing & reprints", "Branded packaging & boxes", "Table talkers & signage", "Loyalty & gift vouchers"],
    note: "Fast menu reprint turnaround",
  },
  {
    name: "Construction",
    icon: HardHat,
    desc: "Hi-vis safety wear that meets site requirements, hoarding boards and site signage that hold up outdoors, and worker uniforms produced at the volumes contractors actually need.",
    items: ["Hi-vis safety wear", "Site hoarding & signage", "Reflector jackets", "Branded hard hats & PPE tags", "Site ID badges"],
    note: "Outdoor-rated signage, 3+ year durability",
  },
  {
    name: "Manufacturing",
    icon: Factory,
    desc: "Durable staff workwear, floor safety signage, and product labelling that stands up to a factory environment rather than peeling off within a month.",
    items: ["Workwear & coveralls", "Safety signage & labels", "Product labelling", "Floor markings & stickers", "Staff ID & department tags"],
    note: "Built for factory-floor wear",
  },
  {
    name: "Events",
    icon: CalendarDays,
    desc: "Backdrops, lanyards, and stage branding produced on tight event timelines, including the 48-hour turnarounds that come with a confirmed date and no room to slip.",
    items: ["Stage backdrops", "Lanyards & badges", "Roll-up & X-banners", "Branded flags & bunting", "Photo/selfie frames"],
    note: "48-hour turnarounds available",
  },
  {
    name: "Sports clubs",
    icon: Trophy,
    desc: "Team jerseys and training kits, fan merchandise for match days, and sponsor board branding produced to club specs season after season.",
    items: ["Team jerseys & training kits", "Fan merchandise", "Trophies & awards", "Sponsor boards", "Branded scarves & flags"],
    note: "Consistent kit specs season to season",
  },
];

function IndustriesPage() {
  return (
    <SiteLayout>
      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.5; }
        }
        .dot-bg {
          background-image: radial-gradient(var(--color-brand-navy) 1px, transparent 1px);
          background-size: 24px 24px;
          animation: dotPulse 4s ease-in-out infinite;
        }
      `}</style>

      <section className="relative border-b border-brand-navy bg-white py-20 md:py-28">
        <div className="dot-bg absolute inset-0 opacity-[0.15]" />
        <div className="container-page relative">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-orange">
            Industry Specialization
          </p>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-brand-navy md:text-6xl">
            Production setups for <br />
            <span className="text-brand-orange">every professional field.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-brand-navy/70">
            We don't offer generic templates. We have engineered specific production workflows
            for these sectors, ensuring your brand identity meets your specific operational standards.
          </p>
        </div>
      </section>

      <section className="border-b border-brand-navy bg-white py-16 md:py-24">
        <div className="container-page">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SECTORS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.name}
                  className="group flex flex-col border border-brand-navy p-8 transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0_0_var(--color-brand-orange)]"
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center bg-brand-navy text-white transition-colors group-hover:bg-brand-orange">
                    <Icon className="h-7 w-7" />
                  </div>

                  <h3 className="text-xl font-extrabold text-brand-navy">{s.name}</h3>

                  <p className="mt-3 text-sm leading-relaxed text-brand-navy/70">
                    {s.desc}
                  </p>

                  <ul className="mt-5 space-y-2 border-t border-brand-navy/10 pt-5">
                    {s.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[13px] text-brand-navy/75">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-orange" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 border-t border-brand-navy/10 pt-4">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-brand-navy/45">
                      {s.note}
                    </span>
                  </div>

                  <Link
                    to="/request-quote"
                    className="group/link mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand-navy transition-colors hover:text-brand-orange"
                  >
                    Get a quote for {s.name.toLowerCase()}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}