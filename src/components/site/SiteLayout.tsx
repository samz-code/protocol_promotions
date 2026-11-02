import { type ReactNode } from "react";
import { useCmsBlocks } from "@/lib/cms";
import { TopBar } from "./TopBar";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import SiteChatbot from "@/components/chat/SiteChatbot";
import { FaWhatsapp } from "react-icons/fa6";

/* ------------------------------------------------------------------ types */

interface NavigationSettings {
  show_top_bar: boolean;
  show_navbar: boolean;
}

interface WhatsAppSettings {
  enabled: boolean;
  phone_number: string;
  default_message: string;
}

/* ------------------------------------------------------------- main layout */

export function SiteLayout({ children }: { children: ReactNode }) {
  const { data: blocks } = useCmsBlocks(["global_navigation_settings", "whatsapp_float_config"]);

  const navSettings: NavigationSettings =
    (blocks?.find((block) => block.key === "global_navigation_settings")?.value as NavigationSettings) ?? {
      show_top_bar: true,
      show_navbar: true,
    };

  const whatsAppSettings: WhatsAppSettings =
    (blocks?.find((block) => block.key === "whatsapp_float_config")?.value as WhatsAppSettings) ?? {
      enabled: true,
      phone_number: "+254762446077",
      default_message: "Hi Protocol Promotions! I would like to get a quote.",
    };

  return (
    // NOTE: overflow-x-hidden was swapped for overflow-x-clip.
    // Any overflow-x value other than "visible" forces the browser to compute
    // overflow-y as "auto" when it isn't set explicitly (CSS overflow spec),
    // which turns this div into a scroll container and breaks `position: sticky`
    // on the Navbar's <header> below. overflow-x-clip clips the x-axis without
    // triggering that side effect, so sticky positioning resolves against the
    // viewport again.
    <div className="site-typography min-h-screen flex flex-col bg-background overflow-x-clip">
      {navSettings.show_top_bar && <TopBar />}

      {/*
        Navbar owns its own sticky positioning (sticky top-0 z-50 on its
        <header>), unconditionally, on every breakpoint. No wrapper needed
        here.
      */}
      {navSettings.show_navbar && <Navbar />}

      <main className="flex-1 min-w-0 w-full">{children}</main>

      <Footer />

      <SiteChatbot whatsappPhone={whatsAppSettings.enabled ? whatsAppSettings.phone_number : ""} />
      {whatsAppSettings.enabled && (
        <a
          href={`https://wa.me/${whatsAppSettings.phone_number.replace(/\D/g, "")}?text=${encodeURIComponent(whatsAppSettings.default_message)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open WhatsApp chat with Protocol Promotions"
          className="fixed bottom-3 right-3 z-55 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40 sm:bottom-5 sm:right-5 lg:bottom-6 lg:right-6 lg:h-16 lg:w-16"
        >
          <FaWhatsapp className="h-8 w-8" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- page header */

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <section className="bg-brand-surface border-b border-border">
      <div className="container-page py-8 md:py-12 min-w-0">
        {eyebrow && (
          <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-brand-orange mb-3 wrap-break-word">
            {eyebrow}
          </div>
        )}
        <h1 className="text-3xl md:text-5xl font-extrabold text-brand-navy max-w-3xl wrap-break-word">
          {title}
        </h1>
        {description && (
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl wrap-break-word">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}