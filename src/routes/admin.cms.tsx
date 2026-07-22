import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Check, Loader2, Pencil } from "lucide-react";
import { AdminHeader, AdminLoading, AdminError, AdminEmpty, ago, inputCls } from "@/lib/admin-ui";

export const Route = createFileRoute("/admin/cms")({
  head: () => ({ meta: [{ title: "Website CMS | Admin" }] }),
  component: CmsPage,
});

type Block = {
  id: string;
  key: string;
  label: string | null;
  section: string | null;
  value: unknown; // jsonb: could be a string, or an object of fields
  updated_at: string | null;
};

async function fetchBlocks(): Promise<Block[]> {
  const { data, error } = await supabase
    .from("content_blocks")
    .select("id, key, label, section, value, updated_at")
    .order("section")
    .order("key");
  if (error) throw error;
  return (data ?? []) as Block[];
}

// The value jsonb may be a plain string or an object. We edit it as pretty JSON,
// but if it's just a string we show a simple textarea instead.
function isPlainString(v: unknown): v is string {
  return typeof v === "string";
}

function CmsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "cms"], queryFn: fetchBlocks });
  const [editing, setEditing] = useState<Block | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async (block: Block) => {
      let parsed: unknown;
      if (isPlainString(block.value)) {
        parsed = draft; // store back as a plain string
      } else {
        try {
          parsed = JSON.parse(draft);
        } catch (e) {
          throw new Error(`Invalid JSON: ${(e as Error).message}`);
        }
      }
      const { error } = await supabase
        .from("content_blocks")
        .update({ value: parsed, updated_at: new Date().toISOString() })
        .eq("id", block.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "cms"] });
      setEditing(null);
      setJsonError(null);
    },
    onError: (e) => setJsonError((e as Error).message),
  });

  function beginEdit(b: Block) {
    setEditing(b);
    setJsonError(null);
    setDraft(isPlainString(b.value) ? b.value : JSON.stringify(b.value ?? {}, null, 2));
  }

  if (query.isLoading) return <AdminLoading />;
  if (query.isError) return <AdminError message={(query.error as Error).message} />;

  const blocks = query.data ?? [];

  if (editing) {
    const stringMode = isPlainString(editing.value);
    return (
      <div className="space-y-6">
        <AdminHeader
          title="Edit content block"
          subtitle={editing.label ?? editing.key}
          action={
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide border-2 border-brand-navy/20 text-brand-navy hover:border-brand-navy transition-colors">
                Cancel
              </button>
              <button type="button" onClick={() => save.mutate(editing)} disabled={save.isPending} className="inline-flex items-center gap-1.5 bg-brand-navy px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] hover:brightness-110 disabled:opacity-50 transition-all">
                {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save
              </button>
            </div>
          }
        />
        {jsonError && <AdminError message={jsonError} />}
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-3 text-xs text-brand-navy/50">
            <span className="font-mono">{editing.key}</span>
            {editing.section && <span className="border border-brand-navy/20 px-1.5 py-0.5 font-bold uppercase tracking-wide">{editing.section}</span>}
            <span>{stringMode ? "Text content" : "JSON content"}</span>
          </div>
          <textarea
            rows={16}
            className={`${inputCls} font-mono leading-relaxed`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={!!stringMode}
          />
          {!stringMode && (
            <p className="text-[11px] text-brand-navy/45">
              This block stores structured data. Keep it valid JSON — edit values between the quotes, do not remove braces or commas.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Group by section for a tidy list
  const grouped = blocks.reduce<Record<string, Block[]>>((acc, b) => {
    const s = b.section ?? "General";
    (acc[s] ??= []).push(b);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <AdminHeader title="Website CMS" subtitle={`${blocks.length} editable content blocks.`} />

      {blocks.length === 0 ? (
        <AdminEmpty text="No content blocks defined yet." />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([section, items]) => (
            <section key={section}>
              <h2 className="border-b-2 border-brand-navy pb-3 text-sm font-black uppercase tracking-widest text-brand-navy">{section}</h2>
              <div className="mt-3 space-y-2">
                {items.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-4 border-2 border-brand-navy/15 p-4 hover:border-brand-navy transition-colors">
                    <div className="min-w-0">
                      <div className="text-sm font-black uppercase tracking-wide text-brand-navy">{b.label || b.key}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-brand-navy/45">{b.key}</div>
                      <div className="mt-1 text-[10px] text-brand-navy/40">Updated {ago(b.updated_at)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => beginEdit(b)}
                      className="shrink-0 inline-flex items-center gap-1.5 border-2 border-brand-navy px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}