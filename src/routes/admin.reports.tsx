import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { Download, Loader2, FileBarChart } from "lucide-react";
import { AdminHeader, AdminError } from "@/lib/admin-ui";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Reports | Admin" }] }),
  component: ReportsPage,
});

// Turns an array of flat records into a CSV string, escaping quotes/commas.
function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(","));
  return lines.join("\n");
}

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type ReportDef = {
  key: string;
  title: string;
  description: string;
  run: () => Promise<Record<string, unknown>[]>;
};

const REPORTS: ReportDef[] = [
  {
    key: "orders",
    title: "Orders",
    description: "Every order with customer, total and status.",
    run: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("order_number, customer_name, total, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  },
  {
    key: "payments",
    title: "Payments",
    description: "All payments with method, status and amount.",
    run: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("amount, method, status, paid_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  },
  {
    key: "customers",
    title: "Customers",
    description: "Registered accounts with contact details.",
    run: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, phone, company, role, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  },
  {
    key: "inventory",
    title: "Inventory",
    description: "Every variant with SKU and current stock.",
    run: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("sku, color, size, stock_qty, low_stock_at, is_active")
        .order("stock_qty", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
  },
];

function ReportsPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runReport = async (def: ReportDef) => {
    setBusy(def.key);
    setError(null);
    try {
      const rows = await def.run();
      if (rows.length === 0) {
        setError(`No data available for the ${def.title} report.`);
        return;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      download(`${def.key}-${stamp}.csv`, toCsv(rows));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      <AdminHeader title="Reports" subtitle="Export your data as CSV for spreadsheets or accounting." />
      {error && <AdminError message={error} />}

      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <div key={r.key} className="border-2 border-brand-navy/15 p-5 flex flex-col justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileBarChart className="h-5 w-5 text-brand-orange shrink-0 mt-0.5 stroke-3" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-brand-navy">{r.title}</h3>
                <p className="mt-1 text-xs text-brand-navy/60 leading-relaxed">{r.description}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => runReport(r)}
              disabled={busy === r.key}
              className="inline-flex items-center justify-center gap-1.5 bg-brand-navy px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] hover:brightness-110 disabled:opacity-50 transition-all self-start"
            >
              {busy === r.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export CSV
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
