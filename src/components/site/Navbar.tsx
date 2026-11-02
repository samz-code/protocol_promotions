import { useEffect, useMemo, useState, useRef, type FormEvent } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Menu,
  Search,
  ShoppingCart,
  User,
  ChevronDown,
  X,
  ArrowRight,
  TrendingUp,
  Flame,
  MapPin,
  ShoppingBag,
  Package,
  type LucideIcon,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Logo } from "./Logo";
import { shopMenu, services, industries } from "./nav-data";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/lib/cart";

type Panel = "shop" | "services" | "industries" | null;

type DbCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

function getCategoryIcon(iconName: string | null): LucideIcon {
  if (!iconName) return Package;
  if (iconName.toLowerCase() === "sparkles") return Package;
  const icon = (LucideIcons as Record<string, unknown>)[iconName];
  if (
    typeof icon === "function" ||
    (typeof icon === "object" && icon !== null && "$$typeof" in icon)
  ) {
    return icon as LucideIcon;
  }
  return Package;
}

async function fetchHeaderCategories(): Promise<DbCategory[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, icon, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DbCategory[];
}

export function Navbar() {
  const [panel, setPanel] = useState<Panel>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count } = useCart();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "header"],
    queryFn: fetchHeaderCategories,
    staleTime: 5 * 60 * 1000,
  });

  const categoryLinks = useMemo(() => {
    const sorted = [...categories]
      .filter((category) => category.slug && category.name)
      .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999) || a.name.localeCompare(b.name));

    return sorted.slice(0, 10);
  }, [categories]);

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
        scrolled ? "shadow-[0_8px_22px_-18px_rgba(0,0,0,0.22)]" : "shadow-[inset_0_-1px_0_rgba(15,23,42,0.08)]"
      }`}
      onMouseLeave={close}
    >
      <div className="border-b border-border bg-white">
        <div className="container-page flex items-center gap-2 py-3 sm:gap-3 lg:py-4">
          <Logo className="shrink" imgClassName="h-11 sm:h-12 md:h-14" priority />

          <div className="relative mx-2 hidden min-w-0 flex-1 items-center md:flex lg:mx-8">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-brand-surface px-4 py-3 text-left text-base text-brand-navy transition hover:border-brand-blue/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              aria-label="Search products"
            >
              <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <span className="flex-1 truncate text-muted-foreground">Search for products</span>
            </button>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-3">
            <div className="hidden items-center gap-2 lg:inline-flex">
              <div className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-bold text-brand-navy">
                <MapPin className="h-5 w-5 text-brand-blue" strokeWidth={3} aria-hidden="true" />
                <span>Nairobi</span>
              </div>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-extrabold text-brand-navy transition hover:bg-brand-orange/10"
              >
                <User className="h-5 w-5 text-brand-orange" aria-hidden="true" />
                <span>Sign in</span>
              </Link>
              <Link
                to="/register"
                className="hidden items-center rounded-lg px-2.5 py-2 text-sm font-extrabold text-brand-navy transition hover:bg-brand-surface lg:inline-flex"
              >
                Register
              </Link>
            </div>

            <div className="flex items-center gap-1.5 md:hidden">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-surface text-brand-navy"
                aria-label="Search products"
              >
                <Search className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-surface text-brand-navy"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                aria-expanded={mobileOpen}
              >
                <Menu className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <IconLink to="/cart" label="Cart" className="inline-flex">
              <span className="relative">
                <ShoppingCart className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-orange px-1 text-[10px] font-bold tabular-nums text-white">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </span>
            </IconLink>
          </div>
        </div>
      </div>

      <div className="hidden border-b border-border bg-white">
        <div className="container-page overflow-x-auto py-2">
          <nav className="flex min-w-max items-center gap-0.5 whitespace-nowrap text-xs font-black uppercase tracking-[0.06em] text-brand-navy sm:gap-1 sm:text-sm">
            <NavTrigger label="SHOP" active={panel === "shop"} onEnter={() => setPanel("shop")} />
            <NavTrigger label="SERVICES" active={panel === "services"} onEnter={() => setPanel("services")} />
            <NavTrigger label="INDUSTRIES" active={panel === "industries"} onEnter={() => setPanel("industries")} />
            <NavLink to="/bulk-orders" onEnter={close}>
              BULK ORDERS
            </NavLink>
            <NavLink to="/track-order" onEnter={close}>
              TRACK ORDER
            </NavLink>
            <NavLink to="/about" onEnter={close}>
              ABOUT
            </NavLink>
            <NavLink to="/contact" onEnter={close}>
              CONTACT
            </NavLink>
          </nav>
        </div>
      </div>

      <div className="border-b border-brand-blue/20 bg-brand-surface">
        <div className="container-page overflow-x-auto py-2">
          <div className="flex min-w-max items-center gap-1.5">
            <Link
              to="/shop"
              className="group inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-brand-navy px-3 py-2 text-xs font-extrabold uppercase tracking-[0.06em] text-white transition hover:bg-brand-navy/90 sm:text-sm"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Categories
            </Link>
            {categoryLinks.map((category) => {
              const CategoryIcon = getCategoryIcon(category.icon);
              return (
                <Link
                  key={category.slug}
                  to="/shop"
                  search={{ category: category.slug }}
                  className="group inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-brand-blue/20 bg-white px-3 py-2 text-xs font-extrabold uppercase tracking-[0.04em] text-brand-navy transition hover:border-brand-orange/50 hover:bg-brand-orange/5 sm:text-sm"
                >
                  <CategoryIcon className="h-4 w-4 text-brand-blue" aria-hidden="true" />
                  {category.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {panel && (
        <div
          className="absolute inset-x-0 top-full hidden border-t-2 border-brand-navy bg-white shadow-lg lg:block"
          onMouseEnter={() => setPanel(panel)}
        >
          <div className="container-page max-h-[72vh] overflow-y-auto py-6">
            {panel === "shop" && <ShopPanel onSelect={close} />}
            {panel === "services" && <SimplePanel title="Services" items={services} basePath="/services" onSelect={close} />}
            {panel === "industries" && <SimplePanel title="Industries" items={industries} basePath="/industries" onSelect={close} />}
          </div>
        </div>
      )}

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}

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

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    navigate({ to: "/shop", search: { q: query } });
    onClose();
  }

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
            {SUGGESTIONS.slice(0, 8).map((item) => (
              <button
                key={item.term}
                type="button"
                onClick={() => {
                  navigate({ to: "/shop", search: { q: item.term } });
                  onClose();
                }}
                className="rounded-full border border-brand-navy/15 bg-white px-3.5 py-1.5 text-sm font-medium text-brand-navy/70 transition-colors hover:border-brand-navy hover:text-brand-navy"
              >
                {item.term}
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

const SUGGESTIONS = [
  { term: "Custom Polo Shirts", category: "Apparel", popular: true },
  { term: "Heavyweight Hoodies", category: "Apparel", popular: false },
  { term: "Laser Engraved Mugs", category: "Merchandise", popular: true },
  { term: "Vinyl Outdoor Banners", category: "Signage", popular: true },
  { term: "Soft-Touch Business Cards", category: "Print", popular: true },
  { term: "Eco-Friendly Tote Bags", category: "Merchandise", popular: false },
  { term: "DTF Custom Workwear", category: "Apparel", popular: true },
  { term: "Bespoke Packaging Boxes", category: "Packaging", popular: false },
  { term: "Acrylic 3D Office Signs", category: "Signage", popular: false },
  { term: "Spot UV Presentation Folders", category: "Print", popular: false },
] as const;

const CATEGORIES = ["All", "Apparel", "Print", "Signage", "Merchandise", "Packaging"] as const;

export function SearchSection() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const filteredSuggestions = SUGGESTIONS.filter((item) => {
    const matchesQuery = item.term.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="w-full max-w-3xl">
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-5 flex items-center justify-center text-brand-navy">
          <Search className="h-5 w-5 stroke-[2.5]" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products (e.g., 'Embroidered Polo Shirts', 'Spot UV Cards')..."
          className="h-14 w-full rounded-2xl border-2 border-border bg-white pl-13 pr-24 text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none shadow-sm transition-all focus:border-brand-navy focus:ring-4 focus:ring-brand-navy/10"
        />

        <div className="absolute right-3 flex items-center gap-2">
          {query && (
            <button
              onClick={() => setQuery("")}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            className="flex h-9 items-center gap-1.5 rounded-xl bg-brand-navy px-4 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-brand-navy/90"
          >
            <span>Search</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
          Category:
        </span>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
              selectedCategory === cat
                ? "bg-brand-navy text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-orange">
          <TrendingUp className="h-4 w-4" />
          <span>Popular Searches</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map((item) => (
              <button
                key={item.term}
                onClick={() => setQuery(item.term)}
                className="group flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs transition-all hover:border-brand-blue hover:bg-brand-blue/5 hover:text-brand-blue"
              >
                <span>{item.term}</span>
                {item.popular && (
                  <span className="flex items-center gap-0.5 rounded-md bg-brand-pink/10 px-1.5 py-0.5 text-[9px] font-bold text-brand-pink">
                    <Flame className="h-2.5 w-2.5" />
                    HOT
                  </span>
                )}
              </button>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic">No matching products found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function NavTrigger({
  label,
  active,
  onEnter,
}: {
  label: string;
  active: boolean;
  onEnter: () => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={onEnter}
      onFocus={onEnter}
      aria-expanded={active}
      className={`relative inline-flex items-center whitespace-nowrap px-3 py-2.5 transition-colors 2xl:px-3.5 ${
        active ? "text-brand-navy" : "text-brand-navy/70 hover:text-brand-navy"
      }`}
    >
      {label}
      <span
        className={`absolute -bottom-px left-2.5 right-2.5 h-0.5 origin-left bg-brand-orange transition-transform 2xl:left-3.5 2xl:right-3.5 ${
          active ? "scale-x-100" : "scale-x-0"
        }`}
      />
    </button>
  );
}

function NavLink({
  to,
  children,
  onEnter,
}: {
  to: string;
  children: React.ReactNode;
  onEnter: () => void;
}) {
  return (
    <Link
      to={to}
      onMouseEnter={onEnter}
      className="inline-flex items-center whitespace-nowrap px-3 py-2.5 text-brand-navy/70 transition-colors hover:text-brand-navy 2xl:px-3.5"
      activeProps={{ className: "inline-flex items-center whitespace-nowrap px-3 py-2.5 text-brand-navy 2xl:px-3.5" }}
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
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-4">
        {shopMenu.map((col) => (
          <div
            key={col.title}
            className="w-62.5 shrink-0 rounded-4xl border border-brand-navy/12 bg-brand-surface/60 p-3.5 shadow-[0_10px_24px_rgba(8,28,78,0.04)] sm:w-67.5"
          >
            <div className="mb-3 flex items-center gap-2 text-[13px] font-bold text-brand-navy">
              <RegistrationMark />
              {col.title}
            </div>
            <ul className="space-y-1.5">
              {col.items.map((it) => (
                <li key={it.label}>
                  <Link
                    to={it.href}
                    onClick={onSelect}
                    className="block rounded-md px-2 py-1.5 text-[14.5px] font-medium text-brand-navy/80 transition-colors hover:bg-white hover:text-brand-blue"
                  >
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
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
            className="py-1.5 text-[14.5px] font-medium text-brand-navy/80 transition-colors hover:text-brand-blue"
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
    { to: "/track-order", label: "Track Order" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
    { to: "/faqs", label: "FAQs" },
    { to: "/login", label: "Sign In" },
    { to: "/register", label: "Register" },
  ];

  return (
    <div
      className="fixed inset-0 z-60 bg-brand-navy/40 lg:hidden"
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
          <Logo className="shrink" imgClassName="h-9" />
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
            className="flex w-full items-center gap-3 border-l-2 border-transparent px-4 py-3.5 text-[17px] font-bold uppercase text-brand-navy transition-colors hover:border-brand-orange hover:bg-brand-navy/4"
          >
            <Search className="h-5 w-5 text-brand-navy/50" /> Search products
          </button>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={onClose}
              className="block border-l-2 border-transparent px-4 py-3.5 text-[17px] font-bold uppercase text-brand-navy transition-colors hover:border-brand-orange hover:bg-brand-navy/4"
            >
              {l.label}
            </Link>
          ))}
          <Button
            asChild
            variant="default"
            className="mt-4 w-full rounded-sm bg-brand-orange py-6 font-bold text-white hover:bg-brand-orange/90"
          >
            <Link to="/shop" onClick={onClose}>
              Shop Now
            </Link>
          </Button>
        </nav>
      </div>
    </div>
  );
}