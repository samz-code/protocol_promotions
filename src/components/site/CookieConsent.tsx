import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/site/Toast';
import {
  ACCEPT_ALL,
  REJECT_ALL,
  OPEN_SETTINGS_EVENT,
  applyStoredConsent,
  getConsent,
  saveConsent,
  type ConsentAction,
  type ConsentChoices,
} from '@/lib/consent';

type OptionalCategory = 'functional' | 'analytics' | 'marketing';

const CATEGORIES: { id: 'necessary' | OptionalCategory; label: string; description: string; examples: string }[] = [
  {
    id: 'necessary',
    label: 'Strictly necessary',
    description:
      'Keep the site secure and working: signing in to your account, keeping your cart, remembering your cookie choice and protecting forms from abuse. These cannot be switched off.',
    examples: 'Login session, cart contents, cookie choice record, security tokens.',
  },
  {
    id: 'functional',
    label: 'Functional',
    description: 'Remember your preferences so the site feels familiar when you come back.',
    examples: 'Announcements you have closed, your chat history on this device when you are not signed in.',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description:
      'Help us understand which pages and products are used, so we can improve the site. Only loaded if you agree.',
    examples: 'Page views, visit duration, where checkout or quote steps are abandoned.',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description:
      'Let us and our advertising partners measure campaigns and show you relevant Protocol Promotions offers on other sites and social platforms. Only loaded if you agree.',
    examples: 'Advertising and social media pixels, campaign attribution.',
  },
];

const STORAGE_ROWS = [
  { name: 'sb-…-auth-token', purpose: 'Keeps you signed in to your account', category: 'Necessary', duration: 'Until you log out' },
  { name: 'protocol_consent, protocol_cookie_consent', purpose: 'Remembers your cookie choice', category: 'Necessary', duration: '180 days' },
  { name: 'protocol_visitor_id', purpose: 'Random ID that links your choice to our consent record', category: 'Necessary', duration: 'Until you clear site data' },
  { name: 'protocol_cart_v1', purpose: 'Keeps the items in your cart', category: 'Necessary', duration: 'Until you clear site data' },
  { name: 'protocol_popup_*', purpose: 'Remembers announcements you have closed', category: 'Functional', duration: 'Session, 1 day or until cleared' },
  { name: 'protocol_guest_chat', purpose: 'Keeps your chat on this device when you are not signed in', category: 'Functional', duration: 'Until you clear site data' },
];

function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
        checked ? 'bg-emerald-600' : 'bg-slate-300'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <span className={`inline-block h-5 w-5 bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

const BTN = 'min-h-[44px] px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2';
const BTN_PRIMARY = `${BTN} bg-brand-navy text-white hover:bg-brand-orange`;
const BTN_OUTLINE = `${BTN} border border-brand-navy bg-white text-brand-navy hover:bg-slate-100`;

export default function CookieConsent() {
  const { showToast } = useToast();
  const [bannerOpen, setBannerOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState<ConsentChoices>(REJECT_ALL);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const openPanel = useCallback(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setDraft(getConsent()?.choices ?? REJECT_ALL);
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    returnFocusRef.current?.focus?.();
  }, []);

  useEffect(() => {
    if (getConsent()) applyStoredConsent();
    else setBannerOpen(true);
    const onOpen = () => openPanel();
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen);
  }, [openPanel]);

  useEffect(() => {
    if (!panelOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [panelOpen, closePanel]);

  const commit = (choices: ConsentChoices, action: ConsentAction) => {
    saveConsent(choices, action);
    setBannerOpen(false);
    setPanelOpen(false);
    showToast('success', 'Your cookie preferences have been saved.');
  };

  const saveDraft = () => {
    const all = draft.functional && draft.analytics && draft.marketing;
    const none = !draft.functional && !draft.analytics && !draft.marketing;
    commit(draft, all ? 'accept_all' : none ? 'reject_all' : 'custom');
  };

  const setCategory = (id: OptionalCategory, value: boolean) => setDraft((d) => ({ ...d, [id]: value }));

  if (!bannerOpen && !panelOpen) return null;

  return (
    <>
      {bannerOpen && !panelOpen && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-slate-900/60 p-4">
          <section
            aria-label="Cookie consent"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-consent-title"
            className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto border border-slate-300 bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="min-w-0 flex-1">
              <h2 id="cookie-consent-title" className="text-base font-semibold text-slate-900">We value your privacy</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                We use cookies and similar technologies to keep the site secure and remember your preferences. Only if you agree, we also use them to
                understand how the site is used and to measure our marketing. When you register, order or request a quote, we collect personal details
                such as your name, email, phone number, delivery address and artwork, and we handle them in line with the Kenya Data Protection Act,
                2019. Choose what you are comfortable with. You can change your mind at any time from Cookie settings. Read our{' '}
                <a href="/policies" className="font-medium text-slate-900 underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <button type="button" onClick={() => commit(REJECT_ALL, 'reject_all')} className={BTN_OUTLINE}>
                Reject non-essential
              </button>
              <button type="button" onClick={openPanel} className={BTN_OUTLINE}>
                Customize
              </button>
              <button type="button" onClick={() => commit(ACCEPT_ALL, 'accept_all')} className={BTN_PRIMARY}>
                Accept all
              </button>
            </div>
          </section>
        </div>
      )}

      {panelOpen && (
        <div
          className="fixed inset-0 z-90 flex items-end justify-center bg-slate-900/60 sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closePanel();
          }}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-panel-title"
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl focus:outline-none"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 id="cookie-panel-title" className="text-lg font-bold text-slate-900">
                  Cookie and privacy settings
                </h2>
                <p className="mt-1 text-sm text-slate-600">Choose which optional cookies we may use. Rejecting is as easy as accepting.</p>
              </div>
              <button
                type="button"
                onClick={closePanel}
                aria-label="Close cookie settings"
                className="flex h-9 w-9 shrink-0 items-center justify-center text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <div className="border border-sky-300 bg-sky-50 p-4 text-sm text-sky-900">
                <p className="font-semibold">Personal information we collect</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Account details: name, email address, phone number and password (stored securely).</li>
                  <li>Order and quote details: items, quantities, deadlines, artwork you upload, delivery address and payment status.</li>
                  <li>Messages you send us through forms, chat or WhatsApp.</li>
                  <li>Technical data: device, browser and pages visited (analytics only if you agree).</li>
                </ul>
                <p className="mt-3 font-semibold">How we use it</p>
                <p className="mt-1">
                  To create your account, prepare quotes and proofs, produce and deliver your order, contact you about it, improve our service and meet
                  legal obligations.
                </p>
                <p className="mt-3 font-semibold">Your rights</p>
                <p className="mt-1">
                  You may ask to access, correct or delete your data, object to certain uses, and withdraw consent at any time through Cookie settings. You
                  may also complain to the Office of the Data Protection Commissioner in Kenya. Details are in our{' '}
                  <a href="/policies" onClick={closePanel} className="font-medium underline">
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>

              <ul className="divide-y divide-slate-200 border border-slate-200">
                {CATEGORIES.map((cat) => {
                  const locked = cat.id === 'necessary';
                  const checked = locked ? true : draft[cat.id as OptionalCategory];
                  return (
                    <li key={cat.id} className="flex items-start justify-between gap-4 p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {cat.label}
                          {locked && <span className="ml-2 bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">Always on</span>}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">{cat.description}</p>
                        <p className="mt-1 text-xs text-slate-500">Examples: {cat.examples}</p>
                      </div>
                      <Switch
                        checked={checked}
                        disabled={locked}
                        label={`${cat.label} cookies`}
                        onChange={(v) => setCategory(cat.id as OptionalCategory, v)}
                      />
                    </li>
                  );
                })}
              </ul>

              <details className="border border-slate-200">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900">
                  View storage details
                </summary>
                <div className="overflow-x-auto px-4 pb-4">
                  <table className="w-full min-w-130 text-left text-xs text-slate-700">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 pr-3 font-medium">Name</th>
                        <th className="py-2 pr-3 font-medium">Purpose</th>
                        <th className="py-2 pr-3 font-medium">Category</th>
                        <th className="py-2 font-medium">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {STORAGE_ROWS.map((row) => (
                        <tr key={row.name} className="border-b border-slate-100 align-top">
                          <td className="py-2 pr-3 font-mono">{row.name}</td>
                          <td className="py-2 pr-3">{row.purpose}</td>
                          <td className="py-2 pr-3">{row.category}</td>
                          <td className="py-2">{row.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-3 text-xs text-slate-500">
                    Analytics and marketing tools set their own cookies only after you allow them, and only if they are enabled on the site.
                  </p>
                </div>
              </details>
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 p-4 sm:flex-row sm:justify-end" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <button type="button" onClick={() => commit(REJECT_ALL, 'reject_all')} className={BTN_OUTLINE}>
                Reject non-essential
              </button>
              <button type="button" onClick={saveDraft} className={BTN_OUTLINE}>
                Save my choices
              </button>
              <button type="button" onClick={() => commit(ACCEPT_ALL, 'accept_all')} className={BTN_PRIMARY}>
                Accept all
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}