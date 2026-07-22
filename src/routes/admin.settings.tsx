import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Check, Loader2 } from "lucide-react";
import { AdminHeader, AdminLoading, AdminError, inputCls } from "@/lib/admin-ui";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings | Admin" }] }),
  component: SettingsPage,
});

type Fee = { id?: string; method: string; fee: number; is_active: boolean; sort_order: number };

async function fetchFees(): Promise<Fee[]> {
  const { data, error } = await supabase
    .from("setup_fees")
    .select("id, method, fee, is_active, sort_order")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((f) => ({ ...f, fee: Number(f.fee) }));
}

function SettingsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "setup-fees"], queryFn: fetchFees });
  const [rows, setRows] = useState<Fee[] | null>(null);
  const [saved, setSaved] = useState(false);

  const fees = rows ?? query.data ?? [];

  const save = useMutation({
    mutationFn: async () => {
      // Delete removed, upsert the rest.
      const { data: existing } = await supabase.from("setup_fees").select("id");
      const keptIds = fees.filter((f) => f.id).map((f) => f.id);
      const toDelete = (existing ?? []).map((e) => e.id).filter((id) => !keptIds.includes(id));
      if (toDelete.length > 0) await supabase.from("setup_fees").delete().in("id", toDelete);

      for (let i = 0; i < fees.length; i++) {
        const f = fees[i];
        if (!f.method.trim()) continue;
        const row = { method: f.method.trim(), fee: f.fee, is_active: f.is_active, sort_order: i };
        if (f.id) {
          const { error } = await supabase.from("setup_fees").update(row).eq("id", f.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("setup_fees").insert(row);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "setup-fees"] });
      setRows(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  if (query.isLoading) return <AdminLoading />;
  if (query.isError) return <AdminError message={(query.error as Error).message} />;

  const update = (i: number, patch: Partial<Fee>) =>
    setRows(fees.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const add = () => setRows([...fees, { method: "", fee: 0, is_active: true, sort_order: fees.length }]);
  const remove = (i: number) => setRows(fees.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Settings"
        subtitle="Print-method setup fees applied on the product configurator."
        action={
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="inline-flex items-center gap-1.5 bg-brand-navy px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {saved ? "Saved" : "Save changes"}
          </button>
        }
      />

      {save.isError && <AdminError message={(save.error as Error).message} />}

      <section className="max-w-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-brand-navy/15 pb-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-brand-navy">Setup fees</h2>
          <button type="button" onClick={add} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-brand-navy hover:text-brand-orange transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add method
          </button>
        </div>

        <p className="text-xs text-brand-navy/50">
          Method names must match the print methods on your products for the fee to apply.
        </p>

        {fees.length === 0 ? (
          <p className="py-6 text-sm text-brand-navy/45">No setup fees defined.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_140px_auto_auto] gap-2 text-[10px] font-black uppercase tracking-widest text-brand-navy/50 px-1">
              <span>Method</span><span>Fee (KES)</span><span>Active</span><span />
            </div>
            {fees.map((f, i) => (
              <div key={f.id ?? `new-${i}`} className="grid grid-cols-[1fr_140px_auto_auto] gap-2 items-center">
                <input className={inputCls} value={f.method} onChange={(e) => update(i, { method: e.target.value })} placeholder="Screen Print" />
                <input type="number" className={inputCls} value={f.fee} onChange={(e) => update(i, { fee: Number(e.target.value) })} />
                <label className="grid place-items-center px-2">
                  <input type="checkbox" checked={f.is_active} onChange={(e) => update(i, { is_active: e.target.checked })} className="h-4 w-4 accent-brand-navy" />
                </label>
                <button type="button" onClick={() => remove(i)} className="grid h-9 w-9 place-items-center border border-brand-navy/20 text-brand-navy hover:border-brand-orange hover:text-brand-orange transition-colors" aria-label="Remove">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
