import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { TopBar } from "./TopBar";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { WhatsAppFloat } from "./WhatsAppFloat";

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

interface GlobalLayoutSettings {
  global_navigation_settings?: NavigationSettings;
  whatsapp_float_config?: WhatsAppSettings;
}

/* ----------------------------------------------------------- fetch settings */

async function fetchGlobalLayoutSettings(): Promise<GlobalLayoutSettings> {
  const { data, error } = await supabase
    .from("content_blocks")
    .select("key, value")
    .in("key", ["global_navigation_settings", "whatsapp_float_config"]);

  if (error) throw error;

  return (data ?? []).reduce<Record<string, any>>((acc, block) => {
    acc[block.key] = block.value;
    return acc;
  }, {});
}

/* ------------------------------------------------------------- main layout */

export function SiteLayout({ children }: { children: ReactNode }) {
  const { data } = useQuery<GlobalLayoutSettings>({
    queryKey: ["cms", "global-layout-settings"],
    queryFn: fetchGlobalLayoutSettings,
  });

  const navSettings: NavigationSettings = data?.global_navigation_settings ?? {
    show_top_bar: true,
    show_navbar: true,
  };

  const whatsAppSettings: WhatsAppSettings = data?.whatsapp_float_config ?? {
    enabled: true,
    phone_number: "+254762446077",
    default_message: "Hi Protocol Promotions! I would like to get a quote.",
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {navSettings.show_top_bar && <TopBar />}

      {/*
        Navbar owns its own sticky positioning (sticky top-0 z-50 on its
        <header>), unconditionally, on every breakpoint. No wrapper needed
        here — a previous CMS-driven wrapper duplicated this with a
        different z-index and defaulted to "off", which was redundant at
        best and confusing at worst.
      */}
      {navSettings.show_navbar && <Navbar />}

      <main className="flex-1">{children}</main>

      <Footer />

      {whatsAppSettings.enabled && <WhatsAppFloat />}
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
      <div className="container-page py-14 md:py-20">
        {eyebrow && (
          <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-brand-orange mb-3">
            {eyebrow}
          </div>
        )}
        <h1 className="text-3xl md:text-5xl font-extrabold text-brand-navy max-w-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}