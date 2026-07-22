import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/site/Logo";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { useAuth } from "@/lib/auth";
import { LogOut } from "lucide-react";

export function DashLayout({
  side, title, children,
}: {
  side: { label: string; to: string; icon?: ReactNode }[];
  title: string;
  children: ReactNode;
}) {
  const { profile, signOut } = useAuth();

  const initials = (profile?.full_name ?? profile?.email ?? "PP")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-brand-surface">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="hidden flex-col bg-brand-navy text-white/80 lg:flex">
          <div className="bg-white p-5">
            <Logo />
          </div>
          <nav className="flex-1 space-y-0.5 p-3">
            {side.map((item) => (
              <Link
                key={item.label}
                to={item.to as any}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-white/10 hover:text-white"
                activeProps={{ className: "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm bg-white/10 text-white font-semibold" }}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="border-t border-white/10 p-4 text-xs text-white/50">
            &copy; Protocol Promotions
          </div>
        </aside>

        <div className="flex flex-col">
          <header className="flex h-16 items-center justify-between border-b border-border bg-white px-6">
            <h1 className="text-lg font-extrabold text-brand-navy">{title}</h1>

            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="text-sm text-muted-foreground transition-colors hover:text-brand-navy"
              >
                Back to site
              </Link>

              {/* Live badge, updates over Realtime without a refresh */}
              <NotificationBell />

              <div
                className="grid h-9 w-9 place-items-center rounded-full bg-brand-orange text-sm font-bold text-white"
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

          <div className="p-6 md:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-extrabold text-brand-navy">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}