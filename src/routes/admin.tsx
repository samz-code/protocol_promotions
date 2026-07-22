import { useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

// Import your PNG brand asset logo
import logo from "@/assets/logo.png";

import {
  LayoutDashboard, Package, Layers, ShoppingCart, FileText, Users, Factory,
  Warehouse, CreditCard, Truck, Star, Globe, Image as ImageIcon, BarChart3,
  FileBarChart, LifeBuoy, Settings, Bell, LogOut, Menu, X, ShieldOff, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin | Protocol Promotions" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminShell,
});

type NavItem = {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  group: string;
};

const NAV: NavItem[] = [
  { label: "Dashboard",     to: "/admin",                icon: LayoutDashboard, group: "Overview" },

  { label: "Products",      to: "/admin/products",       icon: Package,      group: "Catalogue" },
  { label: "Categories",    to: "/admin/categories",     icon: Layers,       group: "Catalogue" },
  { label: "Inventory",     to: "/admin/inventory",      icon: Warehouse,    group: "Catalogue" },

  { label: "Orders",        to: "/admin/orders",         icon: ShoppingCart, group: "Commerce" },
  { label: "Quotes",        to: "/admin/quotes",         icon: FileText,     group: "Commerce" },
  { label: "Customers",     to: "/admin/customers",      icon: Users,        group: "Commerce" },
  { label: "Payments",      to: "/admin/payments",       icon: CreditCard,   group: "Commerce" },

  { label: "Production",    to: "/admin/production",     icon: Factory,      group: "Operations" },
  { label: "Deliveries",    to: "/admin/deliveries",     icon: Truck,        group: "Operations" },

  { label: "Reviews",       to: "/admin/reviews",        icon: Star,         group: "Content" },
  { label: "Website CMS",   to: "/admin/cms",            icon: Globe,        group: "Content" },
  { label: "Media",         to: "/admin/media",          icon: ImageIcon,    group: "Content" },

  { label: "Analytics",     to: "/admin/analytics",      icon: BarChart3,    group: "Insight" },
  { label: "Reports",       to: "/admin/reports",        icon: FileBarChart, group: "Insight" },

  { label: "Support",       to: "/admin/support",        icon: LifeBuoy,     group: "System" },
  { label: "Notifications", to: "/admin/notifications",  icon: Bell,         group: "System" },
  { label: "Settings",      to: "/admin/settings",       icon: Settings,     group: "System" },
];

const GROUPS = ["Overview", "Catalogue", "Commerce", "Operations", "Content", "Insight", "System"];

function AdminShell() {
  const { isLoading, session, isStaff, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-brand-navy" />
      </div>
    );
  }

  if (!session) {
    return <Denied reason="signed-out" />;
  }

  if (!isStaff) {
    return <Denied reason="not-staff" />;
  }

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-brand-navy bg-brand-navy text-white lg:flex">
          <SidebarBody profile={profile} onSignOut={handleSignOut} />
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 bg-brand-navy/50 lg:hidden" onClick={() => setMobileOpen(false)}>
            <aside
              className="absolute inset-y-0 left-0 flex w-72 flex-col bg-brand-navy text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute right-4 top-5 grid h-9 w-9 place-items-center text-white/60 hover:text-white z-10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarBody
                profile={profile}
                onSignOut={handleSignOut}
                onNavigate={() => setMobileOpen(false)}
              />
            </aside>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <TopBar onOpenMenu={() => setMobileOpen(true)} />
          <main className="px-5 py-8 md:px-8 md:py-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function SidebarBody({
  profile, onSignOut, onNavigate,
}: {
  profile: { full_name: string | null; email: string; role: string } | null;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <>
      <div className="border-b border-white/15 px-5 py-6 flex items-center justify-between">
        <Link to="/admin" onClick={onNavigate} className="block">
          <img 
            src={logo} 
            alt="Protocol Logo" 
            className="h-14 w-auto object-contain brightness-0 invert" 
          />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {GROUPS.map((group) => {
          const items = NAV.filter((n) => n.group === group);
          if (items.length === 0) return null;

          return (
            <div key={group} className="mb-5">
              <div className="px-5 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                {group}
              </div>
              {items.map((item) => {
                const isActive =
                  item.to === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.to);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 border-l-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? "border-brand-orange bg-white/10 text-white"
                        : "border-transparent text-white/60 hover:border-white/25 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/15 px-5 py-4">
        <div className="truncate text-sm font-bold">{profile?.full_name ?? "Unnamed"}</div>
        <div className="mt-0.5 truncate text-xs text-white/50">{profile?.email}</div>
        <div className="mt-1 inline-block bg-brand-orange px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
          {profile?.role}
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-4 flex w-full items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/50 transition-colors hover:text-brand-orange"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </>
  );
}

/** Staff alerts only. Without the audience filter this counts every
 *  customer's unread notifications too, which is meaningless here. */
async function fetchUnreadCount() {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false)
    .eq("audience", "staff");

  if (error) throw error;
  return count ?? 0;
}

function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { data: unread = 0 } = useQuery({
    queryKey: ["admin", "unread-notifications"],
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-brand-navy bg-white px-5 md:px-8">
      <button
        type="button"
        onClick={onOpenMenu}
        className="grid h-9 w-9 place-items-center text-brand-navy lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="ml-auto flex items-center gap-4">
        <Link
          to="/"
          className="text-xs font-bold uppercase tracking-wide text-brand-navy/60 transition-colors hover:text-brand-orange"
        >
          View site
        </Link>
        <Link
          to="/admin/notifications"
          className="relative grid h-9 w-9 place-items-center text-brand-navy transition-colors hover:text-brand-orange"
          aria-label={`${unread} unread notifications`}
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center bg-brand-orange px-1 text-[9px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}

function Denied({ reason }: { reason: "signed-out" | "not-staff" }) {
  const signedOut = reason === "signed-out";

  return (
    <div className="grid min-h-screen place-items-center bg-white px-5">
      <div className="max-w-md">
        <ShieldOff className="h-10 w-10 text-brand-orange" />
        <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-brand-navy">
          {signedOut ? "You are not signed in." : "This is not for you."}
        </h1>
        <p className="mt-5 text-base leading-relaxed text-brand-navy/70">
          {signedOut
            ? "The control room needs a staff account. Sign in and try again."
            : "Your account exists, but it does not carry staff or admin permissions. If that is wrong, someone with an admin account needs to change your role."}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {signedOut ? (
            <Link
              to="/login"
              search={{ redirect: "/admin" }}
              className="inline-flex items-center gap-2 bg-brand-navy px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition-all hover:-translate-y-0.5 hover:brightness-110"
            >
              Sign in
            </Link>
          ) : null}
          <Link
            to="/"
            className="inline-flex items-center gap-2 border border-brand-navy px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-brand-navy transition-all hover:-translate-y-0.5 hover:border-brand-orange hover:text-brand-orange"
          >
            Back to site
          </Link>
        </div>
      </div>
    </div>
  );
}