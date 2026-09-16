import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud, FileCheck2, Loader2, AlertCircle, X, FileText,
  Image as ImageIcon, ArrowLeft, CheckCircle2, RotateCcw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/artwork/upload")({
  head: () => ({
    meta: [
      { title: "Saved Artwork | Client Dashboard" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UploadArtworkPage,
});

const BUCKET = "artworks";
const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPTED_EXT = [".ai", ".eps", ".pdf", ".png", ".jpg", ".jpeg", ".svg", ".psd"];

type OrderOption = { id: string; order_number: string; status: string };

/** The media.kind column is an enum: image, video, logo, pdf, artwork, other.
 *  Sending anything outside that list makes the insert fail. */
type MediaKind = "image" | "video" | "logo" | "pdf" | "artwork" | "other";

type FileStatus = "idle" | "uploading" | "done" | "error";

type FileItem = {
  id: string;
  file: File;
  previewUrl: string | null;
  status: FileStatus;
  error: string | null;
};

function mediaKindFor(file: File): MediaKind {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (/\.(ai|eps|psd|indd|sketch|svg)$/.test(name)) return "artwork";
  return "other";
}

function prettySize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function fetchMyOrders(userId: string): Promise<OrderOption[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("[upload] fetchMyOrders failed:", error);
    return [];
  }
  return (data ?? []) as OrderOption[];
}

/** Each stage is wrapped separately so a failure tells you exactly which
 *  step broke: auth, storage upload, public URL, or the DB insert. */
async function uploadOneFile({
  file, userId, notes, orderId,
}: {
  file: File;
  userId: string;
  notes: string;
  orderId: string;
}) {
  if (file.size > MAX_BYTES) {
    throw new Error(`${file.name} is larger than 25MB. Please compress it and try again.`);
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
  const path = `${userId}/${Date.now()}-${cleanFileName}`;

  // --- Stage 1: storage upload ---
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, cacheControl: "3600" });

  if (uploadError) {
    console.error("[upload] storage upload failed:", uploadError);
    throw new Error(`Could not upload ${file.name} to storage. ${uploadError.message}`);
  }

  // --- Stage 2: resolve a usable URL ---
  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!publicUrlData?.publicUrl) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(`Uploaded ${file.name} but could not resolve its URL.`);
  }

  // --- Stage 3: DB insert ---
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
    console.error("[upload] media insert failed:", insertError);
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(
      `Uploaded ${file.name} but could not save its record. ${insertError.message}` +
        (insertError.details ? ` (${insertError.details})` : "") +
        (insertError.hint ? ` Hint: ${insertError.hint}` : "")
    );
  }
}

function isAcceptedFile(file: File) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXT.some((ext) => name.endsWith(ext));
}

function UploadArtworkPage() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const userId = session?.user?.id;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const [items, setItems] = useState<FileItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [notes, setNotes] = useState("");
  const [rejected, setRejected] = useState<string[]>([]);
  const [allDone, setAllDone] = useState(false);

  const orders = useQuery({
    queryKey: ["my-orders", userId],
    queryFn: () => fetchMyOrders(userId!),
    enabled: !!userId,
  });

  // Prevent the browser from navigating away / opening the raw file if a
  // drop lands outside the dropzone (e.g. someone overshoots the target).
  useEffect(() => {
    const stop = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
    };
  }, []);

  // Revoke object URLs on unmount to avoid leaking memory.
  useEffect(() => {
    return () => {
      items.forEach((it) => it.previewUrl && URL.revokeObjectURL(it.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((list: FileList | File[] | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    if (incoming.length === 0) return;

    const accepted: File[] = [];
    const bad: string[] = [];
    for (const f of incoming) {
      if (isAcceptedFile(f)) accepted.push(f);
      else bad.push(f.name);
    }
    setRejected(bad);

    const newItems: FileItem[] = accepted.map((file) => ({
      id: makeId(),
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      status: "idle",
      error: null,
    }));

    setItems((prev) => [...prev, ...newItems]);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((it) => it.id !== id);
    });
  };

  const resetAll = () => {
    items.forEach((it) => it.previewUrl && URL.revokeObjectURL(it.previewUrl));
    setItems([]);
    setOrderId("");
    setNotes("");
    setRejected([]);
    setAllDone(false);
  };

  const updateItem = (id: string, patch: Partial<FileItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const upload = useMutation({
    mutationFn: async () => {
      if (items.length === 0) {
        throw new Error("Choose at least one file first.");
      }

      // Re-check the session live, rather than trusting the value that was
      // true when the component first mounted.
      const { data: liveSession, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !liveSession?.session?.user?.id) {
        throw new Error("Your session has expired. Please sign in again and retry the upload.");
      }
      const liveUserId = liveSession.session.user.id;

      let hadError = false;

      // Upload sequentially so per-file status updates are meaningful and
      // storage doesn't get hammered with a burst of parallel requests.
      for (const it of items) {
        if (it.status === "done") continue;
        updateItem(it.id, { status: "uploading", error: null });
        try {
          await uploadOneFile({ file: it.file, userId: liveUserId, notes, orderId });
          updateItem(it.id, { status: "done" });
        } catch (e) {
          hadError = true;
          updateItem(it.id, {
            status: "error",
            error: e instanceof Error ? e.message : "Upload failed.",
          });
        }
      }

      if (hadError) {
        throw new Error("Some files could not be uploaded. Check the list below and retry.");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard-artwork"] });
      qc.invalidateQueries({ queryKey: ["client-dashboard-metrics"] });
      setAllDone(true);
    },
    onError: (e) => {
      console.error("[upload] mutation failed:", e);
    },
  });

  const retryFailed = () => {
    upload.reset();
    upload.mutate();
  };

  const chosenOrder = (orders.data ?? []).find((o) => o.id === orderId);
  const totalSize = items.reduce((s, it) => s + it.file.size, 0);
  const oversizeItems = items.filter((it) => it.file.size > MAX_BYTES);
  const hasFailed = items.some((it) => it.status === "error");

  const disabledReason = !userId
    ? "Sign in to upload artwork."
    : items.length === 0
    ? "Add at least one file to enable this."
    : oversizeItems.length > 0
    ? "Remove or compress the oversized file(s) first."
    : null;

  if (allDone) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="border-b border-brand-navy/10 pb-5">
          <h1 className="text-xl font-bold text-brand-navy">Upload artwork</h1>
        </header>

        <div className="rounded-2xl border border-brand-navy/12 bg-white p-10 text-center shadow-[0_10px_40px_-20px_rgba(30,41,89,0.25)]">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50">
            <FileCheck2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="mt-5 text-lg font-bold text-brand-navy">
            {items.length === 1 ? "Artwork received" : `${items.length} files received`}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-brand-navy/60">
            {chosenOrder
              ? `We have it against order ${chosenOrder.order_number}. Our design team will check it and send you a proof before anything is printed.`
              : "Our design team will check it and send you a proof before anything is printed."}
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={resetAll}
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
    <div className="mx-auto max-w-3xl space-y-6">
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
        className="space-y-5"
      >
        {/* Dropzone — the whole area is a click + drop target */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            dragCounter.current += 1;
            setDragOver(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            e.preventDefault();
            dragCounter.current -= 1;
            // Only clear the highlight once we've actually left the zone,
            // not just moved over a child element (the classic flicker bug).
            if (dragCounter.current <= 0) {
              dragCounter.current = 0;
              setDragOver(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            dragCounter.current = 0;
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-150 ${
            dragOver
              ? "scale-[1.01] border-brand-orange bg-brand-orange/8 shadow-[0_0_0_6px_rgba(249,115,22,0.08)]"
              : "border-brand-navy/20 bg-white hover:border-brand-navy/40 hover:bg-brand-surface/60"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXT.join(",")}
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <div
            className={`mx-auto grid h-16 w-16 place-items-center rounded-full transition-all ${
              dragOver ? "bg-brand-orange/15" : "bg-brand-surface group-hover:bg-brand-orange/10"
            }`}
          >
            <UploadCloud
              className={`h-8 w-8 transition-colors ${
                dragOver ? "text-brand-orange" : "text-brand-navy/40 group-hover:text-brand-orange"
              }`}
            />
          </div>
          <p className="mt-4 text-base font-bold text-brand-navy">
            {dragOver ? "Drop to add these files" : "Drag files here, or click to browse"}
          </p>
          <p className="mt-1.5 text-xs text-brand-navy/45">
            AI, EPS, PDF, PNG, SVG or PSD · up to 25MB each · multiple files at once
          </p>
        </div>

        {rejected.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800">
              Skipped {rejected.length === 1 ? "file" : "files"} with an unsupported type:{" "}
              <span className="font-semibold">{rejected.join(", ")}</span>
            </p>
          </div>
        )}

        {/* Chosen files */}
        {items.length > 0 && (
          <div className="rounded-xl border border-brand-navy/12 bg-white p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-brand-navy/55">
                {items.length} {items.length === 1 ? "file" : "files"}
              </span>
              <span className="text-[11px] text-brand-navy/45">{prettySize(totalSize)} total</span>
            </div>
            <ul className="space-y-2">
              {items.map((it) => {
                const tooBig = it.file.size > MAX_BYTES;
                return (
                  <li
                    key={it.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                      it.status === "error"
                        ? "border-red-200 bg-red-50"
                        : it.status === "done"
                        ? "border-emerald-200 bg-emerald-50"
                        : tooBig
                        ? "border-red-200 bg-red-50"
                        : "border-brand-navy/12 bg-white"
                    }`}
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-brand-surface">
                      {it.previewUrl ? (
                        <img src={it.previewUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <FileText className="h-4 w-4 text-brand-navy/50" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-brand-navy">
                        {it.file.name}
                      </div>
                      <div
                        className={`text-[11px] ${
                          it.status === "error" || tooBig
                            ? "font-bold text-red-600"
                            : "text-brand-navy/45"
                        }`}
                      >
                        {it.status === "error"
                          ? it.error
                          : tooBig
                          ? `${prettySize(it.file.size)}, too large`
                          : prettySize(it.file.size)}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {it.status === "uploading" && (
                        <Loader2 className="h-4 w-4 animate-spin text-brand-navy/50" />
                      )}
                      {it.status === "done" && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )}
                      {it.status === "error" && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      {it.status !== "uploading" && (
                        <button
                          type="button"
                          onClick={() => removeItem(it.id)}
                          className="text-brand-navy/35 hover:text-brand-orange"
                          aria-label={`Remove ${it.file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Order + notes */}
        <div className="grid gap-4 rounded-xl border border-brand-navy/12 bg-white p-4 sm:grid-cols-2">
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
                No orders yet. Upload anyway and we will match it up when you order.
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
              placeholder="Placement, colours, size, anything we should know."
              className="w-full resize-none rounded-md border border-brand-navy/20 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-navy"
            />
          </div>
        </div>

        {upload.isError && (
          <div className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 p-3.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1 text-xs">
              <p className="font-bold text-red-700">Upload failed</p>
              <p className="mt-1 text-red-600">
                {upload.error instanceof Error
                  ? upload.error.message
                  : "Something went wrong. Please try again."}
              </p>
              {hasFailed && (
                <button
                  type="button"
                  onClick={retryFailed}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-red-700 underline"
                >
                  <RotateCcw className="h-3 w-3" /> Retry failed files
                </button>
              )}
            </div>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={!!disabledReason || upload.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-navy px-4 py-3.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {upload.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4" />
                {items.length > 1 ? `Send ${items.length} files` : "Send artwork"}
              </>
            )}
          </button>
          {disabledReason && !upload.isPending && (
            <p className="mt-2 text-center text-[11px] font-semibold text-brand-navy/50">
              {disabledReason}
            </p>
          )}
        </div>

        <p className="text-center text-[11px] text-brand-navy/45">
          Nothing is printed until you approve a proof.
        </p>
      </form>
    </div>
  );
}