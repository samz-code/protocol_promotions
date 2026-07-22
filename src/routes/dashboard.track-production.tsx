import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/track-production")({
  head: () => ({ meta: [{ title: "Track Production — Client Dashboard" }, { name: "robots", content: "noindex" }] }),
  component: TrackProductionPage,
});

const STAGES = [
  { value: "artwork_received", label: "Artwork Received" },
  { value: "artwork_approval", label: "Artwork Approval" },
  { value: "printing", label: "Printing" },
  { value: "embroidery", label: "Embroidery" },
  { value: "laser_engraving", label: "Laser Engraving" },
  { value: "packaging", label: "Packaging" },
  { value: "quality_check", label: "Quality Check" },
  { value: "ready", label: "Ready" },
  { value: "delivered", label: "Delivered" },
] as const;

type ProductionJobRow = {
  id: string;
  stage: string;
  expected_at: string | null;
  orders: {
    id: string;
    order_number: string;
    item_name: string;
  } | null;
};

async function fetchActiveProductionJobs(userId: string): Promise<ProductionJobRow[]> {
  const { data, error } = await supabase
    .from("production_jobs")
    .select("id, stage, expected_at, orders!inner(id, order_number, item_name, user_id)")
    .eq("orders.user_id", userId)
    .neq("stage", "delivered")
    .order("expected_at", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown as ProductionJobRow[];
}

function formatEta(dateStr: string | null) {
  if (!dateStr) return "ETA to be confirmed";
  const d = new Date(dateStr);
  return `Est. ready ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

function TrackProductionPage() {
  const { session } = useAuth();

  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ["dashboard-production-jobs", session?.user?.id],
    queryFn: () => fetchActiveProductionJobs(session!.user.id),
    enabled: !!session?.user?.id,
  });

  return (
    <>
      {/* Standardized Dashboard Subview Header Layout */}
      <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-brand-navy">Track Production</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor real-time assembly progress, quality verification, and estimated shipping timelines.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-brand-navy" />
          <p className="text-xs text-muted-foreground">Loading production status...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-border bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-brand-navy">Failed to load production status</p>
          <p className="text-xs text-muted-foreground mt-1">
            {error instanceof Error ? error.message : "Please try again shortly."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(jobs ?? []).map((job) => {
            const currentIndex = STAGES.findIndex((s) => s.value === job.stage);
            return (
              <div key={job.id} className="rounded-xl border border-border bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/40 pb-4">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{job.orders?.order_number}</span>
                    <h2 className="font-bold text-brand-navy text-base">{job.orders?.item_name}</h2>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md border border-border/30">
                    {formatEta(job.expected_at)}
                  </span>
                </div>

                {/* Stepped Progress Row with overflow safety protection */}
                <div className="mt-6 overflow-x-auto pb-2">
                  <div className="flex items-center min-w-2880">
                    {STAGES.map((stage, i) => {
                      const done = i <= currentIndex;
                      const isLast = i === STAGES.length - 1;
                      return (
                        <div key={stage.value} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center gap-2 w-24 text-center shrink-0">
                            <div
                              className={`h-8 w-8 rounded-full grid place-items-center text-xs font-bold transition-all ${
                                done ? "bg-brand-navy text-white" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {done ? <Check className="h-4 w-4 animate-in fade-in duration-200" /> : i + 1}
                            </div>
                            <span className={`text-xs ${done ? "text-brand-navy font-semibold" : "text-muted-foreground"}`}>
                              {stage.label}
                            </span>
                          </div>
                          {!isLast && (
                            <div className={`h-0.5 flex-1 -mt-6 transition-all duration-300 ${i < currentIndex ? "bg-brand-navy" : "bg-border"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {(jobs ?? []).length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center text-muted-foreground text-sm shadow-sm">
              No orders currently in production.
            </div>
          )}
        </div>
      )}
    </>
  );
}