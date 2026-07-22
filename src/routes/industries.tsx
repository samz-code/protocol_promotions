import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { 
  Building2, GraduationCap, Stethoscope, Church, Globe, 
  Building, Hotel, Utensils, HardHat, Factory, 
  CalendarDays, Trophy, ArrowRight 
} from "lucide-react";

export const Route = createFileRoute("/industries")({
  component: IndustriesPage,
});

// Added detailed content per sector
const SECTORS = [
  { name: "Corporate", icon: Building2, desc: "Executive welcome kits, branded office stationery, and high-end internal signage." },
  { name: "Schools", icon: GraduationCap, desc: "Custom uniforms, branded sports kits, and academic event materials." },
  { name: "Hospitals", icon: Stethoscope, desc: "Staff scrubs, patient care packages, and clear directional wayfinding signage." },
  { name: "Churches", icon: Church, desc: "Branded outreach apparel, event banners, and Ministry stationery sets." },
  { name: "NGOs", icon: Globe, desc: "Project-branded field gear, awareness campaign prints, and bulk merchandise." },
  { name: "Government", icon: Building, desc: "Official protocol gifts, branded event infrastructure, and high-volume stationery." },
  { name: "Hotels", icon: Hotel, desc: "Branded guest amenities, housekeeping uniforms, and welcome collateral." },
  { name: "Restaurants", icon: Utensils, desc: "Custom aprons, branded menus, table talkers, and staff uniforms." },
  { name: "Construction", icon: HardHat, desc: "High-visibility safety gear, site hoarding boards, and branded worker uniforms." },
  { name: "Manufacturing", icon: Factory, desc: "Hard-wearing staff uniforms, labels, and safety signage for factory floors." },
  { name: "Events", icon: CalendarDays, desc: "Event-specific lanyards, stage backdrops, and promotional swag packs." },
  { name: "Sports clubs", icon: Trophy, desc: "Team jerseys, fan merchandise, and tournament branding materials." },
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
                <div key={s.name} className="flex flex-col border border-brand-navy p-8 transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0_0_var(--color-brand-orange)]">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center bg-brand-navy text-white">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-extrabold text-brand-navy">
                    {s.name}
                  </h3>
                  <p className="mt-3 grow text-sm leading-relaxed text-brand-navy/70">
                    {s.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}