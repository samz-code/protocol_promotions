import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/policies")({
  head: () => ({
    meta: [
      { title: "Policies — Protocol Promotions" },
      { name: "description", content: "Terms, privacy, refund and shipping policies." },
      { property: "og:title", content: "Policies — Protocol Promotions" },
      { property: "og:description", content: "Our commitments to you." },
    ],
  }),
  component: Policies,
});

const SECTIONS = [
  { t: "Terms & Conditions", b: "By using Protocol Promotions, you agree to accurate order details, timely artwork approval and payment terms outlined in each quote or order confirmation." },
  { t: "Privacy Policy", b: "We collect only the data required to fulfill your orders and communicate with you. We never sell your data. Full details available on request." },
  { t: "Refund Policy", b: "Custom-produced items are non-refundable once production begins. Errors on our part (misprint, wrong color, defective delivery) are re-produced or refunded at our cost." },
  { t: "Shipping Policy", b: "Nationwide delivery via trusted courier partners. Delivery fees and lead times depend on destination and order volume, and are confirmed at checkout." },
];

function Policies() {
  return (
    <SiteLayout>
      <PageHeader eyebrow="Policies" title="Our policies" />
      <section className="container-page py-14 md:py-20 max-w-3xl mx-auto space-y-8">
        {SECTIONS.map((s) => (
          <article key={s.t} className="rounded-xl border border-border bg-white p-6">
            <h2 className="text-xl font-bold text-brand-navy">{s.t}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.b}</p>
          </article>
        ))}
      </section>
    </SiteLayout>
  );
}