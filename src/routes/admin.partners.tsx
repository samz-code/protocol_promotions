import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { AdminError, AdminHeader, AdminLoading } from "@/lib/admin-ui";
import { supabase } from "@/lib/supabase";
import {
  fetchTrustedCompanies,
  saveTrustedCompanies,
  type TrustedCompany,
} from "@/lib/trustedCompanies";

export const Route = createFileRoute("/admin/partners")({
  head: () => ({ meta: [{ title: "Partners & trusted companies | Admin" }] }),
  component: PartnersPage,
});

const inputClass =
  "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange";
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 5 * 1024 * 1024;
const bucket = "partner-logos";

function PartnersPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["trusted-companies"],
    queryFn: fetchTrustedCompanies,
  });
  const [name, setName] = useState("");
  const [href, setHref] = useState("");
  const [type, setType] = useState<TrustedCompany["type"]>("trusted");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: saveTrustedCompanies,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trusted-companies"] });
      setName("");
      setHref("");
      setType("trusted");
      setImageUrl("");
      setErrorMessage(null);
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Could not save this company.");
    },
  });

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("Choose a JPG, PNG or WebP logo.");
      return;
    }
    if (file.size > maxFileSize) {
      setErrorMessage("Logo files must be 5 MB or smaller.");
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    try {
      const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const path = `trusted-companies/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
      });
      if (error) throw error;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to upload the logo.");
    } finally {
      setUploading(false);
    }
  };

  const addCompany = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const companyName = name.trim();
    if (!companyName || !imageUrl) {
      setErrorMessage("Enter a company name and upload its logo.");
      return;
    }
    const companies = query.data ?? [];
    saveMutation.mutate([
      ...companies,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: companyName,
        image_url: imageUrl,
        type,
        href: href.trim(),
        is_active: true,
      },
    ]);
  };

  const updateCompanies = (companies: TrustedCompany[]) => saveMutation.mutate(companies);
  const companies = query.data ?? [];

  if (query.isLoading) return <AdminLoading />;
  if (query.isError) return <AdminError message={(query.error as Error).message} />;

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Partners & trusted companies"
        subtitle="Upload logos and choose whether they appear as a partner or trusted company on the homepage."
      />

      {errorMessage && <AdminError message={errorMessage} />}

      <form onSubmit={addCompany} className="grid gap-5 rounded-xl border border-border bg-white p-5 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm font-medium text-brand-navy">
          <span>Company name</span>
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required />
        </label>
        <label className="block space-y-1.5 text-sm font-medium text-brand-navy">
          <span>Display as</span>
          <select className={inputClass} value={type} onChange={(event) => setType(event.target.value as TrustedCompany["type"])}>
            <option value="trusted">Trusted company</option>
            <option value="partner">Partner</option>
          </select>
        </label>
        <label className="block space-y-1.5 text-sm font-medium text-brand-navy sm:col-span-2">
          <span>Website link (optional)</span>
          <input className={inputClass} type="url" value={href} onChange={(event) => setHref(event.target.value)} placeholder="https://example.com" />
        </label>

        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-brand-navy">Logo</span>
          {imageUrl && (
            <div className="mb-3 flex h-24 items-center justify-center rounded-md border border-border bg-slate-50 p-3">
              <img src={imageUrl} alt={`${name || "Company"} logo preview`} className="max-h-full max-w-full object-contain" />
            </div>
          )}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-slate-300 px-4 py-5 text-sm text-slate-600 hover:bg-slate-50">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {uploading ? "Uploading..." : "Upload JPG, PNG or WebP (max 5 MB)"}
            <input
              type="file"
              accept={allowedTypes.join(",")}
              className="sr-only"
              disabled={uploading}
              onChange={(event) => void uploadLogo(event.target.files?.[0])}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={uploading || saveMutation.isPending || !imageUrl}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 sm:justify-self-start"
        >
          {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Add logo
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {companies.map((company) => (
          <article key={company.id} className="flex min-w-0 items-center gap-4 rounded-xl border border-border bg-white p-4">
            <div className="grid h-16 w-24 shrink-0 place-items-center rounded bg-slate-50 p-2">
              <img src={company.image_url} alt={company.name} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-bold text-brand-navy">{company.name}</h2>
              <p className="mt-1 text-xs capitalize text-brand-navy/55">
                {company.type === "trusted" ? "Trusted company" : "Partner"} · {company.is_active ? "Visible" : "Hidden"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={saveMutation.isPending}
                onClick={() =>
                  updateCompanies(companies.map((item) =>
                    item.id === company.id ? { ...item, is_active: !item.is_active } : item
                  ))
                }
                className="rounded border border-border px-2 py-1.5 text-xs font-semibold text-brand-navy hover:bg-brand-surface disabled:opacity-50"
              >
                {company.is_active ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                aria-label={`Remove ${company.name}`}
                title="Remove logo"
                disabled={saveMutation.isPending}
                onClick={() => updateCompanies(companies.filter((item) => item.id !== company.id))}
                className="grid h-8 w-8 place-items-center rounded text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}
        {companies.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
            No partner or trusted-company logos have been added yet.
          </p>
        )}
      </div>
    </div>
  );
}
