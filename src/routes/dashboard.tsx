import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { DashLayout } from "@/components/dashboard/DashLayout";
import { clientNav } from "@/components/dashboard/client-nav";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Client Dashboard | Protocol Promotions" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Anyone not signed in gets sent to login, with a way back here.
  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: "/login", search: { redirect: "/dashboard" }, replace: true });
    }
  }, [isLoading, user, navigate]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-brand-surface">
        <Loader2 className="h-5 w-5 animate-spin text-brand-navy/40" />
      </div>
    );
  }

  return (
    <DashLayout side={clientNav} title="Client Dashboard">
      <Outlet />
    </DashLayout>
  );
}