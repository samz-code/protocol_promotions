import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "";

const entries = [
  { path: "/", priority: "1.0", changefreq: "weekly" as const },
  { path: "/shop", priority: "0.9", changefreq: "daily" as const },
  { path: "/services", priority: "0.8", changefreq: "monthly" as const },
  { path: "/industries", priority: "0.7", changefreq: "monthly" as const },
  { path: "/bulk-orders", priority: "0.8", changefreq: "monthly" as const },
  { path: "/request-quote", priority: "0.9", changefreq: "monthly" as const },
  { path: "/track-order", priority: "0.6", changefreq: "monthly" as const },
  { path: "/about", priority: "0.6", changefreq: "monthly" as const },
  { path: "/contact", priority: "0.7", changefreq: "monthly" as const },
  { path: "/faqs", priority: "0.5", changefreq: "monthly" as const },
  { path: "/testimonials", priority: "0.5", changefreq: "monthly" as const },
  { path: "/policies", priority: "0.3", changefreq: "yearly" as const },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = entries.map((e) =>
          `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
        );
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});