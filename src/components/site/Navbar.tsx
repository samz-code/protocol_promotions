import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, Search, ShoppingCart, User, ChevronDown, X } from "lucide-react";
import { Logo } from "./Logo";
import { shopMenu, services, industries } from "./nav-data";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

type Panel = "shop" | "services" | "industries" | null;

export function Navbar() {
  const [panel, setPanel] = useState<Panel>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count } = useCart();

  // Close every overlay on route change, otherwise the drawer survives
  // navigation and leaves the page unusable.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setPanel(null);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => setPanel(null);

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-shadow ${
        scrolled
          ? "shadow-[0_1px_0_0_var(--color-border),0_8px_24px_-16px_rgb(0_0_0/0.18)]"
          : "border-b border-border"
      }`}
      onMouseLeave={close}
    >
      {/* min-w-0 lets the flex children actually shrink instead of overflowing */}
      <div className="container-page flex h-16 min-w-0 items-center gap-2 px-4 sm:gap-3 sm:px-6 md:h-20 xl:gap-5 2xl:gap-8">
        {/* Logo renders its own link and caps its own height per breakpoint */}
        <Logo className="shrink" priority />

        {/* Desktop nav, only from xl up where there is real room for 7 items plus logo, CTA and icons */}
        <nav className="hidden items-center gap-0 whitespace-nowrap text-[13.5px] font-semibold tracking-[-0.01em] xl:flex 2xl:gap-0.5 2xl:text-[15px]">
          <NavTrigger label="Shop" active={panel === "shop"} onEnter={() => setPanel("shop")} />
          <NavTrigger label="Services" active={panel === "services"} onEnter={() => setPanel("services")} />
          <NavTrigger label="Industries" active={panel === "industries"} onEnter={() => setPanel("industries")} />
          <NavLink to="/bulk-orders" onEnter={close}>Bulk Orders</NavLink>
          <NavLink to="/track-order" onEnter={close}>Track Order</NavLink>
          <NavLink to="/about" onEnter={close}>About</NavLink>
          <NavLink to="/contact" onEnter={close}>Contact</NavLink>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1.5 md:gap-2 xl:gap-1.5 2xl:gap-2.5">
          <Link
            to="/request-quote"
            className="hidden items-center whitespace-nowrap rounded-sm bg-brand-orange px-3.5 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:brightness-95 xl:inline-flex 2xl:px-5 2xl:text-[15px]"
          >
            Request Quote
          </Link>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search products"
            className="inline-flex h-11 w-11 items-center justify-center rounded-sm text-brand-navy transition-colors hover:bg-brand-navy/6"
          >
            <Search className="h-5 w-5" />
          </button>
          <IconLink to="/cart" label="Cart">
            <span className="relative">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-orange px-1 text-[10px] font-bold tabular-nums text-white">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </span>
          </IconLink>
          <IconLink to="/login" label="Login" className="hidden sm:inline-flex">
            <User className="h-5 w-5" />
          </IconLink>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-sm text-brand-navy hover:bg-brand-navy/6 xl:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Mega menu panels */}
      {panel && (
        <div
          className="absolute inset-x-0 top-full hidden border-t-2 border-brand-navy bg-white shadow-lg xl:block"
          onMouseEnter={() => setPanel(panel)}
        >
          <div className="container-page py-8">
            {panel === "shop" && <ShopPanel onSelect={close} />}
            {panel === "services" && <SimplePanel title="Services" items={services} basePath="/services" onSelect={close} />}
            {panel === "industries" && <SimplePanel title="Industries" items={industries} basePath="/industries" onSelect={close} />}
          </div>
        </div>
      )}

      {/* Search overlay */}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}

      {/* Mobile drawer */}
      {mobileOpen && (
        <MobileDrawer
          onClose={() => setMobileOpen(false)}
          onSearch={() => {
            setMobileOpen(false);
            setSearchOpen(true);
          }}
        />
      )}
    </header>
  );
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    navigate({ to: "/shop", search: { q: query } });
    onClose();
  }

  const suggestions = ["Polo shirts", "Hoodies", "Mugs", "Banners", "Business cards", "Tote bags"];

  return (
    <div
      className="fixed inset-0 z-60 bg-brand-navy/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div
        className="mx-auto mt-20 w-[92%] max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl sm:mt-24"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit} className="flex items-center gap-3 border-b border-border px-4 sm:px-5">
          <Search className="h-5 w-5 shrink-0 text-brand-navy/40" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, categories, materials..."
            /* 16px minimum stops iOS Safari zooming the page on focus */
            className="min-w-0 flex-1 py-4 text-base text-brand-navy outline-none placeholder:text-brand-navy/35 sm:py-5 sm:text-lg"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-brand-navy/50 transition-colors hover:bg-brand-navy/6 hover:text-brand-navy"
          >
            <X className="h-5 w-5" />
          </button>
        </form>

        <div className="p-4 sm:p-5">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-brand-navy/40">
            Popular searches
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  navigate({ to: "/shop", search: { q: s } });
                  onClose();
                }}
                className="rounded-full border border-brand-navy/15 bg-white px-3.5 py-1.5 text-sm font-medium text-brand-navy/70 transition-colors hover:border-brand-navy hover:text-brand-navy"
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mt-5 hidden text-xs text-brand-navy/45 sm:block">
            Press Enter to search, or Escape to close.
          </p>
        </div>
      </div>
    </div>
  );
}

function NavTrigger({ label, active, onEnter }: { label: string; active: boolean; onEnter: () => void }) {
  return (
    <button
      type="button"
      onMouseEnter={onEnter}
      onFocus={onEnter}
      aria-expanded={active}
      className={`relative inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-2 transition-colors 2xl:px-3.5 ${
        active ? "text-brand-navy" : "text-brand-navy/70 hover:text-brand-navy"
      }`}
    >
      {label}
      <ChevronDown className={`h-3 w-3 transition-transform 2xl:h-3.5 2xl:w-3.5 ${active ? "rotate-180" : ""}`} />
      <span
        className={`absolute -bottom-px left-2.5 right-2.5 h-0.5 origin-left bg-brand-orange transition-transform 2xl:left-3.5 2xl:right-3.5 ${
          active ? "scale-x-100" : "scale-x-0"
        }`}
      />
    </button>
  );
}

function NavLink({ to, children, onEnter }: { to: string; children: React.ReactNode; onEnter: () => void }) {
  return (
    <Link
      to={to}
      onMouseEnter={onEnter}
      className="whitespace-nowrap px-2.5 py-2 text-brand-navy/70 transition-colors hover:text-brand-navy 2xl:px-3.5"
      activeProps={{ className: "whitespace-nowrap px-2.5 py-2 text-brand-navy 2xl:px-3.5" }}
    >
      {children}
    </Link>
  );
}

function IconLink({
  to,
  label,
  children,
  className = "",
}: {
  to: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-sm text-brand-navy transition-colors hover:bg-brand-navy/6 ${className}`}
    >
      {children}
    </Link>
  );
}

/** Small crop-mark glyph, a nod to print registration marks, used as the section marker instead of a generic eyebrow label. */
function RegistrationMark() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0 text-brand-orange" aria-hidden="true">
      <circle cx="6" cy="6" r="3.4" fill="none" stroke="currentColor" strokeWidth="1" />
      <line x1="6" y1="0" x2="6" y2="12" stroke="currentColor" strokeWidth="1" />
      <line x1="0" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function ShopPanel({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="grid grid-cols-5 gap-8">
      {shopMenu.map((col) => (
        <div key={col.title}>
          <div className="mb-3.5 flex items-center gap-2 text-[13px] font-bold text-brand-navy">
            <RegistrationMark />
            {col.title}
          </div>
          <ul className="space-y-2.5">
            {col.items.map((it) => (
              <li key={it.label}>
                <Link
                  to={it.href}
                  onClick={onSelect}
                  className="text-[14.5px] font-medium text-brand-navy/80 transition-colors hover:text-brand-orange"
                >
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SimplePanel({
  title,
  items,
  basePath,
  onSelect,
}: {
  title: string;
  items: string[];
  basePath: string;
  onSelect: () => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-[13px] font-bold text-brand-navy">
        <RegistrationMark />
        {title}
      </div>
      <div className="grid grid-cols-4 gap-x-8 gap-y-2.5">
        {items.map((it) => (
          <Link
            key={it}
            to={basePath}
            onClick={onSelect}
            className="py-1.5 text-[14.5px] font-medium text-brand-navy/80 transition-colors hover:text-brand-orange"
          >
            {it}
          </Link>
        ))}
      </div>
    </div>
  );
}

function MobileDrawer({ onClose, onSearch }: { onClose: () => void; onSearch: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock scroll, close on Escape, and move focus into the drawer so
  // keyboard and screen reader users are not left behind on the page.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    panelRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const links = [
    { to: "/", label: "Home" },
    { to: "/shop", label: "Shop" },
    { to: "/services", label: "Services" },
    { to: "/industries", label: "Industries" },
    { to: "/bulk-orders", label: "Bulk Orders" },
    { to: "/request-quote", label: "Request Quote" },
    { to: "/track-order", label: "Track Order" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
    { to: "/faqs", label: "FAQs" },
    { to: "/login", label: "Login" },
  ];

  return (
    <div
      className="fixed inset-0 z-60 bg-brand-navy/40 xl:hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        /* dvh keeps the panel correct when mobile browser chrome collapses */
        className="absolute inset-y-0 right-0 flex h-full max-h-dvh w-[86%] max-w-sm flex-col bg-white outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border p-4">
          <Logo className="shrink" imgClassName="h-8" />
          <button
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-sm hover:bg-brand-navy/6"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Padded for the iOS home indicator so the last link is never cut off */}
        <nav className="flex-1 overflow-y-auto overscroll-contain p-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onSearch}
            className="flex w-full items-center gap-3 border-l-2 border-transparent px-4 py-3.5 text-[16px] font-semibold text-brand-navy transition-colors hover:border-brand-orange hover:bg-brand-navy/4"
          >
            <Search className="h-5 w-5 text-brand-navy/50" /> Search products
          </button>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={onClose}
              className="block border-l-2 border-transparent px-4 py-3.5 text-[16px] font-semibold text-brand-navy transition-colors hover:border-brand-orange hover:bg-brand-navy/4"
            >
              {l.label}
            </Link>
          ))}
          <Button
            asChild
            variant="default"
            className="mt-4 w-full rounded-sm bg-brand-orange py-6 font-bold text-white hover:bg-brand-orange/90"
          >
            <Link to="/request-quote" onClick={onClose}>
              Request a Quote
            </Link>
          </Button>
        </nav>
      </div>
    </div>
  );
}