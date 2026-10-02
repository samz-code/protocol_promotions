import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, ReactNode } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/site/Toast';
import {
  AUDIENCE_OPTIONS,
  FLYER_HEIGHT,
  FLYER_WIDTH,
  FREQUENCY_OPTIONS,
  MODE_OPTIONS,
  PLACEMENT_OPTIONS,
  VARIANT_STYLES,
  type Popup,
  type PopupDraft,
  type Variant,
} from '@/components/popups/popupTypes';
import { PopupBannerView, PopupModalView } from '@/components/popups/PopupViews';

export const Route = createFileRoute('/admin/popups')({
  head: () => ({
    meta: [{ title: 'Popups and banners | Admin' }, { name: 'robots', content: 'noindex' }],
  }),
  component: AdminPopupsPage,
});

const BUCKET = 'popup-images';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

const EMPTY_DRAFT: PopupDraft = {
  name: '',
  activity_tag: '',
  placement: 'banner',
  display_mode: 'text',
  variant: 'amber',
  title: '',
  body: '',
  image_url: null,
  cta_label: '',
  cta_href: '',
  secondary_label: '',
  secondary_href: '',
  audience: 'guests',
  page_scope: '*',
  frequency: 'session',
  priority: 0,
  is_active: true,
  starts_at: null,
  ends_at: null,
};

const inputCls =
  'block w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900';

const nullIfEmpty = (v: string | null | undefined): string | null => {
  const t = (v ?? '').trim();
  return t === '' ? null : t;
};

// Internal paths must be a single leading slash. "//host" is rejected as it would leave the site.
const isValidHref = (v: string) => /^(\/($|[^/])|https?:\/\/|mailto:|tel:)/i.test(v);

const pad = (n: number) => String(n).padStart(2, '0');

const toLocalInput = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromLocalInput = (v: string): string | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const errMsg = (err: unknown): string => {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return 'Something went wrong. Please try again.';
};

function liveState(p: Popup): { label: string; cls: string } {
  const now = Date.now();
  if (!p.is_active) return { label: 'Off', cls: 'bg-slate-200 text-slate-700' };
  if (p.starts_at && new Date(p.starts_at).getTime() > now) return { label: 'Scheduled', cls: 'bg-sky-100 text-sky-800' };
  if (p.ends_at && new Date(p.ends_at).getTime() < now) return { label: 'Expired', cls: 'bg-rose-100 text-rose-800' };
  return { label: 'Live', cls: 'bg-emerald-100 text-emerald-800' };
}

function validate(d: PopupDraft): string | null {
  if (!d.name.trim()) return 'Give the popup an internal name.';
  const needsText = d.display_mode !== 'image';
  const needsImage = d.display_mode !== 'text';
  if (needsText && !nullIfEmpty(d.title) && !nullIfEmpty(d.body)) return 'Add a title or message text.';
  if (needsImage && !d.image_url) return 'Upload a flyer image, or switch to Text only.';
  const pairs: [string, string | null, string | null][] = [
    ['Main button', d.cta_label, d.cta_href],
    ['Second button', d.secondary_label, d.secondary_href],
  ];
  for (const [label, text, href] of pairs) {
    const t = nullIfEmpty(text);
    const h = nullIfEmpty(href);
    if ((t && !h) || (!t && h && d.display_mode !== 'image')) return `${label} needs both a label and a link.`;
    if (h && !isValidHref(h)) return `${label} link must start with /, https://, mailto: or tel:.`;
  }
  if (d.starts_at && d.ends_at && new Date(d.ends_at).getTime() <= new Date(d.starts_at).getTime()) {
    return 'The end time must be after the start time.';
  }
  return null;
}

async function toFlyerBlob(file: File, fit: 'cover' | 'contain'): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Could not read that image. Try a different file.'));
      i.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = FLYER_WIDTH;
    canvas.height = FLYER_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser cannot process images.');
    const scale =
      fit === 'cover'
        ? Math.max(FLYER_WIDTH / img.width, FLYER_HEIGHT / img.height)
        : Math.min(FLYER_WIDTH / img.width, FLYER_HEIGHT / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, FLYER_WIDTH, FLYER_HEIGHT);
    ctx.drawImage(img, (FLYER_WIDTH - w) / 2, (FLYER_HEIGHT - h) / 2, w, h);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image export failed.'))), 'image/webp', 0.9),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-800">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-10 border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
            value === o.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ImageDropzone({
  value,
  onChange,
  onError,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  onError: (msg: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fit, setFit] = useState<'cover' | 'contain'>('cover');

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (!ALLOWED_TYPES.includes(file.type)) {
        onError('Please upload a JPG, PNG or WebP image.');
        return;
      }
      if (file.size > MAX_SOURCE_BYTES) {
        onError('That image is larger than 10 MB. Please compress it and try again.');
        return;
      }
      setBusy(true);
      try {
        const blob = await toFlyerBlob(file, fit);
        const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
        const path = `flyers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
          contentType: blob.type,
          cacheControl: '31536000',
        });
        if (error) throw error;
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        onChange(data.publicUrl);
      } catch (err) {
        onError(errMsg(err));
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [fit, onChange, onError],
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    void handleFile(e.dataTransfer.files?.[0]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div className="space-y-2">
      {value && (
        <div className="relative">
          <img src={value} alt="Flyer preview" width={FLYER_WIDTH} height={FLYER_HEIGHT} className="aspect-video w-full border border-slate-300 object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 bg-black/70 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Remove
          </button>
        </div>
      )}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload flyer image"
        onClick={() => inputRef.current?.click()}
        onKeyDown={onKeyDown}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center border-2 border-dashed px-4 py-6 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
          dragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
        }`}
      >
        <p className="text-sm font-medium text-slate-800">
          {busy ? 'Uploading...' : value ? 'Drop a new flyer here, or click to replace' : 'Drag and drop a flyer here, or click to upload'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          JPG, PNG or WebP, up to 10 MB. Auto-resized to {FLYER_WIDTH} x {FLYER_HEIGHT} (16:9). Keep key text in the center.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => void handleFile(e.target.files?.[0])}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={fit === 'contain'} onChange={(e) => setFit(e.target.checked ? 'contain' : 'cover')} />
        Fit the whole flyer (adds white margins instead of cropping). Applies to the next upload.
      </label>
    </div>
  );
}

/** Only admins reach the editor. Row level security still enforces this on the database. */
function AdminPopupsPage() {
  const [authorised, setAuthorised] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data, error } = await supabase.rpc('is_admin');
        if (active) setAuthorised(!error && data === true);
      } catch {
        if (active) setAuthorised(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (authorised === null) {
    return <p className="p-6 text-sm text-slate-500">Checking access...</p>;
  }

  if (!authorised) {
    return (
      <div className="p-6">
        <div className="max-w-md border border-rose-400 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-semibold">Admin access required</p>
          <p className="mt-1">Sign in with an admin account to manage popups and banners.</p>
        </div>
      </div>
    );
  }

  return <AdminPopups />;
}

function AdminPopups() {
  const { showToast, confirm } = useToast();

  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PopupDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const showError = useCallback((text: string) => showToast('error', text), [showToast]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase.from('popups').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setPopups((data ?? []) as Popup[]);
    } catch (err) {
      setLoadError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = <K extends keyof PopupDraft>(key: K, value: PopupDraft[K]) => setDraft((prev) => ({ ...prev, [key]: value }));

  const openForm = (next: PopupDraft, id: string | null) => {
    setDraft(next);
    setEditingId(id);
    setFormOpen(true);
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const openNew = () => openForm(EMPTY_DRAFT, null);

  const openEdit = (p: Popup) => {
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = p;
    void _id;
    void _c;
    void _u;
    openForm(rest, p.id);
  };

  const duplicate = (p: Popup) => {
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = p;
    void _id;
    void _c;
    void _u;
    openForm({ ...rest, name: `${p.name} (copy)`, is_active: false }, null);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validate(draft);
    if (problem) {
      showError(problem);
      return;
    }
    setSaving(true);
    const payload = {
      name: draft.name.trim(),
      activity_tag: nullIfEmpty(draft.activity_tag),
      placement: draft.placement,
      display_mode: draft.display_mode,
      variant: draft.variant,
      title: nullIfEmpty(draft.title),
      body: nullIfEmpty(draft.body),
      image_url: draft.display_mode === 'text' ? null : draft.image_url,
      cta_label: nullIfEmpty(draft.cta_label),
      cta_href: nullIfEmpty(draft.cta_href),
      secondary_label: nullIfEmpty(draft.secondary_label),
      secondary_href: nullIfEmpty(draft.secondary_href),
      audience: draft.audience,
      page_scope: draft.page_scope.trim() || '*',
      frequency: draft.frequency,
      priority: Number.isFinite(draft.priority) ? Math.trunc(draft.priority) : 0,
      is_active: draft.is_active,
      starts_at: draft.starts_at,
      ends_at: draft.ends_at,
    };
    try {
      const { error } = editingId
        ? await supabase.from('popups').update(payload).eq('id', editingId)
        : await supabase.from('popups').insert(payload);
      if (error) throw error;
      showToast('success', editingId ? 'Popup updated.' : 'Popup created.');
      closeForm();
      await load();
    } catch (err) {
      showError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Popup) => {
    const { error } = await supabase.from('popups').update({ is_active: !p.is_active }).eq('id', p.id);
    if (error) {
      showError(error.message);
      return;
    }
    setPopups((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: !x.is_active } : x)));
    showToast('success', p.is_active ? 'Popup turned off.' : 'Popup turned on.');
  };

  const remove = async (p: Popup) => {
    const ok = await confirm({
      title: 'Delete popup',
      message: `Delete "${p.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Keep it',
    });
    if (!ok) return;
    const { error } = await supabase.from('popups').delete().eq('id', p.id);
    if (error) {
      showError(error.message);
      return;
    }
    setPopups((prev) => prev.filter((x) => x.id !== p.id));
    showToast('success', 'Popup deleted.');
  };

  const previewPopup: Popup = { ...draft, id: 'preview', created_at: '', updated_at: '' };
  const needsImage = draft.display_mode !== 'text';
  const needsText = draft.display_mode !== 'image';
  const previewBlocked = needsImage && !draft.image_url;

  return (
    <div className="min-w-0 space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Popups and banners</h1>
          <p className="text-sm text-slate-600">Alerts and flyers shown to visitors, targeted by page, audience and dates.</p>
        </div>
        {!formOpen && (
          <button type="button" onClick={openNew} className="min-h-11 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            New popup
          </button>
        )}
      </div>

      {formOpen && (
        <div ref={formRef} className="border border-slate-300 bg-white">
          <form onSubmit={handleSave} className="grid gap-6 p-4 sm:p-6 lg:grid-cols-2">
            <div className="min-w-0 space-y-5">
              <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit popup' : 'New popup'}</h2>

              <Field label="Internal name" hint="Only you see this, for example Corporate gifting season flyer.">
                <input className={inputCls} value={draft.name} onChange={(e) => setField('name', e.target.value)} maxLength={120} />
              </Field>

              <Field label="Activity label (optional)" hint="Small badge on the popup, for example Festive season orders.">
                <input className={inputCls} value={draft.activity_tag ?? ''} onChange={(e) => setField('activity_tag', e.target.value)} maxLength={40} />
              </Field>

              <div>
                <span className="mb-1 block text-sm font-medium text-slate-800">Style</span>
                <Segmented label="Placement" value={draft.placement} options={PLACEMENT_OPTIONS} onChange={(v) => setField('placement', v)} />
              </div>

              <div>
                <span className="mb-1 block text-sm font-medium text-slate-800">Content</span>
                <Segmented label="Content type" value={draft.display_mode} options={MODE_OPTIONS} onChange={(v) => setField('display_mode', v)} />
              </div>

              {needsImage && (
                <div>
                  <span className="mb-1 block text-sm font-medium text-slate-800">Flyer</span>
                  <ImageDropzone value={draft.image_url} onChange={(url) => setField('image_url', url)} onError={showError} />
                </div>
              )}

              {needsText && (
                <>
                  <Field label="Title">
                    <input className={inputCls} value={draft.title ?? ''} onChange={(e) => setField('title', e.target.value)} maxLength={120} />
                  </Field>
                  <Field label="Message">
                    <textarea className={inputCls} rows={4} value={draft.body ?? ''} onChange={(e) => setField('body', e.target.value)} maxLength={500} />
                  </Field>
                </>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Main button label">
                  <input className={inputCls} value={draft.cta_label ?? ''} onChange={(e) => setField('cta_label', e.target.value)} maxLength={40} />
                </Field>
                <Field label="Main button link" hint="/register or https://...">
                  <input className={inputCls} value={draft.cta_href ?? ''} onChange={(e) => setField('cta_href', e.target.value)} />
                </Field>
                {needsText && (
                  <>
                    <Field label="Second button label">
                      <input className={inputCls} value={draft.secondary_label ?? ''} onChange={(e) => setField('secondary_label', e.target.value)} maxLength={40} />
                    </Field>
                    <Field label="Second button link">
                      <input className={inputCls} value={draft.secondary_href ?? ''} onChange={(e) => setField('secondary_href', e.target.value)} />
                    </Field>
                  </>
                )}
              </div>
              {!needsText && <p className="text-xs text-slate-500">For a flyer only popup, the main button link makes the whole flyer clickable.</p>}

              <div>
                <span className="mb-2 block text-sm font-medium text-slate-800">Color</span>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(VARIANT_STYLES) as Variant[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-label={`${k} color`}
                      aria-pressed={draft.variant === k}
                      onClick={() => setField('variant', k)}
                      className={`h-9 w-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${VARIANT_STYLES[k].swatch} ${
                        draft.variant === k ? 'ring-2 ring-slate-900 ring-offset-2' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-200 pt-5">
                <h3 className="text-sm font-semibold text-slate-900">Who sees it, where and when</h3>
                <Field label="Audience">
                  <select className={inputCls} value={draft.audience} onChange={(e) => setField('audience', e.target.value as PopupDraft['audience'])}>
                    {AUDIENCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Pages"
                  hint="* for all pages, or comma separated paths like /shop,/services. A path also covers its sub pages, so /shop includes /shop/branded-mug. Use / for the home page only. Popups never show on /admin, /dashboard, /login, /register, /forgot-password or /checkout."
                >
                  <input className={inputCls} value={draft.page_scope} onChange={(e) => setField('page_scope', e.target.value)} maxLength={500} />
                </Field>
                <Field label="How often">
                  <select className={inputCls} value={draft.frequency} onChange={(e) => setField('frequency', e.target.value as PopupDraft['frequency'])}>
                    {FREQUENCY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Starts (optional)">
                    <input type="datetime-local" className={inputCls} value={toLocalInput(draft.starts_at)} onChange={(e) => setField('starts_at', fromLocalInput(e.target.value))} />
                  </Field>
                  <Field label="Ends (optional)">
                    <input type="datetime-local" className={inputCls} value={toLocalInput(draft.ends_at)} onChange={(e) => setField('ends_at', fromLocalInput(e.target.value))} />
                  </Field>
                </div>
                <Field label="Priority" hint="Higher numbers win when several popups match the same page.">
                  <input
                    type="number"
                    className={inputCls}
                    value={draft.priority}
                    onChange={(e) => setField('priority', e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input type="checkbox" checked={draft.is_active} onChange={(e) => setField('is_active', e.target.checked)} />
                  Active
                </label>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="submit" disabled={saving} className="min-h-11 bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
                  {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create popup'}
                </button>
                <button type="button" onClick={closeForm} className="min-h-11 border border-slate-900 bg-white px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                  Cancel
                </button>
              </div>
            </div>

            <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Live preview</h3>
              <div className="border border-dashed border-slate-300 bg-slate-100 p-3">
                {previewBlocked ? (
                  <p className="p-6 text-center text-sm text-slate-500">Upload a flyer to see the preview.</p>
                ) : draft.placement === 'banner' ? (
                  <PopupBannerView popup={previewPopup} preview />
                ) : (
                  <PopupModalView popup={previewPopup} preview />
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                The preview shows the layout. Always check the real site on a phone as well. Flyers are exported at {FLYER_WIDTH} x {FLYER_HEIGHT}.
              </p>
            </div>
          </form>
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Loading...</p>}
      {loadError && (
        <div className="border border-rose-400 bg-rose-50 p-3 text-sm text-rose-900">
          Could not load popups: {loadError}{' '}
          <button type="button" onClick={() => void load()} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}
      {!loading && !loadError && popups.length === 0 && <p className="text-sm text-slate-500">No popups yet. Create your first one above.</p>}

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {popups.map((p) => {
          const state = liveState(p);
          return (
            <li key={p.id} className="flex min-w-0 flex-col border border-slate-300 bg-white">
              {p.image_url ? (
                <img src={p.image_url} alt="" width={FLYER_WIDTH} height={FLYER_HEIGHT} loading="lazy" className="aspect-video w-full object-cover" />
              ) : (
                <div className={`flex aspect-video items-center justify-center px-4 text-center text-sm font-semibold ${VARIANT_STYLES[p.variant].alert}`}>
                  {p.title || p.name}
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-semibold ${state.cls}`}>{state.label}</span>
                  <span className="bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{p.placement === 'banner' ? 'Alert banner' : 'Popup'}</span>
                  <span className="bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{AUDIENCE_OPTIONS.find((o) => o.value === p.audience)?.label}</span>
                </div>
                <p className="wrap-break-word text-sm font-semibold text-slate-900">{p.name}</p>
                {p.activity_tag && <p className="text-xs text-slate-500">Activity: {p.activity_tag}</p>}
                <p className="wrap-break-word text-xs text-slate-500">Pages: {p.page_scope}</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <button type="button" onClick={() => openEdit(p)} className="min-h-9 border border-slate-900 px-3 text-xs font-semibold text-slate-900 hover:bg-slate-100">
                    Edit
                  </button>
                  <button type="button" onClick={() => duplicate(p)} className="min-h-9 border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Duplicate
                  </button>
                  <button type="button" onClick={() => void toggleActive(p)} className="min-h-9 border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    {p.is_active ? 'Turn off' : 'Turn on'}
                  </button>
                  <button type="button" onClick={() => void remove(p)} className="min-h-9 border border-rose-400 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                    Delete
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}