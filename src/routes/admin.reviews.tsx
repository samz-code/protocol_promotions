import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Star, Check, X, Loader2, Plus, Search, Trash2, MessageSquare,
  ShieldCheck, Clock, TrendingUp,
} from "lucide-react";
import {
  AdminHeader, AdminLoading, AdminError, AdminEmpty, StatusBadge,
  ConfirmDialog, AdminField, inputCls, ago,
} from "@/lib/admin-ui";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({ meta: [{ title: "Reviews | Admin" }] }),
  component: ReviewsPage,
});

type ReviewStatus = "pending" | "approved" | "rejected";

type Review = {
  id: string;
  product_id: string | null;
  author_name: string;
  author_role: string | null;
  rating: number;
  body: string;
  status: ReviewStatus;
  is_verified: boolean;
  source: string;
  created_at: string;
  products: { name: string } | null;
};

type ProductOption = { id: string; name: string };

async function fetchReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, product_id, author_name, author_role, rating, body, status, is_verified, source, created_at, products(name)"
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as unknown as Review[];
}

async function fetchProductOptions(): Promise<ProductOption[]> {
  const { data, error } = await supabase.from("products").select("id, name").order("name");
  if (error) throw error;
  return (data ?? []) as ProductOption[];
}

type Filter = "pending" | "approved" | "rejected" | "all";

function ReviewsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "reviews"], queryFn: fetchReviews });
  const products = useQuery({ queryKey: ["admin", "product-names"], queryFn: fetchProductOptions });

  const [filter, setFilter] = useState<Filter>("pending");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReviewStatus }) => {
      const { error } = await supabase
        .from("reviews")
        .update({ status, moderated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
      qc.invalidateQueries({ queryKey: ["product-reviews"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => setErr(e.message),
  });

  const all = query.data ?? [];

  const stats = useMemo(() => {
    const approved = all.filter((r) => r.status === "approved");
    const avg =
      approved.length > 0
        ? approved.reduce((s, r) => s + r.rating, 0) / approved.length
        : 0;
    return {
      pending: all.filter((r) => r.status === "pending").length,
      approved: approved.length,
      verified: all.filter((r) => r.is_verified).length,
      avg,
    };
  }, [all]);

  const counts = {
    pending: stats.pending,
    approved: stats.approved,
    rejected: all.filter((r) => r.status === "rejected").length,
    all: all.length,
  };

  const rows = useMemo(() => {
    let list = filter === "all" ? all : all.filter((r) => r.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.author_name.toLowerCase().includes(q) ||
          r.body.toLowerCase().includes(q) ||
          (r.products?.name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [all, filter, search]);

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "pending", label: "Awaiting review" },
    { id: "approved", label: "Published" },
    { id: "rejected", label: "Rejected" },
    { id: "all", label: "All" },
  ];

  if (query.isLoading) return <AdminLoading />;
  if (query.isError) return <AdminError message={(query.error as Error).message} />;

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Reviews"
        subtitle="What customers say about your products. Verified buyers publish automatically."
        action={
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-2 bg-brand-navy px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] transition-all hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Add review
          </button>
        }
      />

      {err && <AdminError message={err} />}

      <div className="grid gap-px border border-brand-navy/15 bg-brand-navy/15 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Clock} label="Awaiting review" value={String(stats.pending)} accent={stats.pending > 0} />
        <Stat icon={MessageSquare} label="Published" value={String(stats.approved)} />
        <Stat icon={ShieldCheck} label="Verified buyers" value={String(stats.verified)} />
        <Stat
          icon={TrendingUp}
          label="Average rating"
          value={stats.avg > 0 ? stats.avg.toFixed(1) : "No ratings"}
        />
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search author, product or wording"
            className={`${inputCls} pl-9`}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-navy/40 hover:text-brand-navy"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`shrink-0 border-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                filter === f.id
                  ? "border-brand-navy bg-brand-navy text-white"
                  : "border-brand-navy/15 bg-white text-brand-navy/60 hover:border-brand-navy/40 hover:text-brand-navy"
              }`}
            >
              {f.label}
              <span className={filter === f.id ? "ml-1.5 text-brand-orange" : "ml-1.5 text-brand-navy/35"}>
                {counts[f.id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <AdminEmpty
          text={
            all.length === 0
              ? "No reviews yet. Customers can review a product once they have received it, or you can add ones you already have."
              : filter === "pending"
                ? "Nothing waiting on you."
                : "Nothing matches those filters."
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              busy={setStatus.isPending}
              onApprove={() => setStatus.mutate({ id: r.id, status: "approved" })}
              onReject={() => setStatus.mutate({ id: r.id, status: "rejected" })}
              onDelete={() => setDeleteTarget(r)}
            />
          ))}
        </ul>
      )}

      {formOpen && (
        <ReviewForm
          products={products.data ?? []}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
            setFormOpen(false);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Delete this review?`}
          body={`The review by ${deleteTarget.author_name} will be removed permanently and the product rating recalculated.`}
          confirmLabel="Delete review"
          isPending={del.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => del.mutate(deleteTarget.id)}
        />
      )}
    </div>
  );
}

function Stat({
  icon: Icon, label, value, accent,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${accent ? "text-brand-orange" : "text-brand-navy/35"}`} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-navy/50">
          {label}
        </span>
      </div>
      <div
        className={`mt-1.5 text-xl font-black tabular-nums sm:text-2xl ${
          accent ? "text-brand-orange" : "text-brand-navy"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`${cls} ${
            i < rating ? "fill-brand-orange text-brand-orange" : "text-brand-navy/20"
          }`}
        />
      ))}
    </div>
  );
}

function ReviewCard({
  review: r, busy, onApprove, onReject, onDelete,
}: {
  review: Review;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="border-2 border-brand-navy/12 bg-white">
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-black text-brand-navy">{r.author_name}</span>
              {r.is_verified && (
                <span className="inline-flex items-center gap-1 border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                  <ShieldCheck className="h-3 w-3" /> Verified buyer
                </span>
              )}
              <StatusBadge
                label={r.status}
                tone={r.status === "approved" ? "good" : r.status === "pending" ? "warn" : "neutral"}
              />
              {r.source !== "customer" && (
                <span className="border border-brand-navy/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-navy/50">
                  {r.source}
                </span>
              )}
            </div>
            <div className="mt-1 text-[11px] text-brand-navy/45">
              {r.author_role && <span>{r.author_role} · </span>}
              {r.products?.name ?? "Unlinked product"} · {ago(r.created_at)}
            </div>
          </div>

          <Stars rating={r.rating} />
        </div>

        <p className="mt-3 text-sm leading-relaxed text-brand-navy/75">{r.body}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-brand-navy/10 bg-brand-surface/50 p-3">
        {r.status !== "approved" && (
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 bg-brand-navy px-3 py-2 text-[11px] font-black uppercase tracking-wide text-white transition-all hover:brightness-110 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Publish
          </button>
        )}

        {r.status !== "rejected" && (
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className="inline-flex items-center gap-1.5 border-2 border-brand-navy/20 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-brand-navy transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" /> Hide
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          className="ml-auto grid h-8 w-8 place-items-center border-2 border-transparent text-brand-navy/40 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          title="Delete"
          aria-label="Delete review"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ form */

function ReviewForm({
  products, onClose, onSaved,
}: {
  products: ProductOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [productId, setProductId] = useState("");
  const [author, setAuthor] = useState("");
  const [role, setRole] = useState("");
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [verified, setVerified] = useState(true);
  const [publish, setPublish] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const matches = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 8);
    const q = productSearch.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [products, productSearch]);

  const chosen = products.find((p) => p.id === productId) ?? null;

  const save = useMutation({
    mutationFn: async () => {
      if (!author.trim()) throw new Error("Who wrote this review?");
      if (!body.trim()) throw new Error("Add what they actually said.");

      const { error } = await supabase.from("reviews").insert({
        product_id: productId || null,
        author_name: author.trim(),
        author_role: role.trim() || null,
        rating,
        body: body.trim(),
        status: publish ? "approved" : "pending",
        is_verified: verified,
        source: "imported",
        moderated_at: publish ? new Date().toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: onSaved,
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-brand-navy/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="my-auto flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden border-2 border-brand-navy bg-white shadow-[8px_8px_0_0_var(--color-brand-navy)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b-2 border-brand-navy px-5 py-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-brand-navy">
            Add a review
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center border-2 border-brand-navy/20 text-brand-navy transition-colors hover:border-brand-navy"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-5">
          {err && <AdminError message={err} />}

          <p className="border-l-2 border-brand-orange/40 pl-2.5 text-xs leading-relaxed text-brand-navy/60">
            Use this to bring in reviews you already have, from Google, WhatsApp or email. Customers
            who buy through the site post their own automatically.
          </p>

          {/* Product picker */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-brand-navy">
              Product
            </label>

            {chosen ? (
              <div className="flex items-center justify-between gap-3 border-2 border-brand-navy bg-brand-surface px-3 py-2.5">
                <span className="min-w-0 truncate text-sm font-bold text-brand-navy">
                  {chosen.name}
                </span>
                <button
                  type="button"
                  onClick={() => { setProductId(""); setProductSearch(""); }}
                  className="shrink-0 text-brand-navy/40 hover:text-brand-orange"
                  aria-label="Clear product"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy/40" />
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products"
                    className={`${inputCls} pl-9`}
                  />
                </div>
                {matches.length > 0 && (
                  <ul className="mt-1.5 max-h-40 overflow-y-auto border-2 border-brand-navy/15">
                    {matches.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setProductId(p.id)}
                          className="w-full truncate border-b border-brand-navy/8 px-3 py-2 text-left text-xs font-bold text-brand-navy transition-colors last:border-0 hover:bg-brand-surface"
                        >
                          {p.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-1.5 text-[11px] text-brand-navy/45">
                  Leave empty for a general review about your service.
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <AdminField id="rv-author" label="Name" required>
              <input
                id="rv-author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Lynn Ngina"
                className={inputCls}
              />
            </AdminField>
            <AdminField id="rv-role" label="Role or company" hint="Optional">
              <input
                id="rv-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Operations Manager"
                className={inputCls}
              />
            </AdminField>
          </div>

          {/* Rating picker */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-brand-navy">
              Rating
            </label>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        n <= rating ? "fill-brand-orange text-brand-orange" : "text-brand-navy/20"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-sm font-bold tabular-nums text-brand-navy">{rating}.0</span>
            </div>
          </div>

          <AdminField id="rv-body" label="What they said" required>
            <textarea
              id="rv-body"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Really appreciated the work of the team. Very effective and reliable."
              className={`${inputCls} leading-relaxed`}
            />
          </AdminField>

          <div className="space-y-3 border-t border-brand-navy/10 pt-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand-navy"
              />
              <span>
                <span className="block text-sm font-bold text-brand-navy">
                  Mark as a verified buyer
                </span>
                <span className="mt-0.5 block text-xs text-brand-navy/50">
                  Shows a verified badge. Only tick this if they genuinely bought from you.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand-navy"
              />
              <span>
                <span className="block text-sm font-bold text-brand-navy">Publish immediately</span>
                <span className="mt-0.5 block text-xs text-brand-navy/50">
                  Untick to hold it in the pending queue instead
                </span>
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={() => { setErr(null); save.mutate(); }}
            disabled={save.isPending}
            className="inline-flex w-full items-center justify-center gap-2 bg-brand-navy py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:brightness-110 disabled:opacity-50"
          >
            {save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Add review
          </button>
        </div>
      </div>
    </div>
  );
}