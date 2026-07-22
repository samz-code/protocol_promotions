import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud, FileText, Image as ImageIcon, Download, Loader2, Search,
  X, Trash2, Eye, AlertCircle, Package, ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/artwork")({
  head: () => ({
    meta: [
      { title: "Saved Artwork | Client Dashboard" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ArtworkPage,
});

type Artwork = {
  id: string;
  bucket: string;
  path: string;
  url: string;
  filename: string;
  kind: string;
  mime_type: string | null;
  size_bytes: number | null;
  notes: string | null;
  alt_text: string | null;
  order_id: string | null;
  created_at: string;
  orders: { order_number: string } | null;
};

async function fetchArtwork(userId: string): Promise<Artwork[]> {
  const { data, error } = await supabase
    .from("media")
    .select(
      "id, bucket, path, url, filename, kind, mime_type, size_bytes, notes, alt_text, order_id, created_at"
    )
    .eq("uploaded_by", userId)
    .eq("folder", "client-artwork")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as Omit<Artwork, "orders">[];

  // Look the order numbers up separately rather than relying on an
  // embedded join, which needs a foreign key PostgREST can resolve.
  const orderIds = Array.from(
    new Set(rows.map((r) => r.order_id).filter((id): id is string => Boolean(id)))
  );

  const numberById = new Map<string, string>();
  if (orderIds.length > 0) {
    const { data: orders } = await supabase
      .from("orders")
      .select("id, order_number")
      .in("id", orderIds);
    for (const o of orders ?? []) numberById.set(o.id, o.order_number);
  }

  return rows.map((r) => ({
    ...r,
    orders: r.order_id
      ? { order_number: numberById.get(r.order_id) ?? "Unknown order" }
      : null,
  }));
}

function prettySize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function when(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function isPreviewable(a: Artwork) {
  return a.kind === "image" || (a.mime_type ?? "").startsWith("image/");
}

function ArtworkPage() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const userId = session?.user?.id;

  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<Artwork | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Artwork | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { data: artwork = [], isLoading, error } = useQuery({
    queryKey: ["dashboard-artwork", userId],
    queryFn: () => fetchArtwork(userId!),
    enabled: !!userId,
  });

  const del = useMutation({
    mutationFn: async (a: Artwork) => {
      // Remove the stored object first, then the record.
      const { error: storageError } = await supabase.storage.from(a.bucket).remove([a.path]);
      if (storageError) throw storageError;

      const { error: rowError } = await supabase.from("media").delete().eq("id", a.id);
      if (rowError) throw rowError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard-artwork"] });
      setConfirmDelete(null);
    },
    onError: (e: Error) => setErr(e.message),
  });

  const rows = useMemo(() => {
    if (!search.trim()) return artwork;
    const q = search.toLowerCase();
    return artwork.filter(
      (a) =>
        a.filename.toLowerCase().includes(q) ||
        (a.notes ?? a.alt_text ?? "").toLowerCase().includes(q) ||
        (a.orders?.order_number ?? "").toLowerCase().includes(q)
    );
  }, [artwork, search]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-navy/10 pb-5">
        <div>
          <h1 className="text-xl font-bold text-brand-navy">Saved artwork</h1>
          <p className="mt-1 text-sm text-brand-navy/55">
            {artwork.length > 0
              ? `${artwork.length} ${artwork.length === 1 ? "file" : "files"} we hold for your orders.`
              : "Files you send us are kept here for reorders."}
          </p>
        </div>
        <Link
          to="/dashboard/artwork/upload"
          className="inline-flex items-center gap-2 rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          <UploadCloud className="h-4 w-4" /> Upload artwork
        </Link>
      </header>

      {err && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-700">{err}</p>
            <button
              type="button"
              onClick={() => setErr(null)}
              className="mt-1 text-xs font-bold text-red-600 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {artwork.length > 3 && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files, notes or order number"
            className="w-full rounded-md border border-brand-navy/20 bg-white py-2.5 pl-9 pr-9 text-sm text-brand-navy outline-none transition focus:border-brand-navy"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-navy/40 hover:text-brand-navy"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-navy/50" />
          <p className="text-sm text-brand-navy/50">Loading your artwork...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto h-7 w-7 text-red-500" />
          <p className="mt-3 text-sm font-bold text-brand-navy">We could not load your artwork</p>
          <p className="mt-1 text-xs text-brand-navy/60">
            {error instanceof Error ? error.message : "Please try again shortly."}
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-brand-navy/15 bg-white p-14 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-surface">
            <ImageIcon className="h-6 w-6 text-brand-navy/35" />
          </div>
          <h2 className="mt-5 text-base font-bold text-brand-navy">
            {search ? "Nothing matches that search" : "No artwork saved yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-brand-navy/55">
            {search
              ? "Try a different file name or order number."
              : "Send us your logo or design files and we keep them here, ready for your next order."}
          </p>
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="mt-5 text-xs font-bold uppercase tracking-wide text-brand-orange hover:text-brand-navy"
            >
              Clear search
            </button>
          ) : (
            <Link
              to="/dashboard/artwork/upload"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <UploadCloud className="h-4 w-4" /> Upload artwork
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((a) => (
            <article
              key={a.id}
              className="group flex flex-col overflow-hidden rounded-xl border border-brand-navy/12 bg-white transition-all hover:border-brand-navy/30 hover:shadow-[0_10px_28px_-14px_rgba(30,41,89,0.25)]"
            >
              {/* Thumbnail */}
              <button
                type="button"
                onClick={() => setPreview(a)}
                className="relative grid aspect-4/3 place-items-center overflow-hidden bg-brand-surface"
              >
                {isPreviewable(a) ? (
                  <img
                    src={a.url}
                    alt={a.filename}
                    loading="lazy"
                    className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <FileText className="h-10 w-10 text-brand-navy/25" />
                )}
                <span className="absolute inset-0 grid place-items-center bg-brand-navy/0 opacity-0 transition-all group-hover:bg-brand-navy/40 group-hover:opacity-100">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-bold text-brand-navy">
                    <Eye className="h-3.5 w-3.5" /> View
                  </span>
                </span>
              </button>

              <div className="flex flex-1 flex-col p-4">
                <h3 className="truncate text-sm font-bold text-brand-navy" title={a.filename}>
                  {a.filename}
                </h3>

                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-brand-navy/45">
                  <span>{when(a.created_at)}</span>
                  {a.size_bytes ? <span>· {prettySize(a.size_bytes)}</span> : null}
                </div>

                {a.orders && (
                  <div className="mt-2 inline-flex w-fit items-center gap-1.5 rounded border border-brand-navy/15 bg-brand-surface px-2 py-1 text-[10px] font-bold text-brand-navy/70">
                    <Package className="h-3 w-3" />
                    {a.orders.order_number}
                  </div>
                )}

                {(a.notes ?? a.alt_text) && (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-brand-navy/55">
                    {a.notes ?? a.alt_text}
                  </p>
                )}

                <div className="mt-auto flex items-center gap-1.5 border-t border-brand-navy/8 pt-3">
                  <a
                    href={a.url}
                    download={a.filename}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-brand-navy/15 px-2.5 py-2 text-xs font-semibold text-brand-navy transition-colors hover:border-brand-navy"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                  <Link
                    to="/request-quote"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-brand-navy px-2.5 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                  >
                    Reorder
                  </Link>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(a)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-brand-navy/40 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                    aria-label={`Delete ${a.filename}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-brand-navy/60 p-4 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-brand-navy/10 px-5 py-3.5">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-brand-navy">{preview.filename}</h2>
                {preview.orders && (
                  <p className="text-[11px] text-brand-navy/45">{preview.orders.order_number}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={preview.url}
                  download={preview.filename}
                  className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="grid h-8 w-8 place-items-center rounded-md text-brand-navy/50 transition-colors hover:bg-brand-surface hover:text-brand-navy"
                  aria-label="Close preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid flex-1 place-items-center overflow-auto bg-brand-surface p-4">
              {isPreviewable(preview) ? (
                <img
                  src={preview.url}
                  alt={preview.filename}
                  className="max-h-[68vh] max-w-full object-contain"
                />
              ) : (preview.mime_type ?? "").includes("pdf") ? (
                <iframe
                  src={preview.url}
                  title={preview.filename}
                  className="h-[68vh] w-full bg-white"
                />
              ) : (
                <div className="py-12 text-center">
                  <FileText className="mx-auto h-10 w-10 text-brand-navy/25" />
                  <p className="mt-3 text-xs font-semibold text-brand-navy/55">
                    This file type cannot be previewed in the browser.
                  </p>
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-brand-navy/20 px-4 py-2 text-xs font-semibold text-brand-navy transition-colors hover:border-brand-navy"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open in a new tab
                  </a>
                </div>
              )}
            </div>

            {(preview.notes ?? preview.alt_text) && (
              <div className="shrink-0 border-t border-brand-navy/10 px-5 py-3">
                <p className="text-xs leading-relaxed text-brand-navy/60">
                  {preview.notes ?? preview.alt_text}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-brand-navy/50 p-4 backdrop-blur-sm"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-brand-navy">Delete this artwork?</h2>
                <p className="mt-2 text-sm leading-relaxed text-brand-navy/65">
                  <span className="font-semibold">{confirmDelete.filename}</span> will be removed
                  permanently. If we are already using it on an order, contact us before deleting.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2.5 text-sm font-semibold text-brand-navy/60 transition-colors hover:text-brand-navy"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => del.mutate(confirmDelete)}
                disabled={del.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {del.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}