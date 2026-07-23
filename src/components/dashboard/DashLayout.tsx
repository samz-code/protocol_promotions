import { useState, useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/site/Logo";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { useAuth } from "@/lib/auth";
import { LogOut, Menu, X } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-brand-surface">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden flex-col bg-brand-navy text-white/80 lg:flex">
          <SidebarBody side={side} profile={profile} initials={initials} onSignOut={signOut} />
        </aside>

        {/* Mobile drawer. Without this the menu is simply unreachable on a phone. */}
        {menuOpen && (
          <div
            className="fixed inset-0 z-50 bg-brand-navy/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <aside
              className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-brand-navy text-white/80"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="absolute right-3 top-4 z-10 grid h-9 w-9 place-items-center text-white/60 transition-colors hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarBody
                side={side}
                profile={profile}
                initials={initials}
                onSignOut={signOut}
              />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-white px-4 sm:h-16 sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-brand-navy transition-colors hover:bg-brand-surface lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="truncate text-base font-extrabold text-brand-navy sm:text-lg">
                {title}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <Link
                to="/"
                className="hidden text-sm text-muted-foreground transition-colors hover:text-brand-navy sm:inline"
              >
                Back to site
              </Link>

              <NotificationBell />

              <div
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-orange text-xs font-bold text-white sm:h-9 sm:w-9 sm:text-sm"
                title={profile?.full_name ?? profile?.email ?? ""}
              >
                {initials}
              </div>

              <button
                type="button"
                onClick={() => signOut()}
                className="grid h-9 w-9 place-items-center rounded-md text-brand-navy/50 transition-colors hover:bg-brand-surface hover:text-brand-orange"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
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
  side, profile, initials, onSignOut,
}: {
  side: NavItem[];
  profile: { full_name: string | null; email: string; role: string } | null;
  initials: string;
  onSignOut: () => void;
}) {
  return (
    <>
      <div className="bg-white p-5">
        <Logo />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {side.map((item) => (
          <Link
            key={item.label}
            to={item.to as any}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-white/10 hover:text-white"
            activeProps={{
              className:
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm bg-white/10 text-white font-semibold",
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Account block, only useful inside the drawer on mobile but harmless on desktop */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-orange text-xs font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">
              {profile?.full_name ?? "Your account"}
            </div>
            <div className="truncate text-[11px] text-white/50">{profile?.email}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <Link
            to="/"
            className="text-[11px] font-bold uppercase tracking-wide text-white/50 transition-colors hover:text-white"
          >
            Back to site
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white/50 transition-colors hover:text-brand-orange"
          >
            <LogOut className="h-3 w-3" />
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
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:text-xs">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-extrabold text-brand-navy sm:mt-2 sm:text-3xl">
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{hint}</div>}
    </div>
  );
}