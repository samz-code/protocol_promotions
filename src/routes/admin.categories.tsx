import { useState, type ComponentType } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Loader2, Plus, Pencil, Trash2, X, AlertCircle, GripVertical, Check,
  ChevronDown, Search,
} from "lucide-react";
// The picker renders whichever glyph a category is set to, so the whole
// set has to be available by name rather than imported one by one.
import * as LucideIcons from "lucide-react";

export const Route = createFileRoute("/admin/categories")({
  component: CategoriesPage,
});

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
};

/* Grouped so picking one is quick. Every name here must also exist in the
   CATEGORY_ICONS map in shop.tsx, otherwise the shop falls back to a
   generic box and the choice silently does nothing. */
const ICON_GROUPS: { group: string; icons: string[] }[] = [
  {
    group: "Apparel",
    icons: ["Shirt", "Footprints", "HardHat", "Watch", "Glasses", "Umbrella"],
  },
  {
    group: "Print",
    icons: ["Printer", "FileText", "BookOpen", "Newspaper", "StickyNote", "Files", "Stamp", "Mail"],
  },
  {
    group: "Signage and display",
    icons: ["Megaphone", "Flag", "PanelTop", "Presentation", "Frame", "Tv", "Lightbulb"],
  },
  {
    group: "Drinkware and gifts",
    icons: ["Coffee", "CupSoda", "Wine", "Gift", "Award", "Trophy", "Medal", "Cake"],
  },
  {
    group: "Bags and packaging",
    icons: ["ShoppingBag", "Package", "Box", "Briefcase", "Backpack", "Luggage", "Archive"],
  },
  {
    group: "Tech and office",
    icons: ["MonitorSmartphone", "Laptop", "Headphones", "Keyboard", "Mouse", "BatteryCharging", "Usb", "Calculator"],
  },
  {
    group: "Design and tools",
    icons: ["Palette", "PenTool", "Paintbrush", "Scissors", "Ruler", "Hammer", "Wrench", "Sparkles"],
  },
  {
    group: "Vehicles and outdoor",
    icons: ["Car", "Truck", "Bike", "Tent", "TreePine", "Sun"],
  },
  {
    group: "Business",
    icons: ["Building2", "Store", "Factory", "Users", "Handshake", "BadgeCheck", "Percent", "Tag"],
  },
];

const ICON_OPTIONS = ICON_GROUPS.flatMap((g) => g.icons);

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description, icon, parent_id, sort_order, is_active")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Category[];
}

function CategoriesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({ queryKey: ["admin", "categories"], queryFn: fetchCategories });

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<Category> & { name: string }) => {
      const row = {
        name: payload.name,
        slug: payload.slug || slugify(payload.name),
        description: payload.description || null,
        icon: payload.icon || null,
        parent_id: payload.parent_id || null,
        sort_order: payload.sort_order ?? 0,
        is_active: payload.is_active ?? true,
      };

      if (payload.id) {
        const { error } = await supabase.from("categories").update(row).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      setEditing(null);
      setCreating(false);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      setConfirmDelete(null);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (c: Category) => {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: !c.is_active })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const categories = query.data ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-brand-navy pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-navy md:text-4xl">
            Categories
          </h1>
          <p className="mt-2 text-sm text-brand-navy/60">
            {categories.length} {categories.length === 1 ? "category" : "categories"}. Order controls
            how they appear in the shop and the nav.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setEditing(null);
          }}
          className="inline-flex items-center gap-1.5 bg-brand-navy px-5 py-3 text-xs font-bold uppercase tracking-wide text-white transition-all hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" />
          New category
        </button>
      </header>

      {error && (
        <div className="flex items-start gap-2.5 border border-brand-orange bg-brand-orange/8 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
          <span className="text-sm font-semibold text-brand-navy">{error}</span>
        </div>
      )}

      {(creating || editing) && (
        <CategoryForm
          category={editing}
          categories={categories}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
            setError(null);
          }}
          onSave={(payload) => saveMutation.mutate(payload)}
          isSaving={saveMutation.isPending}
        />
      )}

      {query.isLoading ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-brand-navy" />
        </div>
      ) : categories.length === 0 ? (
        <p className="py-16 text-sm text-brand-navy/45">
          No categories yet. Create one and it becomes available in the shop immediately.
        </p>
      ) : (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-brand-navy/20">
              <th className="w-10 py-4" />
              <th className="w-[22%] py-4 pr-4 text-[11px] font-bold uppercase tracking-widest text-brand-navy/50">
                Name
              </th>
              <th className="w-[18%] px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-brand-navy/50">
                Slug
              </th>
              <th className="w-[28%] px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-brand-navy/50">
                Description
              </th>
              <th className="w-[10%] px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-brand-navy/50">
                Icon
              </th>
              <th className="w-[8%] px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-brand-navy/50">
                Order
              </th>
              <th className="w-[8%] px-4 py-4 text-[11px] font-bold uppercase tracking-widest text-brand-navy/50">
                Live
              </th>
              <th className="w-[10%] py-4 pl-4" />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="group border-b border-brand-navy/10 hover:bg-brand-surface">
                <td className="py-4 align-middle">
                  <GripVertical className="h-4 w-4 text-brand-navy/20" />
                </td>
                <td className="py-4 pr-4 align-middle text-sm font-extrabold text-brand-navy">
                  {c.name}
                </td>
                <td className="px-4 py-4 align-middle font-mono text-xs text-brand-navy/60">
                  {c.slug}
                </td>
                <td className="px-4 py-4 align-middle text-xs leading-relaxed text-brand-navy/60">
                  {c.description ?? <span className="text-brand-navy/30">Not set</span>}
                </td>
                <td className="px-4 py-4 align-middle">
                  {/* The glyph itself reads faster than its name. */}
                  {c.icon ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="grid h-9 w-9 place-items-center border-2 border-brand-navy/15 bg-brand-surface">
                        <CategoryGlyph name={c.icon} />
                      </span>
                      <span className="font-mono text-[11px] text-brand-navy/50">{c.icon}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-brand-navy/30">None</span>
                  )}
                </td>
                <td className="px-4 py-4 align-middle text-sm font-bold tabular-nums text-brand-navy">
                  {c.sort_order}
                </td>
                <td className="px-4 py-4 align-middle">
                  <button
                    type="button"
                    onClick={() => toggleActive.mutate(c)}
                    className={`inline-flex h-5 w-9 items-center border transition-colors ${
                      c.is_active
                        ? "justify-end border-brand-navy bg-brand-navy"
                        : "justify-start border-brand-navy/25 bg-white"
                    }`}
                    aria-label={c.is_active ? "Deactivate" : "Activate"}
                  >
                    <span
                      className={`m-0.5 h-3.5 w-3.5 ${
                        c.is_active ? "bg-brand-orange" : "bg-brand-navy/25"
                      }`}
                    />
                  </button>
                </td>
                <td className="py-4 pl-4 align-middle">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(c);
                        setCreating(false);
                      }}
                      className="grid h-8 w-8 place-items-center text-brand-navy transition-colors hover:text-brand-orange"
                      aria-label={`Edit ${c.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(c)}
                      className="grid h-8 w-8 place-items-center text-brand-navy transition-colors hover:text-brand-orange"
                      aria-label={`Delete ${c.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${confirmDelete.name}?`}
          body="Products in this category will be left uncategorised, not deleted. This cannot be undone."
          confirmLabel="Delete category"
          isPending={deleteMutation.isPending}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteMutation.mutate(confirmDelete.id)}
        />
      )}
    </div>
  );
}

function CategoryForm({
  category, categories, onCancel, onSave, isSaving,
}: {
  category: Category | null;
  categories: Category[];
  onCancel: () => void;
  onSave: (payload: Partial<Category> & { name: string }) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [parentId, setParentId] = useState(category?.parent_id ?? "");
  const [sortOrder, setSortOrder] = useState(category?.sort_order ?? categories.length + 1);
  const [isActive, setIsActive] = useState(category?.is_active ?? true);

  const [slugTouched, setSlugTouched] = useState(Boolean(category));

  function handleNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: category?.id,
      name: name.trim(),
      slug: slug.trim() || slugify(name),
      description: description.trim() || null,
      icon: icon || null,
      parent_id: parentId || null,
      sort_order: sortOrder,
      is_active: isActive,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="border-2 border-brand-navy p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-brand-navy">
          {category ? `Edit ${category.name}` : "New category"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="grid h-8 w-8 place-items-center text-brand-navy/50 hover:text-brand-navy"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <AdminField id="cat-name" label="Name" required>
          <input
            id="cat-name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className={inputCls}
          />
        </AdminField>

        <AdminField id="cat-slug" label="Slug" hint="URL segment">
          <input
            id="cat-slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className={`${inputCls} font-mono`}
          />
        </AdminField>

        <div className="md:col-span-2">
          <AdminField id="cat-desc" label="Description" hint="Optional">
            <textarea
              id="cat-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={inputCls}
            />
          </AdminField>
        </div>

        <IconPicker value={icon} onChange={setIcon} />

        <AdminField id="cat-parent" label="Parent" hint="For subcategories">
          <select
            id="cat-parent"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className={inputCls}
          >
            <option value="">None, top level</option>
            {categories
              .filter((c) => c.id !== category?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </AdminField>

        <AdminField id="cat-order" label="Sort order">
          <input
            id="cat-order"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className={`${inputCls} tabular-nums`}
          />
        </AdminField>

        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 accent-brand-navy"
            />
            <span className="text-sm font-semibold text-brand-navy">Visible on the site</span>
          </label>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="submit"
          disabled={isSaving || !name.trim()}
          className="inline-flex items-center gap-2 bg-brand-navy px-6 py-3 text-xs font-bold uppercase tracking-wide text-white transition-all hover:brightness-110 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {category ? "Save changes" : "Create category"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-brand-navy px-6 py-3 text-xs font-bold uppercase tracking-wide text-brand-navy transition-colors hover:border-brand-orange hover:text-brand-orange"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export const inputCls =
  "w-full border-b-2 border-brand-navy/20 bg-transparent pb-2 text-sm font-medium text-brand-navy outline-none transition-colors focus:border-brand-orange disabled:opacity-50";

export function AdminField({
  id, label, hint, required, children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label
          htmlFor={id}
          className="text-[11px] font-bold uppercase tracking-widest text-brand-navy"
        >
          {label}
          {required && <span className="ml-1 text-brand-orange">*</span>}
        </label>
        {hint && <span className="text-[11px] text-brand-navy/45">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function ConfirmDialog({
  title, body, confirmLabel, isPending, onCancel, onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-brand-navy/50 p-5" onClick={onCancel}>
      <div
        className="w-full max-w-md border-2 border-brand-navy bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-extrabold text-brand-navy">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-brand-navy/70">{body}</p>
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-brand-orange px-6 py-3 text-xs font-bold uppercase tracking-wide text-white transition-all hover:brightness-95 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="border border-brand-navy px-6 py-3 text-xs font-bold uppercase tracking-wide text-brand-navy transition-colors hover:border-brand-orange hover:text-brand-orange"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Sixty six names in a dropdown is worse than twelve. This shows the
 * actual glyphs, grouped and searchable, so the choice takes a second.
 */
function IconPicker({
  value, onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const groups = query.trim()
    ? [
        {
          group: "Matches",
          icons: ICON_OPTIONS.filter((n) =>
            n.toLowerCase().includes(query.trim().toLowerCase())
          ),
        },
      ]
    : ICON_GROUPS;

  const Selected = value
    ? ((LucideIcons as Record<string, unknown>)[value] as
        | ComponentType<{ className?: string; strokeWidth?: number }>
        | undefined)
    : null;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-[11px] font-bold uppercase tracking-widest text-brand-navy">
          Icon
        </label>
        <span className="text-[11px] text-brand-navy/45">
          Shown on the shop and in the nav
        </span>
      </div>

      {/* Current selection, click to change */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 border-2 border-brand-navy/20 bg-white px-3 py-2.5 text-left transition-colors hover:border-brand-navy"
      >
        <span className="flex items-center gap-2.5">
          <span className="grid h-11 w-11 place-items-center border-2 border-brand-navy/15 bg-brand-surface">
            {Selected ? (
              <Selected className="h-6 w-6 text-brand-navy" strokeWidth={2.25} />
            ) : (
              <span className="text-[10px] font-bold text-brand-navy/35">None</span>
            )}
          </span>
          <span className="text-sm font-medium text-brand-navy">
            {value || "Choose an icon"}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-brand-navy/40 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-2 border-2 border-brand-navy/15 bg-white p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons"
              className={`${inputCls} pl-9`}
            />
          </div>

          <div className="mt-3 max-h-80 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className={`mb-3 w-full border-2 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide transition-colors ${
                value === ""
                  ? "border-brand-navy bg-brand-navy text-white"
                  : "border-brand-navy/15 text-brand-navy/60 hover:border-brand-navy/40"
              }`}
            >
              No icon
            </button>

            {groups.map((g) => {
              if (g.icons.length === 0) return null;
              return (
                <div key={g.group} className="mb-4 last:mb-0">
                  <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-brand-navy/40">
                    {g.group}
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {g.icons.map((name) => {
                      const Icon = (LucideIcons as Record<string, unknown>)[name] as
                        | ComponentType<{ className?: string; strokeWidth?: number }>
                        | undefined;
                      if (!Icon) return null;
                      const active = value === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          title={name}
                          onClick={() => { onChange(name); setOpen(false); }}
                          className={`grid aspect-square place-items-center border-2 transition-all ${
                            active
                              ? "border-brand-navy bg-brand-navy text-white shadow-[2px_2px_0_0_var(--color-brand-orange)]"
                              : "border-brand-navy/15 text-brand-navy hover:border-brand-navy hover:bg-brand-surface"
                          }`}
                        >
                          <Icon className="h-6 w-6" strokeWidth={2.25} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {groups.every((g) => g.icons.length === 0) && (
              <p className="py-6 text-center text-xs text-brand-navy/45">
                Nothing matches that search.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Resolves a lucide name to its glyph. Used in the list so you can see
 *  at a glance what each category is set to. */
function CategoryGlyph({ name }: { name: string }) {
  const Icon = (LucideIcons as Record<string, unknown>)[name] as
    | ComponentType<{ className?: string; strokeWidth?: number }>
    | undefined;

  if (!Icon) {
    return <span className="text-[9px] font-bold text-brand-navy/30">?</span>;
  }

  return <Icon className="h-5 w-5 text-brand-navy" strokeWidth={2.25} />;
}