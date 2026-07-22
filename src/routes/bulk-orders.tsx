import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { 
  TrendingUp, Building2, Truck, 
  ClipboardList, ShieldCheck, FileText 
} from "lucide-react";
import { InlineCTA } from "@/components/site/PlaceholderSection";

export const Route = createFileRoute("/bulk-orders")({
  head: () => ({
    meta: [
      { title: "Bulk Orders | Protocol Promotions" },
      { name: "description", content: "High-volume branding and printing for organizations. Dedicated account management, tiered pricing, and guaranteed lead times." },
    ],
  }),
  component: BulkPage,
});

function PressGrid() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-[0.05]" 
         style={{
           backgroundImage: 'linear-gradient(var(--color-brand-navy) 1px, transparent 1px), linear-gradient(90deg, var(--color-brand-navy) 1px, transparent 1px)',
           backgroundSize: '40px 40px'
         }} 
    />
  );
}

function BulkPage() {
  return (
    <SiteLayout>
      {/* Header */}
      <div className="relative border-b border-brand-navy bg-white">
        <PressGrid />
        <PageHeader 
          eyebrow="Enterprise Bulk Orders" 
          title="Built for volume. Priced for scale." 
          description="Whether it's a nationwide staff uniform rollout, event kits for thousands, or custom-packaged promotional goods, we handle the logistics so you can focus on the launch." 
        />
      </div>

      {/* Benefits Section */}
      <section className="container-page py-20">
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-6">
            {[
              { title: "Volume Pricing", desc: "The larger your order, the lower your unit cost. We pass those savings directly to your bottom line.", icon: TrendingUp },
              { title: "Dedicated Support", desc: "A single point of contact who manages your files, production, and shipping from start to finish.", icon: Building2 },
              { title: "Guaranteed Timelines", desc: "We provide firm production schedules so you never have to guess when your items will arrive.", icon: ClipboardList },
              { title: "Nationwide Shipping", desc: "Reliable, insured delivery to any location in Kenya, coordinated by our logistics team.", icon: Truck },
              { title: "Quality Assurance", desc: "Every batch is checked against your approved master sample for 100% consistency.", icon: ShieldCheck },
              { title: "Repeat Orders", desc: "We save your artwork and specs, making re-ordering as simple as a single email.", icon: FileText }
            ].map((item, i) => (
              <div key={i} className="bg-white border border-border p-8 rounded-xl shadow-sm hover:border-brand-orange transition-all">
                <item.icon className="h-8 w-8 text-brand-orange mb-4" />
                <h3 className="font-bold text-brand-navy text-lg">{item.title}</h3>
                <p className="text-sm text-foreground/70 mt-2 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Sticky Quote Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-brand-navy text-white p-8 rounded-xl">
              <h2 className="text-2xl font-extrabold">Need a custom quote?</h2>
              <p className="mt-4 text-white/80 leading-relaxed">
                Provide us with your quantities, deadline, and artwork. Our bulk specialists will build a detailed proposal for you within one business day.
              </p>
              <div className="mt-8">
                <InlineCTA href="/request-quote" label="Request a Bulk Quote" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="bg-brand-navy/5 py-20 border-y border-border">
        <div className="container-page">
          <h2 className="text-3xl font-extrabold text-brand-navy mb-12">The Enterprise Workflow</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Specs & Scope", desc: "Tell us what you need. We'll suggest the best materials and branding methods for your budget." },
              { step: "02", title: "Proofing & Samples", desc: "We provide digital proofs and physical samples so you can see exactly what you're buying." },
              { step: "03", title: "Production & Logistics", desc: "We handle the printing and delivery to your offices, events, or branches nationwide." }
            ].map((s) => (
              <div key={s.step} className="bg-white p-8 rounded-xl border border-border">
                <div className="text-brand-orange font-bold mb-4">{s.step}</div>
                <h4 className="text-lg font-bold text-brand-navy mb-2">{s.title}</h4>
                <p className="text-sm text-foreground/70">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}