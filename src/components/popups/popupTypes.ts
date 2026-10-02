export type Placement = 'banner' | 'modal';
export type DisplayMode = 'text' | 'image' | 'image_text';
export type Variant = 'amber' | 'sky' | 'emerald' | 'rose' | 'indigo' | 'orange';
export type Audience = 'guests' | 'customers' | 'everyone';
export type Frequency = 'always' | 'session' | 'daily' | 'once';

export interface Popup {
  id: string;
  name: string;
  activity_tag: string | null;
  placement: Placement;
  display_mode: DisplayMode;
  variant: Variant;
  title: string | null;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_href: string | null;
  secondary_label: string | null;
  secondary_href: string | null;
  audience: Audience;
  page_scope: string;
  frequency: Frequency;
  priority: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PopupDraft = Omit<Popup, 'id' | 'created_at' | 'updated_at'>;

// Standard flyer size: 16:9 works on phones, tablets, laptops and desktops.
export const FLYER_WIDTH = 1200;
export const FLYER_HEIGHT = 675;

export interface VariantStyle {
  alert: string;
  icon: string;
  badge: string;
  primary: string;
  secondary: string;
  strip: string;
  swatch: string;
}

// Full class names so Tailwind can detect them.
export const VARIANT_STYLES: Record<Variant, VariantStyle> = {
  amber: {
    alert: 'border-amber-400 bg-amber-50 text-amber-900',
    icon: 'text-amber-600',
    badge: 'bg-amber-200 text-amber-900',
    primary: 'bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-600',
    secondary: 'border border-amber-600 text-amber-900 hover:bg-amber-100 focus-visible:ring-amber-600',
    strip: 'bg-amber-500 text-white',
    swatch: 'bg-amber-500',
  },
  sky: {
    alert: 'border-sky-400 bg-sky-50 text-sky-900',
    icon: 'text-sky-600',
    badge: 'bg-sky-200 text-sky-900',
    primary: 'bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-600',
    secondary: 'border border-sky-600 text-sky-900 hover:bg-sky-100 focus-visible:ring-sky-600',
    strip: 'bg-sky-500 text-white',
    swatch: 'bg-sky-500',
  },
  emerald: {
    alert: 'border-emerald-400 bg-emerald-50 text-emerald-900',
    icon: 'text-emerald-600',
    badge: 'bg-emerald-200 text-emerald-900',
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600',
    secondary: 'border border-emerald-600 text-emerald-900 hover:bg-emerald-100 focus-visible:ring-emerald-600',
    strip: 'bg-emerald-500 text-white',
    swatch: 'bg-emerald-500',
  },
  rose: {
    alert: 'border-rose-400 bg-rose-50 text-rose-900',
    icon: 'text-rose-600',
    badge: 'bg-rose-200 text-rose-900',
    primary: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-600',
    secondary: 'border border-rose-600 text-rose-900 hover:bg-rose-100 focus-visible:ring-rose-600',
    strip: 'bg-rose-500 text-white',
    swatch: 'bg-rose-500',
  },
  indigo: {
    alert: 'border-indigo-400 bg-indigo-50 text-indigo-900',
    icon: 'text-indigo-600',
    badge: 'bg-indigo-200 text-indigo-900',
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-600',
    secondary: 'border border-indigo-600 text-indigo-900 hover:bg-indigo-100 focus-visible:ring-indigo-600',
    strip: 'bg-indigo-500 text-white',
    swatch: 'bg-indigo-500',
  },
  orange: {
    alert: 'border-orange-400 bg-orange-50 text-orange-900',
    icon: 'text-orange-600',
    badge: 'bg-orange-200 text-orange-900',
    primary: 'bg-orange-600 text-white hover:bg-orange-700 focus-visible:ring-orange-600',
    secondary: 'border border-orange-600 text-orange-900 hover:bg-orange-100 focus-visible:ring-orange-600',
    strip: 'bg-orange-500 text-white',
    swatch: 'bg-orange-500',
  },
};

export const PLACEMENT_OPTIONS: { value: Placement; label: string }[] = [
  { value: 'banner', label: 'Alert banner (top of page)' },
  { value: 'modal', label: 'Popup (centered)' },
];

export const MODE_OPTIONS: { value: DisplayMode; label: string }[] = [
  { value: 'text', label: 'Text only' },
  { value: 'image', label: 'Flyer only' },
  { value: 'image_text', label: 'Flyer and text' },
];

export const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: 'guests', label: 'Guests (not logged in)' },
  { value: 'customers', label: 'Logged in users' },
  { value: 'everyone', label: 'Everyone' },
];

export const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'always', label: 'Every page load' },
  { value: 'session', label: 'Once per browser session' },
  { value: 'daily', label: 'Once per day' },
  { value: 'once', label: 'Only once' },
];