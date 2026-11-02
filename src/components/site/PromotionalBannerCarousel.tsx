import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  fetchPromotionalBanners,
  isPromotionalBannerActive,
  type PromotionalBanner,
} from "@/lib/promotionalBanners";

function BannerLink({
  banner,
  children,
}: {
  banner: PromotionalBanner;
  children: React.ReactNode;
}) {
  const href = banner.href.trim();
  const className = "absolute inset-0 block overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/50";

  if (!href) return <div className={className}>{children}</div>;
  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={banner.name} className={className}>
        {children}
      </a>
    );
  }
  if (/^(mailto:|tel:)/i.test(href)) {
    return <a href={href} aria-label={banner.name} className={className}>{children}</a>;
  }
  return <Link to={href} aria-label={banner.name} className={className}>{children}</Link>;
}

export function PromotionalBannerCarousel() {
  const bannersQuery = useQuery({
    queryKey: ["promotional-banners"],
    queryFn: fetchPromotionalBanners,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const banners = useMemo(
    () => (bannersQuery.data ?? []).filter((banner) => isPromotionalBannerActive(banner)),
    [bannersQuery.data],
  );

  useEffect(() => {
    if (bannersQuery.isError) console.error("Unable to load homepage promotional banners:", bannersQuery.error);
  }, [bannersQuery.error, bannersQuery.isError]);

  useEffect(() => setActiveIndex(0), [banners.length]);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % banners.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (!banners.length) return null;

  const currentIndex = activeIndex % banners.length;
  const current = banners[currentIndex];

  return (
    <section
      aria-label="Featured ads and offers"
      aria-roledescription="carousel"
      className="bg-brand-surface px-3 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-7"
    >
      <div className={`relative mx-auto ${current.format === "flyer" ? "max-w-md" : "max-w-6xl"}`}>
        <div
          className={`relative overflow-hidden rounded-xl bg-brand-navy shadow-sm ${
            current.format === "flyer" ? "aspect-4/5 max-h-[min(72vh,720px)]" : "aspect-2/1"
          }`}
        >
          <BannerLink key={current.id} banner={current}>
            <img src={current.image_url} alt={current.alt_text || current.name} className="h-full w-full object-cover" />
          </BannerLink>
        </div>

        {banners.length > 1 && (
          <>
            <div
              className="absolute bottom-3 left-1/2 z-10 flex max-w-[calc(100%-5rem)] -translate-x-1/2 items-center justify-center gap-1.5 overflow-hidden rounded-full bg-white/70 px-2 py-1 sm:bottom-4"
              role="group"
              aria-label="Choose a banner"
            >
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  aria-label={`Show banner ${index + 1}: ${banner.name}`}
                  aria-current={index === currentIndex}
                  onClick={() => setActiveIndex(index)}
                  className={`h-2 shrink-0 rounded-full border border-brand-navy/60 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange ${
                    index === currentIndex ? "w-6 bg-brand-navy" : "w-2 bg-transparent hover:bg-brand-navy/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
