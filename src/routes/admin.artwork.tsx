import { useMemo, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Download, FileText, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin/artwork")({
  head: () => ({ meta: [{ title: "Client Artwork — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminArtworkPage,
});

type Status = "pending" | "approved" | "rejected";

type AdminMediaRow = {
  id: string;
  filename: string;
  url: string;
  kind: string;
  folder: string;
  order_ref: string | null;
  alt_text: string | null;
  status: Status;
  created_at: string;
  uploaded_by: string;
  // Adjust the joined columns below to match your profiles table.
  profiles: { full_name: string | null; email: string | null } | null;
};

const STATUS_FILTERS: Array<{ label: string; value: Status | "all" }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const STATUS_STYLES: Record<Status, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

async function fetchAllArtwork(): Promise<AdminMediaRow[]> {
  const { data, error } = await supabase
    .from("media")
    .select(
      "id, filename, url, kind, folder, order_ref, alt_text, status, created_at, uploaded_by, profiles:uploaded_by (full_name, email)"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as AdminMediaRow[];
}

async function updateArtworkStatus({
  id,
  status,
  reviewerId,
}: {
  id: string;
  status: Status;
  reviewerId: string;
}) {
  const { error } = await supabase
    .from("media")
    .update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fileExt(filename: string) {
  return filename.split(".").pop()?.toUpperCase() ?? "FILE";
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

function AdminArtworkPage() {
  const { session, profile } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<Status | "all">("pending");
  const [search, setSearch] = useState("");

  // Guard: only admins get in. Swap `profile?.role` for however your app
  // stores the role if it differs from the profiles(role) pattern.
  const isAdmin = profile?.role === "admin";

  const { data: rows, isLoading, error } = useQuery({
    queryKey: ["admin-artwork"],
    queryFn: fetchAllArtwork,
    enabled: !!session?.user?.id && isAdmin,
  });

  const reviewMutation = useMutation({
    mutationFn: (vars: { id: string; status: Status }) =>
      updateArtworkStatus({ id: vars.id, status: vars.status, reviewerId: session!.user.id }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-artwork"] });
      const previous = queryClient.getQueryData<AdminMediaRow[]>(["admin-artwork"]);
      queryClient.setQueryData<AdminMediaRow[]>(["admin-artwork"], (old) =>
        old?.map((row) => (row.id === id ? { ...row, status } : row))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["admin-artwork"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-artwork"] });
    },
  });

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        row.filename.toLowerCase().includes(q) ||
        row.order_ref?.toLowerCase().includes(q) ||
        row.profiles?.full_name?.toLowerCase().includes(q) ||
        row.profiles?.email?.toLowerCase().includes(q)
      );
    });
  }, [rows, statusFilter, search]);

  if (!session?.user?.id) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 rounded-xl border border-border bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-brand-navy">Admins only</p>
        <p className="text-xs text-muted-foreground mt-1">You don't have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-bold text-brand-navy">Client Artwork</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Review, approve, or reject artwork submitted by clients across all orders.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold border transition-colors ${
                statusFilter === f.value
                  ? "bg-brand-navy text-white border-brand-navy"
                  : "bg-white text-brand-navy border-border hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by filename, order ref, or client..."
          className="ml-auto w-full sm:w-72 rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
        />
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-brand-navy" />
          <p className="text-xs text-muted-foreground">Loading submissions...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-border bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-brand-navy">Failed to load artwork</p>
          <p className="text-xs text-muted-foreground mt-1">
            {error instanceof Error ? error.message : "Please try again shortly."}
          </p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center text-muted-foreground text-sm shadow-sm">
          No submissions match this filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">File</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-[10rem]">
                      {row.kind === "image" ? (
                        <img src={row.url} alt={row.filename} className="h-9 w-9 rounded object-cover border border-border shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded border border-border flex items-center justify-center bg-muted shrink-0">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-brand-navy truncate max-w-[14rem]" title={row.filename}>
                          {row.filename}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">{fileExt(row.filename)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-brand-navy">{row.profiles?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{row.profiles?.email ?? ""}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.order_ref ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[16rem] truncate" title={row.alt_text ?? ""}>
                    {row.alt_text ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <a
                        href={row.url}
                        download={row.filename}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-border p-1.5 text-brand-navy hover:bg-muted"
                        title="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      {row.status !== "approved" && (
                        <button
                          onClick={() => reviewMutation.mutate({ id: row.id, status: "approved" })}
                          disabled={reviewMutation.isPending}
                          className="inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                          title="Approve"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {row.status !== "rejected" && (
                        <button
                          onClick={() => reviewMutation.mutate({ id: row.id, status: "rejected" })}
                          disabled={reviewMutation.isPending}
                          className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100 disabled:opacity-40"
                          title="Reject"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {row.status !== "pending" && (
                        <button
                          onClick={() => reviewMutation.mutate({ id: row.id, status: "pending" })}
                          disabled={reviewMutation.isPending}
                          className="inline-flex items-center justify-center rounded-md border border-border p-1.5 text-brand-navy hover:bg-muted disabled:opacity-40"
                          title="Reset to pending"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}