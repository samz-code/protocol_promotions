import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/quotes")({
  head: () => ({ meta: [{ title: "Quotes — Client Dashboard" }, { name: "robots", content: "noindex" }] }),
  component: QuotesPage,
});

type QuoteItem = { item: string; qty: number };

type QuoteRow = {
  id: string;
  status: string;
  amount_due: number;
  items: QuoteItem[];
  created_at: string;
  updated_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-brand-orange/10 text-brand-orange",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

async function fetchQuotes(userId: string): Promise<QuoteRow[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select("id, status, amount_due, items, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as QuoteRow[];
}

function formatKsh(num: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(num);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function summarizeItems(items: QuoteItem[]) {
  if (!items || items.length === 0) return "Custom quote request";
  return items.map((i) => `${i.qty ? `${i.qty}x ` : ""}${i.item}`).join(", ");
}

function QuotesPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const { data: quotes, isLoading, error } = useQuery({
    queryKey: ["dashboard-quotes", session?.user?.id],
    queryFn: () => fetchQuotes(session!.user.id),
    enabled: !!session?.user?.id,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "declined" }) => {
      const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id }) => setPendingActionId(id),
    onSettled: () => setPendingActionId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-quotes", session?.user?.id] });
    },
  });

  return (
    <>
      {/* Consistent Page Header Section */}
      <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-brand-navy">Quotes</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Review, approve, or request pricing for custom merchandise and print configurations.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-brand-navy" />
          <p className="text-xs text-muted-foreground">Loading quotes...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-border bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-brand-navy">Failed to load quotes</p>
          <p className="text-xs text-muted-foreground mt-1">
            {error instanceof Error ? error.message : "Please try again shortly."}
          </p>
        </div>
      ) : !quotes || quotes.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">No quotes yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.map((q) => {
            const statusKey = q.status.toLowerCase();
            const isPending = statusKey === "pending";
            const isBusy = pendingActionId === q.id && updateStatus.isPending;

            return (
              <div key={q.id} className="rounded-xl border border-border bg-white p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="flex-1 min-w-55">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{q.id.slice(0, 8).toUpperCase()}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[statusKey] ?? STATUS_STYLE.pending}`}>
                      {q.status}
                    </span>
                  </div>
                  <div className="mt-1 font-semibold text-brand-navy">{summarizeItems(q.items)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {isPending ? `Requested ${formatDate(q.created_at)}` : `Updated ${formatDate(q.updated_at)}`}
                  </div>
                </div>

                <div className="flex items-center gap-6 flex-wrap sm:flex-nowrap">
                  <div className="text-lg font-bold text-brand-navy whitespace-nowrap">{formatKsh(q.amount_due ?? 0)}</div>

                  {isPending && (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => updateStatus.mutate({ id: q.id, status: "accepted" })}
                        disabled={isBusy}
                        className="flex-1 sm:flex-none rounded-md bg-brand-navy text-white px-4 py-2 text-sm font-semibold hover:brightness-110 active:brightness-95 transition-all disabled:opacity-50"
                      >
                        {isBusy ? "..." : "Approve"}
                      </button>
                      <button
                        onClick={() => updateStatus.mutate({ id: q.id, status: "declined" })}
                        disabled={isBusy}
                        className="flex-1 sm:flex-none rounded-md border border-border px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-muted active:bg-muted/70 transition-colors disabled:opacity-50"
                      >
                        {isBusy ? "..." : "Decline"}
                      </button>
                    </div>
                  )}

                  {statusKey === "accepted" && (
                    <span className="text-sm text-muted-foreground whitespace-nowrap bg-muted/40 px-3 py-1.5 rounded-md border border-border/40">
                      Accepted
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Request New Quote CTA block */}
      <div className="mt-6 rounded-xl border border-dashed border-border bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-muted-foreground font-medium">Need pricing for a new project?</p>
        <Link
          to="/request-quote"
          className="mt-3 inline-block rounded-md bg-brand-orange text-white px-5 py-2.5 text-sm font-semibold hover:brightness-95 active:brightness-90 transition-all shadow-sm"
        >
          Request a New Quote
        </Link>
      </div>
    </>
  );
}