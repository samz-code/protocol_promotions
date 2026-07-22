import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminHeader, AdminLoading, AdminError, AdminEmpty, StatusBadge, ago } from "@/lib/admin-ui";
import { OrderArtworkPanel } from "@/components/admin/OrderArtwork";
import {
  ChevronDown, ChevronRight, FileText, Plus, Trash2, X,
  ArrowRight, Info, CheckCircle2, AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/admin/production")({
  head: () => ({ meta: [{ title: "Production | Admin" }] }),
  component: ProductionPage,
});

const STAGES = [
  "artwork_received", "artwork_approval", "printing", "embroidery",
  "laser_engraving", "packaging", "quality_check", "ready", "delivered",
];

const STAGE_LABELS: Record<string, string> = {
  artwork_received: "Artwork received",
  artwork_approval: "Artwork approval",
  printing: "Printing",
  embroidery: "Embroidery",
  laser_engraving: "Laser engraving",
  packaging: "Packaging",
  quality_check: "Quality check",
  ready: "Ready",
  delivered: "Delivered",
};

// What the admin should do while a job sits in each stage.
const STAGE_ACTIONS: Record<string, string> = {
  artwork_received: "Check the customer artwork is usable, then send a proof for approval.",
  artwork_approval: "Waiting on the customer to approve the proof. Chase if it has been sitting.",
  printing: "On the press. Move it on once the run is finished.",
  embroidery: "On the embroidery machine. Move it on once stitched.",
  laser_engraving: "On the laser. Move it on once engraved.",
  packaging: "Being boxed and labelled for dispatch.",
  quality_check: "Inspect against the approved proof before it leaves.",
  ready: "Finished and waiting for pickup or courier collection.",
  delivered: "Job complete. Nothing further needed.",
};

type ArtworkItem = {
  id: string;
  product_name: string;
  artwork_url: string | null;
  selected_color: string | null;
  selected_size: string | null;
  print_method: string | null;
};

type Job = {
  id: string;
  stage: string;
  created_at: string;
  order_id: string;
  orders: { order_number: string; order_items: ArtworkItem[] } | null;
};

type OrderOption = { id: string; order_number: string };

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp)$/i.test(url);
}

function nextStage(stage: string): string | null {
  const i = STAGES.indexOf(stage);
  if (i === -1 || i >= STAGES.length - 1) return null;
  return STAGES[i + 1];
}

async function fetchJobs(): Promise<Job[]> {
  const { data, error } = await supabase
    .from("production_jobs")
    .select(
      "id, stage, created_at, order_id, orders(order_number, order_items(id, product_name, artwork_url, selected_color, selected_size, print_method))"
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as unknown as Job[];
}

async function fetchRecentOrders(): Promise<OrderOption[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

function ProductionPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "production"], queryFn: fetchJobs });

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; orderNumber: string } | null>(null);

  const advance = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase.from("production_jobs").update({ stage }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "production"] }),
  });

  const createJob = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("production_jobs")
        .insert({ order_id: orderId, stage: "artwork_received" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "production"] });
      setCreateOpen(false);
      setSelectedOrderId("");
    },
  });

  const deleteJob = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("production_jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "production"] });
      setConfirmDelete(null);
    },
  });

  const recentOrders = useQuery({
    queryKey: ["admin", "orders-for-job-create"],
    queryFn: fetchRecentOrders,
    enabled: createOpen,
  });

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (query.isLoading) return <AdminLoading />;
  if (query.isError) return <AdminError message={(query.error as Error).message} />;

  const jobs = query.data ?? [];
  const active = jobs.filter((j) => j.stage !== "delivered");
  const assignedOrderIds = new Set(jobs.map((j) => j.order_id));
  const unassignedOrders = (recentOrders.data ?? []).filter((o) => !assignedOrderIds.has(o.id));

  // Count jobs per stage for the pipeline strip.
  const stageCounts = STAGES.map((s) => ({
    stage: s,
    count: jobs.filter((j) => j.stage === s).length,
  }));

  const visibleJobs = stageFilter ? jobs.filter((j) => j.stage === stageFilter) : jobs;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AdminHeader title="Production" subtitle={`${active.length} jobs on the floor.`} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className="inline-flex items-center gap-2 border-2 border-brand-navy px-4 py-2.5 text-xs font-black uppercase tracking-widest text-brand-navy hover:bg-brand-navy hover:text-white transition-all"
          >
            <Info className="h-4 w-4" /> How this works
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 bg-brand-navy px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:brightness-110 transition-all"
          >
            <Plus className="h-4 w-4" /> New job
          </button>
        </div>
      </div>

      {/* Explainer */}
      {showGuide && (
        <div className="border-2 border-brand-navy bg-brand-surface p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-brand-navy">
              What this page is for
            </h2>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="grid h-6 w-6 shrink-0 place-items-center text-brand-navy/50 hover:text-brand-navy"
              aria-label="Close guide"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-brand-navy/75 leading-relaxed max-w-3xl">
            This tracks every paid order as it moves through the workshop, so you always know what is on
            the floor and what stage it has reached.
          </p>
          <ol className="space-y-2.5 text-sm text-brand-navy/75 max-w-3xl">
            <li className="flex gap-3">
              <span className="font-mono text-xs font-bold text-brand-orange shrink-0 mt-0.5">01</span>
              <span><strong className="text-brand-navy">Create a job</strong> when an order is ready to be made. It starts at "Artwork received".</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs font-bold text-brand-orange shrink-0 mt-0.5">02</span>
              <span><strong className="text-brand-navy">Expand the row</strong> to see each item, its colour, size, print method and the customer artwork your team needs to produce it.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs font-bold text-brand-orange shrink-0 mt-0.5">03</span>
              <span><strong className="text-brand-navy">Advance the stage</strong> as the physical work progresses. Use the arrow button to move to the next step, or the dropdown to jump anywhere.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs font-bold text-brand-orange shrink-0 mt-0.5">04</span>
              <span><strong className="text-brand-navy">Mark it Delivered</strong> once it reaches the customer. The job then drops off the active count.</span>
            </li>
          </ol>
        </div>
      )}

      {advance.isError && <AdminError message={(advance.error as Error).message} />}
      {createJob.isError && <AdminError message={(createJob.error as Error).message} />}
      {deleteJob.isError && <AdminError message={(deleteJob.error as Error).message} />}

      {/* Visual pipeline */}
      {jobs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-brand-navy/50">
              Pipeline
            </h2>
            {stageFilter && (
              <button
                type="button"
                onClick={() => setStageFilter(null)}
                className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-brand-orange hover:text-brand-navy"
              >
                Show all <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-2">
            {stageCounts.map((sc, i) => {
              const isActive = stageFilter === sc.stage;
              const isLast = i === stageCounts.length - 1;
              return (
                <div key={sc.stage} className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setStageFilter(isActive ? null : sc.stage)}
                    className={`min-w-30 border-2 px-3 py-2.5 text-left transition-all ${
                      isActive
                        ? "border-brand-navy bg-brand-navy text-white"
                        : sc.count > 0
                          ? "border-brand-navy bg-white text-brand-navy hover:bg-brand-surface"
                          : "border-brand-navy/15 bg-white text-brand-navy/35"
                    }`}
                  >
                    <div className="text-xl font-black tabular-nums leading-none">{sc.count}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wide leading-tight">
                      {STAGE_LABELS[sc.stage]}
                    </div>
                  </button>
                  {!isLast && <ArrowRight className="h-3.5 w-3.5 text-brand-navy/25 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <AdminEmpty text="No production jobs yet. Create one from a paid order to start tracking it through the workshop." />
      ) : visibleJobs.length === 0 ? (
        <AdminEmpty text={`No jobs currently at "${STAGE_LABELS[stageFilter!]}".`} />
      ) : (
        <div className="border-2 border-brand-navy overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-brand-navy text-white text-[11px] font-black uppercase tracking-widest">
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3 hidden lg:table-cell">What to do now</th>
                <th className="px-4 py-3 hidden md:table-cell">Since</th>
                <th className="px-4 py-3 text-right">Advance</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {visibleJobs.map((j) => {
                const items = j.orders?.order_items ?? [];
                const artworkCount = items.filter((it) => it.artwork_url).length;
                const isOpen = expanded.has(j.id);
                const next = nextStage(j.stage);
                const isDone = j.stage === "delivered";

                return (
                  <>
                    <tr key={j.id} className="border-b border-brand-navy/10 hover:bg-brand-surface transition-colors">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(j.id)}
                          className="grid h-6 w-6 place-items-center text-brand-navy/50 hover:text-brand-navy"
                          aria-label={isOpen ? "Collapse artwork" : "Expand artwork"}
                        >
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-brand-navy">
                        <div className="flex items-center gap-2">
                          {j.orders?.order_number ?? "-"}
                          {artworkCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-bold text-brand-orange normal-case tracking-normal">
                              <FileText className="h-3 w-3" /> {artworkCount}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge label={STAGE_LABELS[j.stage] ?? j.stage} tone={isDone ? "good" : "solid"} />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-brand-navy/60 max-w-xs">
                        {STAGE_ACTIONS[j.stage] ?? ""}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-brand-navy/50 text-xs">{ago(j.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {next ? (
                            <button
                              type="button"
                              disabled={advance.isPending}
                              onClick={() => advance.mutate({ id: j.id, stage: next })}
                              className="inline-flex items-center gap-1.5 bg-brand-orange px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-white hover:brightness-110 disabled:opacity-40 transition-all whitespace-nowrap"
                              title={`Move to ${STAGE_LABELS[next]}`}
                            >
                              {STAGE_LABELS[next]} <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-navy/40">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                            </span>
                          )}
                          <select
                            value={j.stage}
                            onChange={(e) => advance.mutate({ id: j.id, stage: e.target.value })}
                            className="border-2 border-brand-navy/20 px-2 py-1.5 text-xs text-brand-navy outline-none focus:border-brand-navy"
                            title="Jump to any stage"
                          >
                            {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDelete({
                              id: j.id,
                              orderNumber: j.orders?.order_number ?? "this order",
                            })
                          }
                          className="grid h-7 w-7 place-items-center text-brand-navy/40 hover:text-red-600 transition-colors"
                          aria-label="Delete job"
                          title="Delete job"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="border-b border-brand-navy/10 bg-brand-surface/40">
                        <td></td>
                        <td colSpan={6} className="px-4 py-4">
                          <div className="mb-3 text-[11px] font-black uppercase tracking-widest text-brand-navy/50">
                            All artwork for this order
                          </div>
                          <div className="mb-5">
                            <OrderArtworkPanel orderId={j.order_id} />
                          </div>

                          <div className="mb-3 text-[11px] font-black uppercase tracking-widest text-brand-navy/50">
                            Items to produce
                          </div>
                          {items.length === 0 ? (
                            <p className="text-xs text-brand-navy/45 italic">No line items found for this order.</p>
                          ) : (
                            <div className="space-y-1">
                              {items.map((item) => {
                                const specs = [item.selected_color, item.selected_size, item.print_method]
                                  .filter(Boolean)
                                  .join(" · ");
                                return (
                                  <div
                                    key={item.id}
                                    className="flex items-center gap-3 py-2.5 border-b border-brand-navy/10 last:border-0"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-bold text-brand-navy">{item.product_name}</div>
                                      {specs && <div className="text-[11px] text-brand-navy/50 mt-0.5">{specs}</div>}
                                    </div>

                                    {item.artwork_url ? (
                                      isImageUrl(item.artwork_url) ? (
                                        <button
                                          type="button"
                                          onClick={() => setPreview({ url: item.artwork_url!, name: item.product_name })}
                                          className="shrink-0"
                                          title="View artwork"
                                        >
                                          <img
                                            src={item.artwork_url}
                                            alt={`Artwork for ${item.product_name}`}
                                            className="h-12 w-12 object-cover border-2 border-brand-navy hover:border-brand-orange transition-colors"
                                          />
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setPreview({ url: item.artwork_url!, name: item.product_name })}
                                          className="shrink-0 inline-flex items-center gap-1.5 border-2 border-brand-navy px-2.5 py-1.5 text-[11px] font-bold text-brand-navy hover:bg-white transition-colors"
                                        >
                                          <FileText className="h-3.5 w-3.5" /> View file
                                        </button>
                                      )
                                    ) : (
                                      <span className="shrink-0 text-[11px] text-brand-navy/35 italic">
                                        No artwork uploaded
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-brand-navy/60 grid place-items-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] flex flex-col border-2 border-brand-navy bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b-2 border-brand-navy">
              <h2 className="text-sm font-black uppercase tracking-widest text-brand-navy truncate pr-4">
                {preview.name}
              </h2>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="grid h-7 w-7 shrink-0 place-items-center text-brand-navy/50 hover:text-brand-navy"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-brand-surface grid place-items-center p-4">
              {isImageUrl(preview.url) ? (
                <img
                  src={preview.url}
                  alt={preview.name}
                  className="max-w-full max-h-[65vh] object-contain border border-brand-navy/10"
                />
              ) : preview.url.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={preview.url}
                  title={preview.name}
                  className="w-full h-[65vh] bg-white border border-brand-navy/10"
                />
              ) : (
                <div className="text-center py-10">
                  <FileText className="h-10 w-10 text-brand-navy/30 mx-auto" />
                  <p className="mt-3 text-xs font-bold text-brand-navy/60">
                    Preview isn't available for this file type in the browser.
                  </p>
                  <a
                    href={preview.url}
                    download
                    className="mt-4 inline-flex items-center gap-2 border-2 border-brand-navy px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-navy hover:bg-white transition-colors"
                  >
                    Download file
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 bg-brand-navy/50 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-md border-2 border-brand-navy bg-white shadow-[8px_8px_0_0_var(--color-brand-navy)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 p-6">
              <div className="grid h-11 w-11 shrink-0 place-items-center bg-red-50 border-2 border-red-200">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-black uppercase tracking-wide text-brand-navy">
                  Delete production job
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-brand-navy/70">
                  This removes the job for{" "}
                  <span className="font-mono font-bold text-brand-navy">{confirmDelete.orderNumber}</span>{" "}
                  from the floor. The order itself is not affected, but the tracking history for this job
                  is gone for good.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t-2 border-brand-navy/10 bg-brand-surface px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2.5 text-xs font-black uppercase tracking-widest text-brand-navy/60 hover:text-brand-navy transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteJob.isPending}
                onClick={() => deleteJob.mutate(confirmDelete.id)}
                className="inline-flex items-center gap-2 bg-red-600 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:brightness-110 disabled:opacity-40 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleteJob.isPending ? "Deleting..." : "Delete job"}
              </button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 bg-brand-navy/40 grid place-items-center p-4">
          <div className="w-full max-w-md border-2 border-brand-navy bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-brand-navy">New production job</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="grid h-7 w-7 place-items-center text-brand-navy/50 hover:text-brand-navy"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-xs text-brand-navy/60">
              Pick an order that doesn't already have a production job. It will start at "Artwork received".
            </p>

            <div className="mt-4">
              {recentOrders.isLoading ? (
                <p className="text-xs text-brand-navy/50">Loading orders...</p>
              ) : unassignedOrders.length === 0 ? (
                <p className="text-xs text-brand-navy/50">
                  Every recent order already has a production job.
                </p>
              ) : (
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full border-2 border-brand-navy/20 px-3 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-navy"
                >
                  <option value="">Select an order...</option>
                  {unassignedOrders.map((o) => (
                    <option key={o.id} value={o.id}>{o.order_number}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2.5 text-xs font-black uppercase tracking-widest text-brand-navy/60 hover:text-brand-navy"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedOrderId || createJob.isPending}
                onClick={() => createJob.mutate(selectedOrderId)}
                className="inline-flex items-center gap-2 bg-brand-navy px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:brightness-110 disabled:opacity-40 transition-all"
              >
                {createJob.isPending ? "Creating..." : "Create job"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}