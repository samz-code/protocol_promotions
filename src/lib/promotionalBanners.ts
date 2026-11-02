import { supabase } from "@/lib/supabase";

export type PromotionalBanner = {
  id: string;
  name: string;
  kind: "ad" | "offer";
  format: "landscape" | "flyer";
  image_url: string;
  alt_text: string;
  href: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export function createPromotionalBannerId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall back when the browser exposes but cannot use the secure UUID API.
    }
  }
  return `banner-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function fetchPromotionalBanners(): Promise<PromotionalBanner[]> {
  const { data, error } = await supabase
    .from("promotional_banners")
    .select("id, name, kind, format, image_url, alt_text, href, is_active, starts_at, ends_at")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PromotionalBanner[];
}

export async function savePromotionalBanners(banners: PromotionalBanner[]): Promise<void> {
  const { error } = await supabase.rpc("replace_promotional_banners", {
    p_banners: banners,
  });
  if (error) throw error;
}

export function isPromotionalBannerActive(banner: PromotionalBanner, now = Date.now()) {
  if (!banner.is_active) return false;
  if (banner.starts_at && new Date(banner.starts_at).getTime() > now) return false;
  if (banner.ends_at && new Date(banner.ends_at).getTime() < now) return false;
  return true;
}

export function isSafeBannerHref(href: string) {
  return /^(\/($|[^/])|#|https?:\/\/|mailto:|tel:)/i.test(href.trim());
}
