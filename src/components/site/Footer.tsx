import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Phone, Mail, Code2, ChevronDown, ArrowRight } from "lucide-react";
import type { SVGProps } from "react";
import { Logo } from "./Logo";

/* ================================================================
   Custom social SVG icons
   ================================================================ */

function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2c-2.72 0-3.06.01-4.12.06-1.06.05-1.79.22-2.43.47-.66.26-1.22.6-1.77 1.16a4.9 4.9 0 0 0-1.16 1.77c-.25.64-.42 1.37-.47 2.43C2 8.94 2 9.28 2 12c0 2.72.01 3.06.06 4.12.05 1.06.22 1.79.47 2.43.26.66.6 1.22 1.16 1.77.55.56 1.11.9 1.77 1.16.64.25 1.37.42 2.43.47C8.94 22 9.28 22 12 22s3.06-.01 4.12-.06c1.06-.05 1.79-.22 2.43-.47.66-.26 1.22-.6 1.77-1.16.56-.55.9-1.11 1.16-1.77.25-.64.42-1.37.47-2.43.05-1.06.06-1.4.06-4.12s-.01-3.06-.06-4.12c-.05-1.06-.22-1.79-.47-2.43a4.9 4.9 0 0 0-1.16-1.77 4.9 4.9 0 0 0-1.77-1.16c-.64-.25-1.37-.42-2.43-.47C15.06 2.01 14.72 2 12 2Zm0 1.8c2.67 0 2.99.01 4.04.06.98.04 1.5.21 1.85.34.47.18.8.4 1.15.75.35.35.57.68.75 1.15.13.36.3.87.34 1.85.05 1.05.06 1.37.06 4.04s-.01 2.99-.06 4.04c-.04.98-.21 1.5-.34 1.85-.18.47-.4.8-.75 1.15-.35.35-.68.57-1.15.75-.36.13-.87.3-1.85.34-1.05.05-1.37.06-4.04.06s-2.99-.01-4.04-.06c-.98-.04-1.5-.21-1.85-.34a3.1 3.1 0 0 1-1.15-.75 3.1 3.1 0 0 1-.75-1.15c-.13-.36-.3-.87-.34-1.85-.05-1.05-.06-1.37-.06-4.04s.01-2.99.06-4.04c.04-.98.21-1.5.34-1.85.18-.47.4-.8.75-1.15.35-.35.68-.57 1.15-.75.36-.13.87-.3 1.85-.34C9.01 3.81 9.33 3.8 12 3.8Zm0 3.06a5.14 5.14 0 1 0 0 10.28 5.14 5.14 0 0 0 0-10.28Zm0 8.48a3.34 3.34 0 1 1 0-6.68 3.34 3.34 0 0 1 0 6.68Zm5.34-8.68a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z" />
    </svg>
  );
}

function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.6 2h-3.2v13.9c0 1.6-1.3 2.9-2.9 2.9a2.9 2.9 0 0 1-2.9-2.9 2.9 2.9 0 0 1 2.9-2.9c.3 0 .6.05.9.13V9.9a6.1 6.1 0 0 0-.9-.07A6.13 6.13 0 0 0 4.4 16a6.13 6.13 0 0 0 6.13 6.13A6.13 6.13 0 0 0 16.66 16V8.4a8.2 8.2 0 0 0 4.8 1.55V6.75a4.9 4.9 0 0 1-3.2-1.4A4.9 4.9 0 0 1 16.6 2Z" />
    </svg>
  );
}

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.24 2.75h3.29l-7.19 8.22 8.46 10.28h-6.63l-5.19-6.6-5.94 6.6H1.75l7.7-8.8L1.34 2.75h6.8l4.69 6.03 5.41-6.03Zm-1.15 16.53h1.82L7.02 4.6H5.06l12.03 14.68Z" />
    </svg>
  );
}

function YoutubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23.5 6.5a3.02 3.02 0 0 0-2.12-2.13C19.5 4 12 4 12 4s-7.5 0-9.38.37A3.02 3.02 0 0 0 .5 6.5 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.5 3.02 3.02 0 0 0 2.12 2.13C4.5 20 12 20 12 20s7.5 0 9.38-.37a3.02 3.02 0 0 0 2.12-2.13A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.5ZM9.6 15.5v-7L15.8 12l-6.2 3.5Z" />
    </svg>
  );
}

const SOCIALS = [
  { icon: FacebookIcon, label: "Facebook", href: "https://www.facebook.com/share/188gGFyz5G/" },
  { icon: InstagramIcon, label: "Instagram", href: "https://www.instagram.com/protocol_promotions?igsh=MzRlODBiNWFlZA==" },
  { icon: TikTokIcon, label: "TikTok", href: "#" },
  { icon: XIcon, label: "X", href: "#" },
  { icon: YoutubeIcon, label: "YouTube", href: "#" },
];

type FooterLink = { to: string; label: string };

const SHOP_LINKS: FooterLink[] = [
  { to: "/shop", label: "All Products" },
  { to: "/shop", label: "Apparel" },
  { to: "/shop", label: "Printing" },
  { to: "/shop", label: "Signage" },
  { to: "/shop", label: "Promotional Items" },
  { to: "/shop", label: "Packaging" },
];

const COMPANY_LINKS: FooterLink[] = [
  { to: "/about", label: "About Us" },
  { to: "/services", label: "Services" },
  { to: "/industries", label: "Industries" },
  { to: "/testimonials", label: "Testimonials" },
  { to: "/contact", label: "Contact" },
];

const SUPPORT_LINKS: FooterLink[] = [
  { to: "/request-quote", label: "Request a Quote" },
  { to: "/track-order", label: "Track Order" },
  { to: "/bulk-orders", label: "Bulk Orders" },
  { to: "/faqs", label: "FAQs" },
  { to: "/policies", label: "Policies" },
];

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  { title: "Shop", links: SHOP_LINKS },
  { title: "Company", links: COMPANY_LINKS },
  { title: "Support", links: SUPPORT_LINKS },
];

/* ================================================================
   Footer
   ================================================================ */

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden bg-brand-navy text-white/85">
      <FooterStyles />

      {/* Top accent hairline */}
      <div className="h-0.5 w-full bg-brand-orange/70" />

      {/* CTA banner — gives the mobile footer an immediate hook */}
      <div className="border-b border-white/10">
        <div className="container-page flex flex-col items-start gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-white sm:text-xl">
              Ready to brand something?
            </h3>
            <p className="mt-1 text-sm text-white/60">
              Send the brief. We come back with a real price and a real date.
            </p>
          </div>
          <Link
            to="/request-quote"
            className="group inline-flex w-full items-center justify-center gap-2 bg-brand-orange px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_rgba(255,255,255,0.25)] sm:w-auto"
          >
            Request a quote
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      {/* Main grid */}
      <div className="container-page grid gap-8 py-12 md:grid-cols-2 md:gap-10 lg:grid-cols-5 lg:py-14">
        {/* Brand + contact + socials */}
        <div className="lg:col-span-2">
          <div className="inline-block rounded-md bg-white p-2">
            <Logo />
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            Kenya's enterprise partner for branding, printing and promotional products. Real
            products, real production, real accountability — from artwork upload to delivery.
          </p>

          {/* Contact — carded on mobile so it reads as a distinct block */}
          <div className="mt-6 space-y-2.5 border-t border-white/10 pt-5 text-sm sm:border-0 sm:pt-0">
            <div className="group flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center border border-white/10 bg-white/5 transition-colors duration-300 group-hover:border-brand-orange group-hover:bg-brand-orange/10">
                <MapPin className="h-4 w-4 text-brand-orange" />
              </span>
              <span className="text-white/80">Nairobi, Kenya</span>
            </div>
            <a
              href="tel:+254762446077"
              className="group flex items-center gap-3 transition-colors hover:text-white"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center border border-white/10 bg-white/5 transition-colors duration-300 group-hover:border-brand-orange group-hover:bg-brand-orange/10">
                <Phone className="h-4 w-4 text-brand-orange" />
              </span>
              <span className="text-white/80 group-hover:text-white">+254 762 446 077</span>
            </a>
            <a
              href="mailto:protocolpromotions@gmail.com"
              className="group flex items-center gap-3 transition-colors hover:text-white"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center border border-white/10 bg-white/5 transition-colors duration-300 group-hover:border-brand-orange group-hover:bg-brand-orange/10">
                <Mail className="h-4 w-4 text-brand-orange" />
              </span>
              <span className="break-all text-white/80 group-hover:text-white">
                protocolpromotions@gmail.com
              </span>
            </a>
          </div>

          {/* Socials */}
          <div className="mt-6">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-white/40">
              Follow us
            </div>
            <div className="flex items-center gap-2.5">
              {SOCIALS.map((s, i) => (
                <a
                  key={i}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white/80 transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-orange hover:text-white"
                  aria-label={s.label}
                >
                  <s.icon className="h-4.5 w-4.5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop: three plain columns */}
        <div className="hidden md:contents">
          {COLUMNS.map((col) => (
            <FooterCol key={col.title} title={col.title} links={col.links} />
          ))}
        </div>

        {/* Mobile: collapsible accordion so the footer isn't a long flat list */}
        <div className="md:hidden">
          <div className="divide-y divide-white/10 border-y border-white/10">
            {COLUMNS.map((col) => (
              <FooterAccordion key={col.title} title={col.title} links={col.links} />
            ))}
          </div>
        </div>
      </div>

      {/* Dotted animated separator */}
      <div className="relative h-px w-full overflow-hidden bg-white/10">
        <div className="pp-slide-dots absolute inset-0 h-full w-[200%]" />
      </div>

      {/* Bottom bar */}
      <div className="bg-brand-navy/40">
        <div className="container-page flex flex-col items-center justify-between gap-4 py-6 text-xs text-white/60 md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center md:justify-start">
            <span>© {new Date().getFullYear()} Protocol Promotions. All rights reserved.</span>
            <span className="hidden text-white/20 md:inline">|</span>
            <span className="inline-flex items-center gap-1">
              <Code2 className="h-3.5 w-3.5 animate-pulse text-brand-orange" />
              Engineered by
              <a
                href="https://www.emonisamuel.co.ke"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative ml-0.5 py-0.5 font-bold text-white/80 transition-colors duration-300 hover:text-brand-orange"
              >
                Emoni Samuel
                <span
                  className="absolute bottom-0 left-0 h-[1.5px] w-full opacity-40 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    backgroundImage: "radial-gradient(circle, #f97316 1px, transparent 1px)",
                    backgroundSize: "4px 100%",
                  }}
                />
              </a>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/policies" className="transition-colors hover:text-white">
              Terms
            </Link>
            <Link to="/policies" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <Link to="/policies" className="transition-colors hover:text-white">
              Refunds
            </Link>
            <Link to="/policies" className="transition-colors hover:text-white">
              Shipping
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ================================================================
   Desktop link column
   ================================================================ */

function FooterCol({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
        <span className="h-3 w-0.5 bg-brand-orange" />
        {title}
      </div>
      <ul className="space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              to={l.to}
              className="group inline-flex items-center gap-1.5 text-white/70 transition-colors duration-200 hover:text-white"
            >
              <ArrowRight className="h-0 w-0 -translate-x-1 text-brand-orange opacity-0 transition-all duration-300 group-hover:h-3 group-hover:w-3 group-hover:translate-x-0 group-hover:opacity-100" />
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ================================================================
   Mobile accordion column
   ================================================================ */

function FooterAccordion({ title, links }: { title: string; links: FooterLink[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className={`h-3 w-0.5 transition-colors duration-300 ${open ? "bg-brand-orange" : "bg-white/30"}`} />
          {title}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-brand-orange transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <ul className="space-y-1 pb-4 pl-4">
            {links.map((l) => (
              <li key={l.label}>
                <Link
                  to={l.to}
                  className="group flex items-center gap-2 py-1.5 text-sm text-white/70 transition-colors hover:text-white"
                >
                  <span className="h-1 w-1 shrink-0 bg-brand-orange/60 transition-all duration-300 group-hover:w-3 group-hover:bg-brand-orange" />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Self-contained styles for the animated separator
   (works even if `animate-slide-dots` is not in the Tailwind config)
   ================================================================ */

function FooterStyles() {
  return (
    <style>{`
      @keyframes ppSlideDots {
        from { transform: translateX(0); }
        to   { transform: translateX(-50%); }
      }
      .pp-slide-dots {
        background-image: radial-gradient(circle, rgba(249,115,22,0.4) 1px, transparent 1.5px);
        background-size: 16px 1px;
        animation: ppSlideDots 6s linear infinite;
      }
      @media (prefers-reduced-motion: reduce) {
        .pp-slide-dots { animation: none !important; }
      }
    `}</style>
  );
}