import { Link } from "@tanstack/react-router";
import { MapPin, Phone, Mail, Code2 } from "lucide-react";
import type { SVGProps } from "react";
import { Logo } from "./Logo";

// Custom SVG Icons
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

export function Footer() {
  return (
    <footer className="mt-24 bg-brand-navy text-white/85">
      <div className="container-page py-14 grid gap-10 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="bg-white inline-block rounded-md p-2">
            <Logo />
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            Kenya's enterprise partner for branding, printing and promotional products. Real products, real production, real accountability — from artwork upload to delivery.
          </p>
          <div className="mt-5 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-orange shrink-0" /> Nairobi, Kenya
            </div>
            <a href="tel:+254762446077" className="flex items-center gap-2 hover:text-brand-orange transition-colors">
              <Phone className="h-4 w-4 text-brand-orange shrink-0" /> +254 762 446 077
            </a>
            <a href="mailto:protocolpromotions@gmail.com" className="flex items-center gap-2 hover:text-brand-orange transition-colors">
              <Mail className="h-4 w-4 text-brand-orange shrink-0" /> protocolpromotions@gmail.com
            </a>
          </div>
          <div className="flex items-center gap-3 mt-5">
            {SOCIALS.map((s, i) => (
              <a 
                key={i} 
                href={s.href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="h-9 w-9 grid place-items-center rounded-full bg-white/10 hover:bg-brand-orange transition-colors duration-300" 
                aria-label={s.label}
              >
                <s.icon className="h-4.5 w-4.5" />
              </a>
            ))}
          </div>
        </div>

        <FooterCol title="Shop" links={[
          { to: "/shop", label: "All Products" },
          { to: "/shop", label: "Apparel" },
          { to: "/shop", label: "Printing" },
          { to: "/shop", label: "Signage" },
          { to: "/shop", label: "Promotional Items" },
          { to: "/shop", label: "Packaging" },
        ]} />
        <FooterCol title="Company" links={[
          { to: "/about", label: "About Us" },
          { to: "/services", label: "Services" },
          { to: "/industries", label: "Industries" },
          { to: "/testimonials", label: "Testimonials" },
          { to: "/contact", label: "Contact" },
        ]} />
        <FooterCol title="Support" links={[
          { to: "/request-quote", label: "Request a Quote" },
          { to: "/track-order", label: "Track Order" },
          { to: "/bulk-orders", label: "Bulk Orders" },
          { to: "/faqs", label: "FAQs" },
          { to: "/policies", label: "Policies" },
        ]} />
      </div>

      {/* Dotted Animated Separator */}
      <div className="relative h-px w-full overflow-hidden bg-white/10">
        <div 
          className="absolute inset-0 h-full w-[200%] animate-slide-dots" 
          style={{
            backgroundImage: "radial-gradient(circle, rgba(249,115,22,0.4) 1px, transparent 1.5px)",
            backgroundSize: "16px 1px",
          }}
        />
      </div>

      <div className="bg-brand-navy/40">
        <div className="container-page py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-1 text-center">
            <span>© {new Date().getFullYear()} Protocol Promotions. All rights reserved.</span>
            <span className="hidden md:inline text-white/20">|</span>
            <span className="inline-flex items-center gap-1">
              <Code2 className="h-3.5 w-3.5 text-brand-orange animate-pulse" />
              Engineered by
              <a
                href="https://www.emonisamuel.co.ke"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-white/80 hover:text-brand-orange transition-colors duration-300 relative group py-0.5 ml-0.5"
              >
                Emoni Samuel
                <span 
                  className="absolute bottom-0 left-0 w-full h-[1.5px] opacity-40 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    backgroundImage: "radial-gradient(circle, #f97316 1px, transparent 1px)",
                    backgroundSize: "4px 100%",
                  }}
                />
              </a>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/policies" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/policies" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/policies" className="hover:text-white transition-colors">Refunds</Link>
            <Link to="/policies" className="hover:text-white transition-colors">Shipping</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <div className="text-sm font-semibold text-white mb-4">{title}</div>
      <ul className="space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <Link to={l.to} className="hover:text-white transition-colors duration-200">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}