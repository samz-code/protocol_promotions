import { supabase } from '@/lib/supabase';

export type ConsentCategory = 'functional' | 'analytics' | 'marketing';

export interface ConsentChoices {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export type ConsentAction = 'accept_all' | 'reject_all' | 'custom';

export interface StoredConsent {
  version: number;
  choices: ConsentChoices;
  action: ConsentAction;
  decidedAt: string;
  expiresAt: string;
}

/** Bump this when the cookie categories or policy change, so visitors are asked again. */
export const CONSENT_VERSION = 1;

export const CONSENT_EVENT = 'protocol:consent-changed';
export const OPEN_SETTINGS_EVENT = 'protocol:open-cookie-settings';

export const ACCEPT_ALL: ConsentChoices = { functional: true, analytics: true, marketing: true };
export const REJECT_ALL: ConsentChoices = { functional: false, analytics: false, marketing: false };

const CONSENT_KEY = 'protocol_consent';
const COOKIE_NAME = 'protocol_cookie_consent';
const VISITOR_KEY = 'protocol_visitor_id';
const CONSENT_DAYS = 180;

// Storage that needs functional consent. Removed when functional is switched off.
const OPTIONAL_PREFIXES = ['protocol_popup_', 'protocol_guest_chat'];

let memoryVisitorId: string | null = null;

function actionFor(choices: ConsentChoices): ConsentAction {
  if (choices.functional && choices.analytics && choices.marketing) return 'accept_all';
  if (!choices.functional && !choices.analytics && !choices.marketing) return 'reject_all';
  return 'custom';
}

function isStoredConsent(value: unknown): value is StoredConsent {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<StoredConsent>;
  const c = v.choices as Partial<ConsentChoices> | undefined;
  return (
    typeof v.version === 'number' &&
    typeof v.decidedAt === 'string' &&
    typeof v.expiresAt === 'string' &&
    (v.action === 'accept_all' || v.action === 'reject_all' || v.action === 'custom') &&
    !!c &&
    typeof c.functional === 'boolean' &&
    typeof c.analytics === 'boolean' &&
    typeof c.marketing === 'boolean'
  );
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(name.length + 1));
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${days * 86400}; Path=/; SameSite=Lax${secure}`;
}

function encodeCookie(c: StoredConsent): string {
  const bit = (b: boolean) => (b ? 1 : 0);
  return `v${c.version}.f${bit(c.choices.functional)}.a${bit(c.choices.analytics)}.m${bit(c.choices.marketing)}`;
}

function parseCookie(raw: string | null): StoredConsent | null {
  if (!raw) return null;
  const m = /^v(\d+)\.f([01])\.a([01])\.m([01])$/.exec(raw);
  if (!m) return null;
  const choices: ConsentChoices = {
    functional: m[2] === '1',
    analytics: m[3] === '1',
    marketing: m[4] === '1',
  };
  const now = new Date();
  return {
    version: Number(m[1]),
    choices,
    action: actionFor(choices),
    decidedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CONSENT_DAYS * 86400000).toISOString(),
  };
}

/** Returns the visitor's saved choice, or null if none, expired, or from an older policy version. */
export function getConsent(): StoredConsent | null {
  if (typeof window === 'undefined') return null;

  let stored: StoredConsent | null = null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isStoredConsent(parsed)) stored = parsed;
    }
  } catch {
    /* storage unavailable or malformed */
  }

  if (!stored) stored = parseCookie(readCookie(COOKIE_NAME));
  if (!stored) return null;
  if (stored.version !== CONSENT_VERSION) return null;
  if (new Date(stored.expiresAt).getTime() <= Date.now()) return null;
  return stored;
}

export function hasDecided(): boolean {
  return getConsent() !== null;
}

export function hasConsent(category: ConsentCategory): boolean {
  return getConsent()?.choices[category] ?? false;
}

/** Random ID that links a browser to its consent records. Not tied to a person. */
export function getVisitorId(): string {
  if (memoryVisitorId) return memoryVisitorId;

  const make = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      try {
        return crypto.randomUUID();
      } catch {
        /* fall through */
      }
    }
    return `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  };

  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing && existing.length >= 8 && existing.length <= 64) {
      memoryVisitorId = existing;
      return existing;
    }
    const created = make();
    window.localStorage.setItem(VISITOR_KEY, created);
    memoryVisitorId = created;
    return created;
  } catch {
    memoryVisitorId = make();
    return memoryVisitorId;
  }
}

function purgeOptionalStorage(): void {
  if (typeof window === 'undefined') return;
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const doomed: string[] = [];
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (key && OPTIONAL_PREFIXES.some((p) => key.startsWith(p))) doomed.push(key);
      }
      doomed.forEach((key) => store.removeItem(key));
    } catch {
      /* storage unavailable */
    }
  }
}

async function recordConsent(record: StoredConsent): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const { error } = await supabase.from('cookie_consents').insert({
      visitor_id: getVisitorId(),
      user_id: data.session?.user.id ?? null,
      action: record.action,
      functional: record.choices.functional,
      analytics: record.choices.analytics,
      marketing: record.choices.marketing,
      policy_version: record.version,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : null,
    });
    if (error) console.warn('Could not record cookie consent:', error.message);
  } catch (err) {
    console.warn('Could not record cookie consent:', err);
  }
}

function announce(record: StoredConsent): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<StoredConsent>(CONSENT_EVENT, { detail: record }));
}

export function saveConsent(choices: ConsentChoices, action: ConsentAction = actionFor(choices)): StoredConsent {
  const now = new Date();
  const record: StoredConsent = {
    version: CONSENT_VERSION,
    choices: { ...choices },
    action,
    decidedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CONSENT_DAYS * 86400000).toISOString(),
  };

  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  } catch {
    /* storage unavailable, the cookie below still remembers the choice */
  }
  writeCookie(COOKIE_NAME, encodeCookie(record), CONSENT_DAYS);

  if (!record.choices.functional) purgeOptionalStorage();

  announce(record);
  void recordConsent(record);
  return record;
}

/** Call once on load when a choice already exists, so listeners can initialise. */
export function applyStoredConsent(): void {
  const stored = getConsent();
  if (!stored) return;
  if (!stored.choices.functional) purgeOptionalStorage();
  announce(stored);
}

/** Opens the cookie settings panel, for example from a footer link. */
export function openCookieSettings(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}