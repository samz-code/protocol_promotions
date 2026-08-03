import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import {
  TrendingUp, Building2, Truck,
  ClipboardList, ShieldCheck, FileText,
  ArrowRight, Check, X,
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
          title="This isn't the shop. It's a different process, built for organizations."
          description="If you're ordering one item at a time, use the shop. If you need the same branded item produced consistently across 50, 500, or 5,000 units, coordinated for one launch date, this is the process built for that."
        />
      </div>

      {/* Shop vs Bulk comparison */}
      <section className="container-page py-20">
        <h2 className="text-3xl font-extrabold text-brand-navy mb-3">How this is different from ordering in the shop</h2>
        <p className="text-foreground/70 max-w-2xl mb-10 leading-relaxed">
          The shop is built for one order at a time: pick a product, pick a quantity, check out. Bulk orders skip the catalog entirely and start with a conversation, because volume orders usually need something the shop can't offer.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border border-border p-8 rounded-xl">
            <h3 className="font-bold text-brand-navy text-lg mb-5">Ordering in the shop</h3>
            <ul className="space-y-3 text-sm text-foreground/70">
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-brand-navy/40 mt-0.5 shrink-0" /> Fixed catalog items, standard specs</li>
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-brand-navy/40 mt-0.5 shrink-0" /> Priced per unit at listed MOQ</li>
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-brand-navy/40 mt-0.5 shrink-0" /> Good for one-off or small orders</li>
            </ul>
          </div>

          <div className="bg-brand-blue text-white p-8 rounded-xl">
            <h3 className="font-bold text-lg mb-5">Bulk orders</h3>
            <ul className="space-y-3 text-sm text-white/80">
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-brand-navy mt-0.5 shrink-0" /> Custom specs, materials, and branding methods matched to your budget</li>
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-brand-navy mt-0.5 shrink-0" /> Unit price drops as your quantity grows</li>
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-brand-navy mt-0.5 shrink-0" /> One contact managing files, production, and shipping</li>
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-brand-navy mt-0.5 shrink-0" /> Every unit checked against one approved master sample</li>
              <li className="flex items-start gap-2"><Check className="h-4 w-4 text-brand-navy mt-0.5 shrink-0" /> Delivery coordinated across multiple offices or branches</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Who this is for */}
      <section className="bg-brand-navy/5 py-20 border-y border-border">
        <div className="container-page">
          <h2 className="text-3xl font-extrabold text-brand-navy mb-3">When to use bulk instead of the shop</h2>
          <p className="text-foreground/70 max-w-2xl mb-10 leading-relaxed">
            A few situations where the shop's per-item checkout stops making sense, and this process is the better fit.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "A companywide rollout", desc: "New uniforms, ID cards, or welcome kits for every staff member at once, not ordered department by department." },
              { title: "An event with a fixed date", desc: "Lanyards, banners, and delegate kits that all need to land before a specific date, produced as one coordinated job." },
              { title: "Multi-branch delivery", desc: "The same branded items need to reach several offices, branches, or franchise locations, not just one." },
              { title: "Custom specs the shop doesn't list", desc: "A material, finish, or branding method not in the standard catalog, built around your budget and use case." },
              { title: "A tender or contract requirement", desc: "Government or corporate procurement that requires formal quotes, consistent specs, and documented quality checks." },
              { title: "Recurring seasonal orders", desc: "The same items reordered every term, quarter, or year, where saved specs mean you're not re-briefing from scratch each time." },
            ].map((item) => (
              <div key={item.title} className="bg-white p-6 rounded-xl border border-border">
                <h4 className="font-bold text-brand-navy">{item.title}</h4>
                <p className="text-sm text-foreground/70 mt-2 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container-page py-20">
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2 mb-2">
              <h2 className="text-3xl font-extrabold text-brand-navy">What you get with a bulk account</h2>
            </div>
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
            <div className="sticky top-24 bg-brand-blue text-white p-8 rounded-xl">
              <h2 className="text-2xl font-extrabold">Need a custom quote?</h2>
              <p className="mt-4 text-white/80 leading-relaxed">
                Provide us with your quantities, deadline, and artwork. Our bulk specialists will build a detailed proposal for you within one business day.
              </p>
              <div className="mt-8">
                <InlineCTA href="/request-quote" label="Request a Bulk Quote" />
              </div>
              <p className="mt-4 text-xs text-white/50">
                Not sure if your order counts as bulk? Send it through anyway, we'll tell you the fastest route.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="bg-brand-navy/5 py-20 border-y border-border">
        <div className="container-page">
          <h2 className="text-3xl font-extrabold text-brand-blue mb-3">How a bulk order actually runs</h2>
          <p className="text-foreground/70 max-w-2xl mb-12 leading-relaxed">
            Three stages, in order. Nothing moves to production until you've approved a physical or digital sample.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Specs & Scope", desc: "Tell us what you need: item, quantity, deadline, delivery locations. We'll suggest the best materials and branding methods for your budget." },
              { step: "02", title: "Proofing & Samples", desc: "We provide digital proofs and physical samples so you sign off on the exact item before we produce it at volume." },
              { step: "03", title: "Production & Logistics", desc: "We handle printing, quality checks against your approved sample, and delivery to your offices, events, or branches nationwide." }
            ].map((s) => (
              <div key={s.step} className="bg-white p-8 rounded-xl border border-border">
                <div className="text-brand-orange font-bold mb-4">{s.step}</div>
                <h4 className="text-lg font-bold text-brand-blue mb-2">{s.title}</h4>
                <p className="text-sm text-foreground/70">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/request-quote"
              className="inline-flex items-center gap-2 text-brand-navy font-bold hover:text-brand-orange transition-colors"
            >
              Start with your specs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}