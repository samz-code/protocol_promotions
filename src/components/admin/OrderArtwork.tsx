import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  FileText, Download, Loader2, X, Eye, ExternalLink, Paperclip,
  Image as ImageIcon,
} from "lucide-react";

/* ============================================================
   Every artwork file attached to one order, from both routes:
     1. Files attached to a line item during checkout
     2. Files the customer uploaded later from their dashboard

   Used by the admin Production page and the Orders detail view so
   the floor and the office see the same thing.
   ============================================================ */

export type OrderArtworkFile = {
  id: string;
  url: string;
  filename: string;
  mimeType: string | null;
  notes: string | null;
  source: "checkout" | "portal";
  productName: string | null;
  createdAt: string | null;
};

function isImage(f: OrderArtworkFile) {
  if (f.mimeType) return f.mimeType.startsWith("image/");
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(f.url);
}

function isPdf(f: OrderArtworkFile) {
  return (f.mimeType ?? "").includes("pdf") || /\.pdf$/i.test(f.url);
}

export async function fetchOrderArtwork(orderId: string): Promise<OrderArtworkFile[]> {
  const [{ data: items }, { data: uploads }] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, product_name, artwork_url, notes")
      .eq("order_id", orderId),
    supabase
      .from("media")
      .select("id, url, filename, mime_type, notes, alt_text, created_at")
      .eq("order_id", orderId)
      .eq("folder", "client-artwork")
      .order("created_at", { ascending: false }),
  ]);

  const fromCheckout: OrderArtworkFile[] = (items ?? [])
    .filter((i: any) => i.artwork_url)
    .map((i: any) => ({
      id: `item-${i.id}`,
      url: i.artwork_url,
      filename: i.artwork_url.split("/").pop() ?? "artwork",
      mimeType: null,
      notes: i.notes ?? null,
      source: "checkout" as const,
      productName: i.product_name ?? null,
      createdAt: null,
    }));

  const fromPortal: OrderArtworkFile[] = (uploads ?? []).map((m: any) => ({
    id: `media-${m.id}`,
    url: m.url,
    filename: m.filename ?? "artwork",
    mimeType: m.mime_type ?? null,
    notes: m.notes ?? m.alt_text ?? null,
    source: "portal" as const,
    productName: null,
    createdAt: m.created_at ?? null,
  }));

  return [...fromCheckout, ...fromPortal];
}

export function useOrderArtwork(orderId: string | null | undefined) {
  return useQuery({
    queryKey: ["order-artwork", orderId],
    queryFn: () => fetchOrderArtwork(orderId!),
    enabled: Boolean(orderId),
  });
}

export function OrderArtworkPanel({
  orderId, compact = false,
}: {
  orderId: string;
  compact?: boolean;
}) {
  const { data: files = [], isLoading } = useOrderArtwork(orderId);
  const [preview, setPreview] = useState<OrderArtworkFile | null>(null);

  if (isLoading) {
    return (
      <div className="grid place-items-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-brand-navy/40" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <p className="py-3 text-xs italic text-brand-navy/45">
        No artwork attached to this order yet.
      </p>
    );
  }

  return (
    <>
      <div
        className={
          compact
            ? "flex flex-wrap gap-2"
            : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        {files.map((f) =>
          compact ? (
            <button
              key={f.id}
              type="button"
              onClick={() => setPreview(f)}
              title={f.filename}
              className="group relative h-14 w-14 shrink-0 overflow-hidden border-2 border-brand-navy transition-colors hover:border-brand-orange"
            >
              {isImage(f) ? (
                <img src={f.url} alt={f.filename} className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center bg-brand-surface">
                  <FileText className="h-5 w-5 text-brand-navy/45" />
                </span>
              )}
            </button>
          ) : (
            <article
              key={f.id}
              className="group flex flex-col overflow-hidden border-2 border-brand-navy/12 bg-white"
            >
              <button
                type="button"
                onClick={() => setPreview(f)}
                className="relative grid aspect-4/3 place-items-center overflow-hidden bg-brand-surface"
              >
                {isImage(f) ? (
                  <img
                    src={f.url}
                    alt={f.filename}
                    loading="lazy"
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <FileText className="h-9 w-9 text-brand-navy/25" />
                )}
                <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:bg-brand-navy/40 group-hover:opacity-100">
                  <span className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-brand-navy">
                    <Eye className="h-3 w-3" /> View
                  </span>
                </span>
              </button>

              <div className="flex flex-1 flex-col p-3">
                <div className="truncate text-xs font-bold text-brand-navy" title={f.filename}>
                  {f.filename}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      f.source === "portal"
                        ? "bg-brand-orange text-white"
                        : "border border-brand-navy/20 text-brand-navy/55"
                    }`}
                  >
                    {f.source === "portal" ? "Sent later" : "With order"}
                  </span>
                  {f.productName && (
                    <span className="truncate text-[10px] text-brand-navy/45">{f.productName}</span>
                  )}
                </div>

                {f.notes && (
                  <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-brand-navy/55">
                    {f.notes}
                  </p>
                )}

                <a
                  href={f.url}
                  download={f.filename}
                  className="mt-auto inline-flex items-center justify-center gap-1.5 border-2 border-brand-navy/15 px-2 py-1.5 text-[10px] font-black uppercase tracking-wide text-brand-navy transition-colors hover:border-brand-navy"
                >
                  <Download className="h-3 w-3" /> Download
                </a>
              </div>
            </article>
          )
        )}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-brand-navy/60 p-4 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden border-2 border-brand-navy bg-white shadow-[8px_8px_0_0_var(--color-brand-navy)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b-2 border-brand-navy px-5 py-3.5">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-black uppercase tracking-wide text-brand-navy">
                  {preview.filename}
                </h2>
                {preview.productName && (
                  <p className="text-[11px] text-brand-navy/50">{preview.productName}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={preview.url}
                  download={preview.filename}
                  className="inline-flex items-center gap-1.5 bg-brand-navy px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-white transition hover:brightness-110"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="grid h-8 w-8 place-items-center border-2 border-brand-navy/20 text-brand-navy transition-colors hover:border-brand-navy"
                  aria-label="Close preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid flex-1 place-items-center overflow-auto bg-brand-surface p-4">
              {isImage(preview) ? (
                <img
                  src={preview.url}
                  alt={preview.filename}
                  className="max-h-[68vh] max-w-full object-contain"
                />
              ) : isPdf(preview) ? (
                <iframe
                  src={preview.url}
                  title={preview.filename}
                  className="h-[68vh] w-full bg-white"
                />
              ) : (
                <div className="py-12 text-center">
                  <FileText className="mx-auto h-10 w-10 text-brand-navy/25" />
                  <p className="mt-3 text-xs font-bold text-brand-navy/55">
                    This file cannot be previewed here. Download it to open in your design software.
                  </p>
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 border-2 border-brand-navy px-4 py-2 text-[11px] font-black uppercase tracking-wide text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open in a new tab
                  </a>
                </div>
              )}
            </div>

            {preview.notes && (
              <div className="shrink-0 border-t-2 border-brand-navy/10 bg-white px-5 py-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-brand-navy/45">
                  Customer notes
                </div>
                <p className="mt-1 text-xs leading-relaxed text-brand-navy/70">{preview.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Small count badge for list rows. */
export function ArtworkCount({ orderId }: { orderId: string }) {
  const { data: files = [] } = useOrderArtwork(orderId);
  if (files.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-bold text-brand-orange">
      <Paperclip className="h-3 w-3" />
      {files.length}
    </span>
  );
}