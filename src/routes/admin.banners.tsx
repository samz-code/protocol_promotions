import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  fetchPromotionalBanners,
  createPromotionalBannerId,
  isSafeBannerHref,
  savePromotionalBanners,
  type PromotionalBanner,
} from "@/lib/promotionalBanners";

export const Route = createFileRoute("/admin/banners")({
  head: () => ({ meta: [{ title: "Ads & offer banners | Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminBannersPage,
});

type BannerDraft = Omit<PromotionalBanner, "id">;

const EMPTY_DRAFT: BannerDraft = {
  name: "",
  kind: "ad",
  format: "landscape",
  image_url: "",
  alt_text: "",
  href: "",
  is_active: true,
  starts_at: null,
  ends_at: null,
};

const BUCKET = "promotional-banners";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const inputClass = "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function validateLandscapeImage(file: File) {
  const image = await createImageBitmap(file);
  const { width, height } = image;
  image.close();
  if (width < 1200 || height < 600) {
    throw new Error("Landscape banner images must be at least 1200 x 600 pixels.");
  }
}

function AdminBannersPage() {
  const queryClient = useQueryClient();
  const bannersQuery = useQuery({ queryKey: ["promotional-banners"], queryFn: fetchPromotionalBanners });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BannerDraft>(EMPTY_DRAFT);
  const [formOpen, setFormOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const saveMutation = useMutation({
    mutationFn: savePromotionalBanners,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["promotional-banners"] });
      setFormOpen(false);
      setEditingId(null);
      setErrorMessage(null);
    },
    onError: (error) => setErrorMessage(getErrorMessage(error, "Unable to save banners.")),
  });

  const openNew = () => {
    setDraft({ ...EMPTY_DRAFT });
    setEditingId(null);
    setErrorMessage(null);
    setFormOpen(true);
  };

  const openEdit = (banner: PromotionalBanner) => {
    const { id: _id, ...rest } = banner;
    void _id;
    setDraft(rest);
    setEditingId(banner.id);
    setErrorMessage(null);
    setFormOpen(true);
  };

  const updateDraft = <K extends keyof BannerDraft>(key: K, value: BannerDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setErrorMessage("The image must be 10 MB or smaller.");
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    try {
      if (draft.format === "landscape") await validateLandscapeImage(file);
      const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const path = `homepage-banners/${createPromotionalBannerId()}.${extension}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
      });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      updateDraft("image_url", data.publicUrl);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to upload the image."));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const href = draft.href.trim();
    if (!draft.name.trim()) {
      setErrorMessage("Enter an internal banner name.");
      return;
    }
    if (!draft.image_url) {
      setErrorMessage("Upload an image for this banner.");
      return;
    }
    if (href && !isSafeBannerHref(href)) {
      setErrorMessage("Use a site path, https://, mailto: or tel: link.");
      return;
    }
    if (draft.starts_at && draft.ends_at && new Date(draft.ends_at).getTime() <= new Date(draft.starts_at).getTime()) {
      setErrorMessage("The end date must be after the start date.");
      return;
    }

    const banner: PromotionalBanner = {
      ...draft,
      id: editingId ?? createPromotionalBannerId(),
      name: draft.name.trim(),
      alt_text: draft.alt_text.trim(),
      href,
    };
    const current = bannersQuery.data ?? [];
    const banners = editingId
      ? current.map((item) => (item.id === editingId ? banner : item))
      : [banner, ...current];
    saveMutation.mutate(banners);
  };

  const updateBanners = (banners: PromotionalBanner[]) => saveMutation.mutate(banners);
  const banners = bannersQuery.data ?? [];

  if (bannersQuery.isLoading) {
    return <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Loading banners...</div>;
  }
  if (bannersQuery.isError) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">Could not load banners: {bannersQuery.error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Ads & offer banners</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage homepage carousel images, destinations, order and campaign dates.</p>
        </div>
        {!formOpen && (
          <button type="button" onClick={openNew} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy/90">
            <Plus className="h-4 w-4" /> Add banner
          </button>
        )}
      </header>

      {errorMessage && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{errorMessage}</div>}

      {formOpen && (
        <form onSubmit={handleSave} className="grid gap-6 rounded-xl border border-border bg-white p-5 shadow-sm lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-brand-navy">{editingId ? "Edit banner" : "New banner"}</h2>
            <label className="block space-y-1.5 text-sm font-medium text-brand-navy">
              <span>Internal name</span>
              <input className={inputClass} value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} maxLength={120} required />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-medium text-brand-navy">
                <span>Banner type</span>
                <select className={inputClass} value={draft.kind} onChange={(event) => updateDraft("kind", event.target.value as BannerDraft["kind"])}>
                  <option value="ad">Advertisement</option>
                  <option value="offer">Offer</option>
                </select>
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-brand-navy">
                <span>Image layout</span>
                <select className={inputClass} value={draft.format} onChange={(event) => updateDraft("format", event.target.value as BannerDraft["format"])}>
                  <option value="landscape">Landscape banner</option>
                  <option value="flyer">Portrait flyer</option>
                </select>
              </label>
            </div>
            <label className="block space-y-1.5 text-sm font-medium text-brand-navy">
              <span>Image description (alt text)</span>
              <input className={inputClass} value={draft.alt_text} onChange={(event) => updateDraft("alt_text", event.target.value)} maxLength={250} />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-brand-navy">
              <span>Destination link (optional)</span>
              <input className={inputClass} value={draft.href} onChange={(event) => updateDraft("href", event.target.value)} placeholder="/shop or https://example.com" />
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-brand-navy">Banner image</span>
              {draft.image_url && (
                <div className="relative mb-2 overflow-hidden rounded-md border border-border">
                  <img src={draft.image_url} alt={draft.alt_text || draft.name || "Banner preview"} className={`w-full object-cover ${draft.format === "flyer" ? "max-h-96 aspect-4/5" : "aspect-2/1"}`} />
                  <button type="button" onClick={() => updateDraft("image_url", "")} className="absolute right-2 top-2 rounded bg-black/75 px-3 py-1.5 text-xs font-semibold text-white">Remove image</button>
                </div>
              )}
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-slate-300 px-4 py-5 text-sm text-slate-600 hover:bg-slate-50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {uploading ? "Uploading..." : "Choose JPG, PNG or WebP (max 10 MB; landscape min. 1200 x 600 px)"}
                <input type="file" accept={ALLOWED_TYPES.join(",")} className="sr-only" disabled={uploading} onChange={(event) => void uploadImage(event.target.files?.[0])} />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-medium text-brand-navy">
                <span>Show from</span>
                <input type="datetime-local" className={inputClass} value={toLocalInput(draft.starts_at)} onChange={(event) => updateDraft("starts_at", fromLocalInput(event.target.value))} />
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-brand-navy">
                <span>Hide after</span>
                <input type="datetime-local" className={inputClass} value={toLocalInput(draft.ends_at)} onChange={(event) => updateDraft("ends_at", fromLocalInput(event.target.value))} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-brand-navy">
              <input type="checkbox" checked={draft.is_active} onChange={(event) => updateDraft("is_active", event.target.checked)} />
              Active
            </label>
          </div>

          <div className="flex flex-wrap gap-2 lg:col-span-2">
            <button type="submit" disabled={saveMutation.isPending || uploading} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save banner
            </button>
            <button type="button" onClick={() => { setFormOpen(false); setErrorMessage(null); }} className="min-h-10 rounded-md border border-border px-4 py-2 text-sm font-semibold text-brand-navy">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {banners.map((banner, index) => (
          <article key={banner.id} className="flex flex-col gap-4 rounded-xl border border-border bg-white p-4 shadow-sm sm:flex-row sm:items-center">
            <img src={banner.image_url} alt="" className={`w-full shrink-0 rounded-md bg-slate-100 object-cover sm:w-40 ${banner.format === "flyer" ? "aspect-4/5" : "aspect-2/1"}`} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-brand-navy">{banner.name}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize text-slate-700">{banner.kind}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${banner.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{banner.is_active ? "Active" : "Off"}</span>
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">{banner.href || "No destination link"}</p>
              {(banner.starts_at || banner.ends_at) && <p className="mt-1 text-xs text-muted-foreground">{banner.starts_at ? `From ${new Date(banner.starts_at).toLocaleString()}` : "No start date"}{banner.ends_at ? ` · Until ${new Date(banner.ends_at).toLocaleString()}` : ""}</p>}
            </div>
            <div className="flex items-center gap-1">
              <button type="button" title="Move up" aria-label={`Move ${banner.name} up`} disabled={index === 0 || saveMutation.isPending} onClick={() => updateBanners(banners.map((item, i) => i === index - 1 ? banner : i === index ? banners[index - 1] : item))} className="rounded p-2 text-brand-navy hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" title="Move down" aria-label={`Move ${banner.name} down`} disabled={index === banners.length - 1 || saveMutation.isPending} onClick={() => updateBanners(banners.map((item, i) => i === index + 1 ? banner : i === index ? banners[index + 1] : item))} className="rounded p-2 text-brand-navy hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
              <button type="button" onClick={() => openEdit(banner)} className="inline-flex items-center gap-1 rounded px-2 py-2 text-sm font-semibold text-brand-navy hover:bg-slate-100"><Pencil className="h-4 w-4" /> Edit</button>
              <button type="button" disabled={saveMutation.isPending} onClick={() => updateBanners(banners.filter((item) => item.id !== banner.id))} className="rounded p-2 text-red-700 hover:bg-red-50 disabled:opacity-50" aria-label={`Delete ${banner.name}`}><Trash2 className="h-4 w-4" /></button>
            </div>
          </article>
        ))}
        {banners.length === 0 && !formOpen && <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center text-sm text-muted-foreground">No homepage banners yet. Add an ad or offer banner to get started.</div>}
      </div>
    </div>
  );
}
