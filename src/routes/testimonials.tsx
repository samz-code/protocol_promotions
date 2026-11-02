import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { ClientReviews } from "@/components/site/ClientReviews";

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

function TestimonialsPage() {
  return (
    <SiteLayout>
      <PageHeader 
        eyebrow="Testimonials" 
        title="Trusted by teams across Kenya" 
      />
      <ClientReviews />
    </SiteLayout>
  );
}