import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Upload, Trash2, Loader2, Copy, Check } from "lucide-react";
import { AdminHeader, AdminLoading, AdminError, AdminEmpty, ago } from "@/lib/admin-ui";

export const Route = createFileRoute("/admin/media")({
  head: () => ({ meta: [{ title: "Media | Admin" }] }),
  component: MediaPage,
});

type Media = {
  id: string;
  url: string;
  filename: string | null;
  kind: string | null;
  size_bytes: number | null;
  created_at: string;
};

async function fetchMedia(): Promise<Media[]> {
  const { data, error } = await supabase
    .from("media")
    .select("id, url, filename, kind, size_bytes, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as Media[];
}

function MediaPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "media"], queryFn: fetchMedia });
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `library/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, file);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        await supabase.from("media").insert({
          bucket: "product-images", path, url: data.publicUrl, filename: file.name,
          kind: "image", mime_type: file.type, size_bytes: file.size, folder: "library",
        });
      }
      qc.invalidateQueries({ queryKey: ["admin", "media"] });
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("media").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "media"] }),
  });

  if (query.isLoading) return <AdminLoading />;
  if (query.isError) return <AdminError message={(query.error as Error).message} />;

  const items = query.data ?? [];

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Media"
        subtitle={`${items.length} files in the library.`}
        action={
          <label className="inline-flex items-center gap-1.5 bg-brand-navy px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white hover:brightness-110 transition-all cursor-pointer">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload
            <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => upload(e.target.files)} />
          </label>
        }
      />

      {items.length === 0 ? (
        <AdminEmpty text="No media uploaded yet." />
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((m) => (
            <div key={m.id} className="border-2 border-brand-navy/15 bg-white">
              <div className="aspect-square bg-brand-surface grid place-items-center overflow-hidden">
                <img src={m.url} alt={m.filename ?? ""} className="h-full w-full object-cover" />
              </div>
              <div className="p-2.5 space-y-1.5">
                <div className="truncate text-[11px] font-bold text-brand-navy">{m.filename ?? "untitled"}</div>
                <div className="text-[10px] text-brand-navy/45">{ago(m.created_at)}</div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(m.url); setCopied(m.id); setTimeout(() => setCopied(null), 1500); }}
                    className="flex-1 inline-flex items-center justify-center gap-1 border border-brand-navy/20 py-1.5 text-[10px] font-bold uppercase tracking-wide text-brand-navy hover:border-brand-navy transition-colors"
                  >
                    {copied === m.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied === m.id ? "Copied" : "URL"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (confirm("Remove this file from the library?")) del.mutate(m.id); }}
                    className="grid h-7 w-7 place-items-center border border-brand-navy/20 text-brand-navy hover:border-brand-orange hover:text-brand-orange transition-colors"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
