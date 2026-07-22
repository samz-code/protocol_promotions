import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud, FileCheck2, Loader2, AlertCircle, X, FileText,
  Image as ImageIcon, ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/artwork/upload")({
  head: () => ({
    meta: [
      { title: "Upload Artwork | Client Dashboard" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UploadArtworkPage,
});

const BUCKET = "artworks";
const MAX_BYTES = 25 * 1024 * 1024;

type OrderOption = { id: string; order_number: string; status: string };

function mediaKindFor(file: File): "image" | "document" {
  return file.type.startsWith("image/") ? "image" : "document";
}

function prettySize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fetchMyOrders(userId: string): Promise<OrderOption[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return (data ?? []) as OrderOption[];
}

async function uploadArtworkFiles({
  files, userId, notes, orderId,
}: {
  files: File[];
  userId: string;
  notes: string;
  orderId: string;
}) {
  for (const file of files) {
    if (file.size > MAX_BYTES) {
      throw new Error(`${file.name} is larger than 25MB. Please compress it and try again.`);
    }

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const path = `${userId}/${Date.now()}-${cleanFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false, cacheControl: "3600" });

    if (uploadError) {
      throw new Error(`Could not upload ${file.name}. ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (!publicUrlData?.publicUrl) {
      throw new Error("Could not resolve the file URL after upload.");
    }

    // order_id is a real relation now, so staff see this against the job.
    const { error: insertError } = await supabase.from("media").insert({
      bucket: BUCKET,
      path,
      url: publicUrlData.publicUrl,
      filename: file.name,
      kind: mediaKindFor(file),
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      folder: "client-artwork",
      notes: notes || null,
      alt_text: notes || null,
      order_id: orderId || null,
      uploaded_by: userId,
    });

    if (insertError) {
      throw new Error(`Saved the file but could not record it. ${insertError.message}`);
    }
  }
}

function UploadArtworkPage() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const userId = session?.user?.id;

  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [notes, setNotes] = useState("");

  const orders = useQuery({
    queryKey: ["my-orders", userId],
    queryFn: () => fetchMyOrders(userId!),
    enabled: !!userId,
  });

  const upload = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("Please sign in again to upload artwork.");
      if (files.length === 0) throw new Error("Choose at least one file.");
      return uploadArtworkFiles({ files, userId, notes, orderId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard-artwork"] });
      qc.invalidateQueries({ queryKey: ["client-dashboard-metrics"] });
    },
  });

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  };

  const chosenOrder = (orders.data ?? []).find((o) => o.id === orderId);
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const oversize = files.some((f) => f.size > MAX_BYTES);

  if (upload.isSuccess) {
    return (
      <div className="space-y-6">
        <header className="border-b border-brand-navy/10 pb-5">
          <h1 className="text-xl font-bold text-brand-navy">Upload artwork</h1>
        </header>

        <div className="mx-auto max-w-lg rounded-xl border border-brand-navy/12 bg-white p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50">
            <FileCheck2 className="h-7 w-7 text-emerald-600" />
          </div>
          <h2 className="mt-5 text-lg font-bold text-brand-navy">Artwork received</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-brand-navy/60">
            {chosenOrder
              ? `We have it against order ${chosenOrder.order_number}. Our design team will check it and send you a proof before anything is printed.`
              : "Our design team will check it and send you a proof before anything is printed."}
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setFiles([]);
                setOrderId("");
                setNotes("");
                upload.reset();
              }}
              className="rounded-md border border-brand-navy/20 px-5 py-2.5 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-navy"
            >
              Upload more
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/dashboard/artwork" })}
              className="rounded-md bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              View my artwork
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-brand-navy/10 pb-5">
        <Link
          to="/dashboard/artwork"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-navy/55 transition-colors hover:text-brand-orange"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Saved artwork
        </Link>
        <h1 className="mt-3 text-xl font-bold text-brand-navy">Upload artwork</h1>
        <p className="mt-1 text-sm text-brand-navy/55">
          Send us your logo or design files. We check them and send a proof before printing.
        </p>
      </header>

      <form
        onSubmit={(e) => { e.preventDefault(); upload.mutate(); }}
        className="max-w-2xl space-y-5 rounded-xl border border-brand-navy/12 bg-white p-6"
      >
        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          className={`rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
            dragOver ? "border-brand-orange bg-brand-orange/5" : "border-brand-navy/20"
          }`}
        >
          <UploadCloud className="mx-auto h-9 w-9 text-brand-navy/35" />
          <p className="mt-3 text-sm font-semibold text-brand-navy">
            Drag files here, or{" "}
            <label className="cursor-pointer text-brand-orange hover:underline">
              browse
              <input
                type="file"
                multiple
                accept=".ai,.eps,.pdf,.png,.jpg,.jpeg,.svg,.psd"
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </label>
          </p>
          <p className="mt-1.5 text-xs text-brand-navy/45">
            AI, EPS, PDF, PNG, SVG or PSD. Up to 25MB each.
          </p>
        </div>

        {/* Chosen files */}
        {files.length > 0 && (
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-brand-navy/55">
                {files.length} {files.length === 1 ? "file" : "files"}
              </span>
              <span className="text-[11px] text-brand-navy/45">{prettySize(totalSize)} total</span>
            </div>
            <ul className="space-y-2">
              {files.map((f, i) => {
                const tooBig = f.size > MAX_BYTES;
                const isImage = f.type.startsWith("image/");
                return (
                  <li
                    key={i}
                    className={`flex items-center gap-3 rounded-md border px-3 py-2.5 ${
                      tooBig ? "border-red-200 bg-red-50" : "border-brand-navy/12 bg-white"
                    }`}
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded bg-brand-surface">
                      {isImage ? (
                        <ImageIcon className="h-4 w-4 text-brand-navy/50" />
                      ) : (
                        <FileText className="h-4 w-4 text-brand-navy/50" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-brand-navy">{f.name}</div>
                      <div className={`text-[11px] ${tooBig ? "font-bold text-red-600" : "text-brand-navy/45"}`}>
                        {prettySize(f.size)}
                        {tooBig && ", too large"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="shrink-0 text-brand-navy/35 hover:text-brand-orange"
                      aria-label={`Remove ${f.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Order picker, real orders rather than typed text */}
        <div>
          <label htmlFor="art-order" className="mb-1.5 block text-sm font-semibold text-brand-navy">
            Which order is this for
            <span className="ml-2 text-[11px] font-normal text-brand-navy/45">Optional</span>
          </label>
          {orders.isLoading ? (
            <div className="rounded-md border border-brand-navy/15 px-3 py-2.5 text-sm text-brand-navy/45">
              Loading your orders...
            </div>
          ) : (orders.data ?? []).length === 0 ? (
            <div className="rounded-md border border-dashed border-brand-navy/20 px-3 py-2.5 text-xs text-brand-navy/50">
              You have no orders yet. Upload anyway and we will match it up when you order.
            </div>
          ) : (
            <select
              id="art-order"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full rounded-md border border-brand-navy/20 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-navy"
            >
              <option value="">Not for a specific order</option>
              {(orders.data ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number} ({o.status.replace(/_/g, " ")})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="art-notes" className="mb-1.5 block text-sm font-semibold text-brand-navy">
            Notes for our design team
            <span className="ml-2 text-[11px] font-normal text-brand-navy/45">Optional</span>
          </label>
          <textarea
            id="art-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Where the logo should sit, exact colours, size, anything we should know."
            className="w-full rounded-md border border-brand-navy/20 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-navy"
          />
        </div>

        {upload.isError && (
          <div className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 p-3.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div className="min-w-0 text-xs">
              <p className="font-bold text-red-700">Upload failed</p>
              <p className="mt-1 text-red-600">
                {upload.error instanceof Error
                  ? upload.error.message
                  : "Something went wrong. Please try again."}
              </p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={files.length === 0 || oversize || upload.isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-navy px-4 py-3.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {upload.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" /> Send artwork
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-brand-navy/45">
          Nothing is printed until you approve a proof.
        </p>
      </form>
    </div>
  );
}