import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Star, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/testimonials")({
  head: () => ({
    meta: [
      { title: "Testimonials — Protocol Promotions" },
      { name: "description", content: "What our clients say about working with Protocol Promotions." },
      { property: "og:title", content: "Testimonials — Protocol Promotions" },
      { property: "og:description", content: "Client stories and reviews." },
    ],
  }),
  component: TestimonialsPage,
});

/* ================================================================
   Reviews
   ================================================================ */

const GOOGLE_REVIEWS_URL =
  "https://www.google.com/maps/place/Protocol+Promotions+Ltd./@-1.2803404,36.8252491,1189m/data=!3m2!1e3!4b1!4m6!3m5!1s0x182f11a67bb07663:0x5b54221b99d2823f!8m2!3d-1.2803404!4d36.8252491?hl=en";

type Review = { name: string; meta: string; body: string };

const REVIEWS: Review[] = [
  {
    name: "Lynn Ngina",
    meta: "1 review",
    body: "Really appreciated the work of the team at Protocol. They are very effective and reliable. They have a great selection of products and merchandise that are delivered with good customer service. Would definitely recommend them.",
  },
  {
    name: "Muthii The Voice",
    meta: "Local Guide, 41 reviews",
    body: "Very resourceful suppliers when it comes to promotional merchandise. Keep at it.",
  },
  {
    name: "Fedinard Kitheka",
    meta: "1 review",
    body: "Unique products, good customer service and quality branding. My all time first priority shop in merchandise and branding.",
  },
  {
    name: "Dane Waithaka",
    meta: "6 reviews",
    body: "Protocol team is very efficient, consistent and observes time frames. They deliver products and branding. Customer care is good. I would recommend them any time of the season.",
  },
  {
    name: "Dynamic Vector",
    meta: "3 reviews",
    body: "High quality products, great customer service. Definitely a one-stop shop for all branding items.",
  },
  {
    name: "Racheal Njeri",
    meta: "1 review",
    body: "Very professional team. If you ever need gift ideas, especially branded items, this is your go-to vendor. They always understand the assignment.",
  },
  {
    name: "John Wakairi",
    meta: "2 reviews",
    body: "Great stuff. Quality branding, up to date technology in practice. Keep up the good work.",
  },
];

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

function Reviews() {
  const loop = [...REVIEWS, ...REVIEWS];
  return (
    <section className="overflow-hidden border-b border-brand-navy bg-brand-surface">
      <style>{`
        @keyframes reviewMarquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .review-track { animation: reviewMarquee 60s linear infinite; }
        .review-track:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .review-track { animation: none; }
        }
      `}</style>

      <div className="container-page pt-16 md:pt-24">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-brand-navy pb-6">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center border border-brand-navy/15 bg-white p-2 shadow-sm">
              <GoogleIcon />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-brand-navy md:text-4xl">
                What clients say on Google
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex gap-0.5 text-brand-orange">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <span className="text-sm font-bold tabular-nums text-brand-navy">5.0</span>
                <span className="text-sm text-brand-navy/55">verified listing metrics</span>
              </div>
            </div>
          </div>

          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-navy transition-colors hover:text-brand-orange"
          >
            Read them on Google
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="mt-10 pb-16 md:pb-24">
        <div className="review-track flex w-max gap-px">
          {loop.map((r, i) => {
            const initial = r.name.charAt(0);
            return (
              <figure
                key={`${r.name}-${i}`}
                className="relative w-80 shrink-0 border border-brand-navy/15 bg-white p-6 transition-colors hover:border-brand-navy"
              >
                <div className="absolute right-6 top-6 h-4 w-4 opacity-40">
                  <GoogleIcon />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center bg-brand-navy text-sm font-bold uppercase text-white">
                    {initial}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-brand-navy">{r.name}</div>
                    <div className="text-[11px] text-brand-navy/50">{r.meta}</div>
                  </div>
                </div>

                <div className="mt-4 flex gap-0.5 text-brand-orange">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>

                <blockquote className="mt-3 text-sm leading-relaxed text-brand-navy/75">
                  "{r.body}"
                </blockquote>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TestimonialsPage() {
  return (
    <SiteLayout>
      <PageHeader 
        eyebrow="Testimonials" 
        title="Trusted by teams across Kenya" 
      />
      <Reviews />
    </SiteLayout>
  );
}