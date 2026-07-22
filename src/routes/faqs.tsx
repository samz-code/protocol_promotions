import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { ArrowRight, Package, Palette, Clock, Truck, CreditCard, Sparkles } from "lucide-react";

export const Route = createFileRoute("/faqs")({
  head: () => ({
    meta: [
      { title: "FAQs | Protocol Promotions" },
      { name: "description", content: "Answers to common questions about ordering, artwork, production, delivery, payment and design services." },
      { property: "og:title", content: "FAQs | Protocol Promotions" },
      { property: "og:description", content: "Everything you need to know before ordering branded merchandise, printing and signage in Kenya." },
    ],
  }),
  component: FAQ,
});

type FaqItem = { q: string; a: string };
type FaqGroup = { title: string; icon: typeof Package; items: FaqItem[] };

const GROUPS: FaqGroup[] = [
  {
    title: "Ordering & quantities",
    icon: Package,
    items: [
      {
        q: "What is the minimum order quantity?",
        a: "It depends on the product. Digital printing (business cards, flyers, posters, stickers) starts from a single unit, so you can order exactly what you need. Apparel and embroidered items typically start at 10 units because of setup, and screen printing becomes cost-effective from around 20 to 50 pieces. Each product page shows its own minimum order quantity (MOQ) clearly, and the configurator won't let you order below it. If you need a smaller run than the stated minimum, request a quote and we'll tell you what's possible.",
      },
      {
        q: "How does bulk pricing work?",
        a: "Every product uses volume tiers: the more you order, the lower the per-unit price. The product page shows the full pricing matrix, and the configurator applies the right tier automatically as you change the quantity, so you'll see the unit price drop in real time. For large corporate or event orders beyond the listed tiers, we negotiate dedicated contract pricing, so it's always worth requesting a quote for high volumes.",
      },
      {
        q: "Can I order a sample before committing to a full run?",
        a: "Yes, for most apparel and promotional items we can produce a single branded sample so you can check the print quality, colours and fit before approving the full quantity. Sample costs are quoted separately and are usually credited against your final order if you proceed. For printed materials, we always send a free digital proof first.",
      },
    ],
  },
  {
    title: "Artwork & files",
    icon: Palette,
    items: [
      {
        q: "What artwork formats do you accept?",
        a: "We work best with vector files such as PDF, AI (Adobe Illustrator) or EPS, because they scale to any size without losing sharpness, which matters for large-format signage and vehicle wraps. We also accept high-resolution PNG (with a transparent background) and PSD. Avoid low-resolution JPGs pulled from websites or social media; they usually print blurry. If you only have a low-quality file or no file at all, our design team can recreate or redraw your logo.",
      },
      {
        q: "What if I don't have print-ready artwork?",
        a: "That's common and not a problem. You can upload whatever you have at checkout or on the quote form, and our in-house designers will clean it up, convert it to a print-ready format, and send you a digital proof before anything goes to production. If you have no artwork at all, we can design it from scratch as part of a branding package.",
      },
      {
        q: "Will I see a proof before printing?",
        a: "Always. We never print without your sign-off. After you order and upload your artwork, our team prepares a digital proof showing exactly how your item will look, including placement, colours and dimensions. Production only begins once you approve it, which protects you from costly mistakes. This is why our production clock starts at artwork approval, not at the moment you order.",
      },
      {
        q: "Can you match specific brand colours?",
        a: "Yes. If you provide your brand's Pantone or CMYK values we'll match them as closely as the chosen print method and material allow. Screen printing and vinyl give the most accurate colour matching, while digital and sublimation are excellent for full-colour designs. Note that colours can appear slightly different across fabrics and finishes, which is another reason we recommend a sample for colour-critical jobs.",
      },
    ],
  },
  {
    title: "Production & turnaround",
    icon: Clock,
    items: [
      {
        q: "How long does production take?",
        a: "Standard turnaround is 48 to 72 hours after artwork approval for most in-stock items and straightforward print jobs. Apparel with embroidery, large signage installations, vehicle branding and high-volume orders take longer depending on scope, anywhere from a few days to a couple of weeks. Every product page lists its typical lead time, and your quote will confirm a firm timeline. If you have a hard deadline, tell us upfront and we'll advise whether a fast-track option is possible.",
      },
      {
        q: "Do you offer rush or fast-track production?",
        a: "For many products, yes. If you're working against an event date or launch, flag it when you request a quote and we'll tell you what can be expedited and any rush surcharge involved. Fast-track availability depends on the print method and how busy the production floor is, so the earlier you ask, the better.",
      },
      {
        q: "Can I track my order through production?",
        a: "Yes. Once you have an account, your dashboard shows each order's live production stage, from artwork approval through printing, quality check and dispatch, so you always know where things stand without having to call and ask.",
      },
    ],
  },
  {
    title: "Delivery & collection",
    icon: Truck,
    items: [
      {
        q: "Do you deliver outside Nairobi?",
        a: "Yes, we deliver nationwide across Kenya through reliable courier partners, and we regularly handle orders across East Africa. Delivery fees depend on your location, the size and weight of the order, and how urgent it is. For large or fragile items like signage and displays, we arrange appropriate handling so everything arrives intact.",
      },
      {
        q: "Can I collect my order in person?",
        a: "Yes. If you're in or near Nairobi you can choose pickup instead of delivery, which saves the courier fee. We'll notify you the moment your order passes quality check and is ready for collection.",
      },
      {
        q: "Do you handle on-site installation?",
        a: "For signage, shop branding, office branding and vehicle wraps, our team handles professional installation rather than just dropping off the materials. Installation scope and cost are confirmed on your quote, since they depend on the site, mounting surface and location.",
      },
    ],
  },
  {
    title: "Payment & invoicing",
    icon: CreditCard,
    items: [
      {
        q: "What payment methods do you accept?",
        a: "We accept M-Pesa, credit and debit cards, and direct bank transfer. M-Pesa is the fastest way to confirm an order. For registered businesses and repeat corporate clients we offer invoicing with agreed payment terms, so you don't have to pay upfront on every job.",
      },
      {
        q: "Do you require full payment before starting?",
        a: "For standard orders we typically take payment or a deposit before production begins, since each job is custom-made to your specification and can't be resold. For larger contracts and approved corporate accounts, we work with staged payments or invoicing terms. Your quote spells out exactly what's due and when, with no surprises.",
      },
      {
        q: "Can I get a formal invoice or receipt for my company?",
        a: "Yes. We issue proper invoices and receipts suitable for company accounting and reimbursement, including your business details. Just let us know your billing information when you order or request it from your dashboard.",
      },
    ],
  },
  {
    title: "Design & branding services",
    icon: Sparkles,
    items: [
      {
        q: "Can you design my logo or brand identity?",
        a: "Absolutely. Design sits at the core of what we do, not an afterthought. Our in-house team offers logo design, full brand identity (colours, typography, usage guidelines) and corporate branding systems. We can start from a blank page or refine what you already have, then carry that identity consistently across every item we produce for you, from business cards to vehicle wraps.",
      },
      {
        q: "I have a rough idea but no design. Can you help?",
        a: "That's exactly the kind of brief we like. Share whatever you have, whether a sketch, a description, examples you admire, or just your business name, and our designers will develop concepts for you. You'll see options and revisions before anything is finalised, so the end result genuinely reflects your brand.",
      },
      {
        q: "Do you offer branding for full corporate rollouts?",
        a: "Yes. We handle multi-item, multi-location corporate branding, covering office interiors, staff uniforms, fleet vehicle wraps, signage, packaging and promotional merchandise, as a coordinated system rather than piecemeal jobs. For rollouts of this scale we assign dedicated project handling and contract pricing. Request a quote describing the scope and we'll structure a proposal.",
      },
    ],
  },
];

function FAQ() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="FAQs"
        title="Frequently asked questions"
        description="Everything worth knowing before you order, from minimums and artwork to production, delivery and payment. If your question isn't here, reach out and we'll answer it directly."
      />

      <section className="container-page py-14 md:py-20">
        <div className="mx-auto max-w-3xl space-y-12">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <div className="flex items-center gap-3 border-b-2 border-brand-navy pb-4 mb-6">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-navy/5 text-brand-navy">
                  <group.icon className="h-5 w-5 text-brand-orange" />
                </span>
                <h2 className="text-xl font-extrabold tracking-tight text-brand-navy">{group.title}</h2>
              </div>

              <div className="space-y-3">
                {group.items.map((f) => (
                  <details
                    key={f.q}
                    className="group rounded-xl border border-border bg-white px-5 py-4 transition-colors open:border-brand-navy/30 open:bg-brand-surface/40 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="cursor-pointer list-none flex items-start justify-between gap-4">
                      <span className="font-bold text-brand-navy leading-snug">{f.q}</span>
                      <span className="mt-0.5 h-6 w-6 shrink-0 grid place-items-center rounded-full bg-brand-navy/5 text-brand-navy text-lg leading-none group-open:rotate-45 group-open:bg-brand-orange group-open:text-white transition-all">
                        +
                      </span>
                    </summary>
                    <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Still-have-questions CTA */}
        <div className="mx-auto max-w-3xl mt-14">
          <div className="rounded-xl bg-brand-navy text-white p-8 md:p-10">
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight">Still have a question?</h2>
                <p className="mt-2 text-sm text-white/70 leading-relaxed max-w-lg">
                  If we haven't covered it here, send us the details and we'll get back to you with a clear answer, and a quote if you need one.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-orange px-6 py-3 text-sm font-semibold text-white hover:brightness-95 transition-all"
                >
                  Contact us <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/request-quote"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-white/25 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  Request a quote
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}