import type { ReactNode } from "react";
import { Loader2, AlertCircle, AlertTriangle } from "lucide-react";

export function kes(n: number) {
  return `KSh ${Number(n).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

export function ago(iso: string | null) {
  if (!iso) return "-";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export const inputCls =
  "w-full border-2 border-brand-navy/20 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-navy transition-colors";

export function AdminHeader({
  title, subtitle, action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-brand-navy pb-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-navy md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-brand-navy/60">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function AdminLoading() {
  return (
    <div className="grid place-items-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-brand-navy" />
    </div>
  );
}

export function AdminError({ message }: { message: string }) {
  return (
    <div className="border-2 border-brand-orange bg-brand-orange/8 p-4 flex items-start gap-2.5">
      <AlertCircle className="h-4 w-4 text-brand-orange shrink-0 mt-0.5" />
      <p className="text-sm font-semibold text-brand-navy break-words">{message}</p>
    </div>
  );
}

export function AdminEmpty({ text }: { text: string }) {
  return (
    <div className="border-2 border-dashed border-brand-navy/20 p-12 text-center">
      <p className="text-sm font-semibold text-brand-navy/55">{text}</p>
    </div>
  );
}

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "good" | "warn" | "solid" }) {
  const cls =
    tone === "solid" ? "bg-brand-navy text-white"
    : tone === "good" ? "bg-brand-navy text-white"
    : tone === "warn" ? "border border-brand-orange text-brand-orange"
    : "border border-brand-navy/25 text-brand-navy/60";
  return <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>{label}</span>;
}

export function StatCard({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="bg-white p-6 border-2 border-brand-navy/10">
      <div className={`text-3xl font-extrabold tabular-nums tracking-tight ${accent ? "text-brand-orange" : "text-brand-navy"}`}>{value}</div>
      <div className="mt-1.5 text-xs font-bold uppercase tracking-wide text-brand-navy/50">{label}</div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Shared form and dialog primitives.

   These previously lived inside admin.categories.tsx, which forced
   other routes to import from a route file. They belong here so any
   admin page can use them without coupling to a route.
   --------------------------------------------------------------- */

export function AdminField({
  id, label, hint, required, children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-brand-navy"
      >
        {label}
        {required && <span className="ml-1 text-brand-orange">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-brand-navy/45">{hint}</p>}
    </div>
  );
}

export function ConfirmDialog({
  title, body, confirmLabel = "Confirm", isPending, onCancel, onConfirm, tone = "danger",
}: {
  title: string;
  body: string;
  confirmLabel?: string;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  tone?: "danger" | "default";
}) {
  const danger = tone === "danger";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-brand-navy/50 p-4 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md border-2 border-brand-navy bg-white shadow-[8px_8px_0_0_var(--color-brand-navy)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 p-6">
          <div
            className={`grid h-11 w-11 shrink-0 place-items-center border-2 ${
              danger ? "border-red-200 bg-red-50" : "border-brand-navy/15 bg-brand-surface"
            }`}
          >
            <AlertTriangle className={`h-5 w-5 ${danger ? "text-red-600" : "text-brand-navy"}`} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black uppercase tracking-wide text-brand-navy">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-navy/70">{body}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t-2 border-brand-navy/10 bg-brand-surface px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-xs font-black uppercase tracking-widest text-brand-navy/60 transition-colors hover:text-brand-navy"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:brightness-110 disabled:opacity-40 ${
              danger ? "bg-red-600" : "bg-brand-navy"
            }`}
          >
            {isPending ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}