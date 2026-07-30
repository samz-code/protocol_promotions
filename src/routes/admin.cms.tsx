import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Check, Loader2, Pencil, Plus, Trash2, Code2, Eye } from "lucide-react";
import {
  AdminHeader,
  AdminLoading,
  AdminError,
  AdminEmpty,
  ConfirmDialog,
  ago,
  inputCls,
} from "@/lib/admin-ui";

export const Route = createFileRoute("/admin/cms")({
  head: () => ({ meta: [{ title: "Website CMS | Admin" }] }),
  component: CmsPage,
});

type Block = {
  id: string;
  key: string;
  label: string | null;
  section: string | null;
  value: unknown;
  updated_at: string | null;
};

type NewBlock = {
  key: string;
  label: string;
  section: string;
  type: "text" | "json";
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

async function createBlock(payload: {
  key: string;
  label: string;
  section: string;
  value: unknown;
}) {
  const { error } = await supabase.from("content_blocks").insert([{ ...payload, updated_at: new Date().toISOString() }]);
  if (error) throw error;
}

async function updateBlock(id: string, value: unknown) {
  const { error } = await supabase
    .from("content_blocks")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

async function deleteBlock(id: string) {
  const { error } = await supabase.from("content_blocks").delete().eq("id", id);
  if (error) throw error;
}

function isPlainString(v: unknown): v is string {
  return typeof v === "string";
}

function isObjectValue(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function CmsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "cms"], queryFn: fetchBlocks });

  const [editing, setEditing] = useState<Block | null>(null);
  const [draftValue, setDraftValue] = useState<unknown>("");
  const [draftJson, setDraftJson] = useState<string>("");
  const [showRawJson, setShowRawJson] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newBlock, setNewBlock] = useState<NewBlock>({ key: "", label: "", section: "General", type: "text" });
  const [deleteTarget, setDeleteTarget] = useState<Block | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async (block: Block) => {
      const value = isPlainString(block.value)
        ? draftJson
        : showRawJson
        ? JSON.parse(draftJson)
        : draftValue;
      await updateBlock(block.id, value);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "cms"] });
      setEditing(null);
      setShowRawJson(false);
      setJsonError(null);
    },
    onError: (e) => setJsonError((e as Error).message),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: NewBlock) => {
      const value = payload.type === "text" ? "" : {};
      await createBlock({
        key: payload.key.trim(),
        label: payload.label.trim() || payload.key.trim(),
        section: payload.section.trim() || "General",
        value,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "cms"] });
      setCreating(false);
      setNewBlock({ key: "", label: "", section: "General", type: "text" });
      setCreateError(null);
    },
    onError: (e) => setCreateError((e as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (block: Block) => deleteBlock(block.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "cms"] });
      setDeleteTarget(null);
    },
    onError: (e) => setJsonError((e as Error).message),
  });

  function beginEdit(block: Block) {
    setEditing(block);
    setShowRawJson(false);
    setJsonError(null);
    setDraftValue(isPlainString(block.value) ? block.value : block.value ?? {});
    setDraftJson(isPlainString(block.value) ? block.value : formatJson(block.value));
  }

  const blocks = query.data ?? [];
  const grouped = useMemo(() => {
    return blocks.reduce<Record<string, Block[]>>((acc, block) => {
      const section = block.section || "General";
      (acc[section] ??= []).push(block);
      return acc;
    }, {});
  }, [blocks]);

  if (query.isLoading) return <AdminLoading />;
  if (query.isError) return <AdminError message={(query.error as Error).message} />;

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Website CMS"
        subtitle={`${blocks.length} editable content block${blocks.length === 1 ? "" : "s"}.`}
        action={
          <button
            type="button"
            onClick={() => setCreating((current) => !current)}
            className="inline-flex items-center gap-2 rounded-md border-2 border-brand-navy px-4 py-2 text-xs font-bold uppercase tracking-wide text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
          >
            <Plus className="h-4 w-4" />
            {creating ? "Close" : "New block"}
          </button>
        }
      />

      {createError && <AdminError message={createError} />}

      {creating && (
        <section className="rounded-2xl border-2 border-brand-navy/15 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-brand-navy">Create new content block</h2>
              <p className="mt-1 text-sm text-brand-navy/60">Add a block editors can update without code.</p>
            </div>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-md border-2 border-brand-navy px-3 py-2 text-xs font-bold uppercase tracking-wide text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-brand-navy">
              <span className="font-bold uppercase tracking-wide">Key</span>
              <input
                value={newBlock.key}
                onChange={(e) => setNewBlock((prev) => ({ ...prev, key: e.target.value }))}
                placeholder="home.hero_title"
                className={inputCls}
              />
            </label>
            <label className="space-y-2 text-sm text-brand-navy">
              <span className="font-bold uppercase tracking-wide">Label</span>
              <input
                value={newBlock.label}
                onChange={(e) => setNewBlock((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="Homepage hero title"
                className={inputCls}
              />
            </label>
            <label className="space-y-2 text-sm text-brand-navy">
              <span className="font-bold uppercase tracking-wide">Section</span>
              <input
                value={newBlock.section}
                onChange={(e) => setNewBlock((prev) => ({ ...prev, section: e.target.value }))}
                placeholder="Homepage"
                className={inputCls}
              />
            </label>
            <label className="space-y-2 text-sm text-brand-navy">
              <span className="font-bold uppercase tracking-wide">Type</span>
              <select
                value={newBlock.type}
                onChange={(e) => setNewBlock((prev) => ({ ...prev, type: e.target.value as NewBlock["type"] }))}
                className={inputCls}
              >
                <option value="text">Text</option>
                <option value="json">Structured JSON</option>
              </select>
            </label>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => createMutation.mutate(newBlock)}
              disabled={createMutation.isPending || !newBlock.key.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-brand-navy px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create block
            </button>
          </div>
        </section>
      )}

      {editing ? (
        <section className="space-y-6">
          <AdminHeader
            title="Edit content block"
            subtitle={editing.label ?? editing.key}
            action={
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide border-2 border-brand-navy/20 text-brand-navy hover:border-brand-navy transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => save.mutate(editing)}
                  disabled={save.isPending}
                  className="inline-flex items-center gap-1.5 bg-brand-navy px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save
                </button>
              </div>
            }
          />

          {jsonError && <AdminError message={jsonError} />}

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4 rounded-2xl border-2 border-brand-navy/15 bg-white p-6 shadow-sm">
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-navy/45">Block details</div>
                  <div className="mt-2 text-2xl font-black text-brand-navy">{editing.label || editing.key}</div>
                  <div className="mt-1 text-sm text-brand-navy/60">{editing.key} · {editing.section || "General"}</div>
                  <div className="mt-1 text-[11px] text-brand-navy/45">Updated {ago(editing.updated_at)}</div>
                </div>
                {!isPlainString(editing.value) && (
                  <button
                    type="button"
                    onClick={() => setShowRawJson((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-md border-2 border-brand-navy px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
                  >
                    <Code2 className="h-4 w-4" />
                    {showRawJson ? "Switch to field editor" : "Switch to raw JSON"}
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {isPlainString(editing.value) ? (
                  <label className="block text-sm text-brand-navy">
                    <span className="mb-2 inline-block text-xs font-bold uppercase tracking-wide text-brand-navy/50">Text content</span>
                    <textarea
                      rows={12}
                      className={`${inputCls} min-h-60 font-sans`}
                      value={draftJson}
                      onChange={(e) => setDraftJson(e.target.value)}
                    />
                  </label>
                ) : showRawJson ? (
                  <label className="block text-sm text-brand-navy">
                    <span className="mb-2 inline-block text-xs font-bold uppercase tracking-wide text-brand-navy/50">Raw JSON</span>
                    <textarea
                      rows={18}
                      className={`${inputCls} font-mono`}
                      value={draftJson}
                      onChange={(e) => setDraftJson(e.target.value)}
                    />
                  </label>
                ) : (
                  <FieldEditor value={draftValue} onChange={setDraftValue} />
                )}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border-2 border-brand-navy/15 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.3em] text-brand-navy/45">Guidance</div>
                <p className="mt-3 text-sm leading-relaxed text-brand-navy/70">
                  Use the simple field editor for structured blocks. Switch to raw JSON only when you need to change nested arrays or objects directly.
                </p>
              </div>

              <div className="rounded-2xl border-2 border-brand-orange/20 bg-brand-orange/5 p-4 text-sm text-brand-orange">
                <div className="font-black uppercase tracking-[0.3em]">Non-coder friendly</div>
                <p className="mt-3 leading-relaxed">
                  This CMS lets you update site text and structured content without code. It stores data in blocks that the website renders automatically.
                </p>
              </div>
            </aside>
          </div>
        </section>
      ) : (
        blocks.length === 0 ? (
          <AdminEmpty text="No content blocks defined yet." />
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([section, items]) => (
              <section key={section}>
                <h2 className="border-b-2 border-brand-navy pb-3 text-sm font-black uppercase tracking-widest text-brand-navy">{section}</h2>
                <div className="mt-3 space-y-3">
                  {items.map((block) => (
                    <div key={block.id} className="flex flex-col gap-3 rounded-2xl border-2 border-brand-navy/15 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-black uppercase tracking-wide text-brand-navy">{block.label || block.key}</div>
                        <div className="mt-1 font-mono text-[11px] text-brand-navy/45">{block.key}</div>
                        <div className="mt-1 text-[10px] text-brand-navy/40">Updated {ago(block.updated_at)}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => beginEdit(block)}
                          className="inline-flex items-center gap-2 rounded-md border-2 border-brand-navy px-3 py-2 text-xs font-bold uppercase tracking-wide text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(block)}
                          className="inline-flex items-center gap-2 rounded-md border-2 border-red-200 bg-red-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-red-700 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Delete ${deleteTarget.label || deleteTarget.key}?`}
          body="This action cannot be undone. The block will be removed from the CMS and the site may lose content."
          confirmLabel="Delete block"
          isPending={deleteMutation.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget)}
        />
      )}
    </div>
  );
}

function FieldEditor({
  value,
  onChange,
  parentLabel,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  parentLabel?: string;
}) {
  const [newKey, setNewKey] = useState("");

  if (Array.isArray(value)) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-brand-navy/15 bg-brand-surface px-4 py-3">
          <div>
            <div className="text-sm font-bold uppercase tracking-widest text-brand-navy">{parentLabel || "Array"}</div>
            <p className="text-[11px] text-brand-navy/55">Edit array items one at a time.</p>
          </div>
          <button
            type="button"
            onClick={() => onChange([...value, ""])}
            className="inline-flex items-center gap-2 rounded-md border-2 border-brand-navy px-3 py-2 text-xs font-bold uppercase tracking-wide text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
          >
            <Plus className="h-4 w-4" /> Add item
          </button>
        </div>
        <div className="space-y-3">
          {value.map((item, index) => (
            <div key={index} className="rounded-2xl border border-brand-navy/15 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-brand-navy">Item {index + 1}</div>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  className="rounded-md border-2 border-red-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700 hover:bg-red-50 transition-colors"
                >
                  Remove
                </button>
              </div>
              <FieldEditor
                value={item}
                onChange={(next) => onChange(value.map((item, i) => (i === index ? next : item)))}
                parentLabel={`Item ${index + 1}`}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isObjectValue(value)) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-brand-navy/15 bg-brand-surface px-4 py-3">
          <div>
            <div className="text-sm font-bold uppercase tracking-widest text-brand-navy">{parentLabel || "Fields"}</div>
            <p className="text-[11px] text-brand-navy/55">Edit each field without raw JSON.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="newField"
              className={`${inputCls} max-w-48 text-xs`}
            />
            <button
              type="button"
              onClick={() => {
                const key = newKey.trim() || `field_${Object.keys(value).length + 1}`;
                if (!key || key in value) return;
                onChange({ ...value, [key]: "" });
                setNewKey("");
              }}
              className="inline-flex items-center gap-2 rounded-md border-2 border-brand-navy px-3 py-2 text-xs font-bold uppercase tracking-wide text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
            >
              <Plus className="h-4 w-4" /> Add field
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {Object.entries(value).map(([fieldKey, fieldValue]) => (
            <div key={fieldKey} className="rounded-2xl border border-brand-navy/15 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-brand-navy">{fieldKey}</div>
                  <div className="text-[11px] text-brand-navy/45">{typeof fieldValue}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...value };
                    delete next[fieldKey];
                    onChange(next);
                  }}
                  className="rounded-md border-2 border-red-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700 hover:bg-red-50 transition-colors"
                >
                  Remove
                </button>
              </div>
              <FieldEditor
                value={fieldValue}
                onChange={(next) => onChange({ ...value, [fieldKey]: next })}
                parentLabel={fieldKey}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const setValue = (nextValue: unknown) => onChange(nextValue);

  if (typeof value === "boolean") {
    return (
      <label className="flex items-center gap-3 rounded-2xl border border-brand-navy/15 bg-white px-4 py-3">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => setValue(e.target.checked)}
          className="h-4 w-4 rounded border-brand-navy/20 text-brand-navy focus:ring-brand-navy"
        />
        <span className="text-sm text-brand-navy">{parentLabel || "Toggle"}</span>
      </label>
    );
  }

  if (typeof value === "number") {
    return (
      <label className="space-y-2 rounded-2xl border border-brand-navy/15 bg-white p-4">
        <span className="text-xs uppercase tracking-widest text-brand-navy/45">{parentLabel || "Number"}</span>
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className={inputCls}
        />
      </label>
    );
  }

  return (
    <label className="space-y-2 rounded-2xl border border-brand-navy/15 bg-white p-4">
      <span className="text-xs uppercase tracking-widest text-brand-navy/45">{parentLabel || "Text"}</span>
      <textarea
        rows={4}
        value={value == null ? "" : String(value)}
        onChange={(e) => setValue(e.target.value)}
        className={`${inputCls} font-sans`}
      />
    </label>
  );
}
