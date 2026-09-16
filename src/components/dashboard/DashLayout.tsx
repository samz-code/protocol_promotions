import { useState, useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/site/Logo";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { useAuth } from "@/lib/auth";
import { LogOut, Menu, X, ChevronRight } from "lucide-react";

type NavItem = { label: string; to: string; icon?: ReactNode };

export function DashLayout({
  side, title, children,
}: {
  side: NavItem[];
  title: string;
  children: ReactNode;
}) {
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Close the drawer whenever the route changes, otherwise it stays
  // open over the page the person just navigated to.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Stop the page behind the drawer scrolling on touch devices.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  const initials = (profile?.full_name ?? profile?.email ?? "PP")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Used to find the currently active nav item so we can show the person
  // exactly where they are, and give the header a matching breadcrumb.
  const activeItem = side.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

  return (
    <div className="min-h-screen bg-brand-surface">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden flex-col bg-brand-navy text-white/80 lg:flex">
          <SidebarBody side={side} profile={profile} initials={initials} onSignOut={signOut} pathname={pathname} />
        </aside>

        {/* Mobile drawer. Without this the menu is simply unreachable on a phone. */}
        {menuOpen && (
          <div
            className="fixed inset-0 z-50 bg-brand-navy/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <aside
              className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col bg-brand-navy text-white/80"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="absolute right-3 top-4 z-10 grid h-10 w-10 place-items-center text-white/60 transition-colors hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>
              <SidebarBody
                side={side}
                profile={profile}
                initials={initials}
                onSignOut={signOut}
                pathname={pathname}
              />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-white px-4 sm:h-20 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-brand-navy transition-colors hover:bg-brand-surface lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-black tracking-tight text-brand-navy sm:text-2xl">
                  {title}
                </h1>
                {/* Small breadcrumb so people always know which section of the flow they're in */}
                {activeItem && (
                  <div className="mt-0.5 hidden items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground sm:flex">
                    <span>Dashboard</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-brand-orange">{activeItem.label}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Link
                to="/"
                className="hidden text-sm font-bold text-muted-foreground transition-colors hover:text-brand-navy sm:inline"
              >
                Back to site
              </Link>

              <NotificationBell />

              <div
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-orange text-sm font-extrabold text-white sm:h-10 sm:w-10 sm:text-base"
                title={profile?.full_name ?? profile?.email ?? ""}
              >
                {initials}
              </div>

              <button
                type="button"
                onClick={() => signOut()}
                className="grid h-10 w-10 place-items-center rounded-md text-brand-navy/50 transition-colors hover:bg-brand-surface hover:text-brand-orange"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="min-w-0 p-4 sm:p-6 md:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

function SidebarBody({
  side, profile, initials, onSignOut, pathname,
}: {
  side: NavItem[];
  profile: { full_name: string | null; email: string; role: string } | null;
  initials: string;
  onSignOut: () => void;
  pathname: string;
}) {
  return (
    <>
      <div className="bg-white p-5">
        <Logo />
      </div>

      {/* Step label makes it clear this list IS the flow through the dashboard */}
      <div className="px-6 pt-5 text-[11px] font-extrabold uppercase tracking-widest text-white/40">
        Menu
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {side.map((item, index) => {
          const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.label}
              to={item.to as any}
              className={`group relative flex items-center gap-3 rounded-md border-l-4 px-3 py-3 text-base font-semibold transition-colors ${
                isActive
                  ? "border-brand-orange bg-white/10 text-white"
                  : "border-transparent text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-extrabold ${
                  isActive ? "bg-brand-orange text-white" : "bg-white/10 text-white/60"
                }`}
              >
                {index + 1}
              </span>
              {item.icon}
              <span className="truncate">{item.label}</span>
              {isActive && <ChevronRight className="ml-auto h-4 w-4 text-brand-orange" />}
            </Link>
          );
        })}
      </nav>

      {/* Account block, only useful inside the drawer on mobile but harmless on desktop */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-orange text-sm font-extrabold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-bold text-white">
              {profile?.full_name ?? "Your account"}
            </div>
            <div className="truncate text-xs font-medium text-white/50">{profile?.email}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <Link
            to="/"
            className="text-xs font-extrabold uppercase tracking-wide text-white/50 transition-colors hover:text-white"
          >
            Back to site
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-white/50 transition-colors hover:text-brand-orange"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}

export function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 sm:p-5">
      <div className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground sm:text-sm">
        {label}
      </div>
      <div className="mt-1.5 text-3xl font-black text-brand-navy sm:mt-2 sm:text-4xl">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">{hint}</div>}
    </div>
  );
}