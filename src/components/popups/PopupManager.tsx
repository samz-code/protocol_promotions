import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import { CONSENT_EVENT, hasConsent, hasDecided } from '@/lib/consent';
import type { Popup } from './popupTypes';
import { PopupBannerView, PopupModalView } from './PopupViews';

// No popups on these areas (admin, customer dashboard, auth screens, checkout).
const EXCLUDED_PREFIXES = ['/admin', '/dashboard', '/login', '/register', '/forgot-password', '/checkout'];

function scopeMatches(scope: string, pathname: string): boolean {
  const rules = scope
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (rules.length === 0) return true;
  return rules.some((rule) => {
    if (rule === '*' || rule === '/*') return true;
    const clean = rule.replace(/\/\*$/, '').replace(/\/+$/, '') || '/';
    if (clean === '/') return pathname === '/';
    return pathname === clean || pathname.startsWith(`${clean}/`);
  });
}

const storageKey = (p: Popup) => `protocol_popup_${p.id}_${new Date(p.updated_at).getTime()}`;

function isDismissed(p: Popup): boolean {
  try {
    if (p.frequency === 'always') return false;
    const key = storageKey(p);
    if (p.frequency === 'session') return sessionStorage.getItem(key) !== null;
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    if (p.frequency === 'once') return true;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

// Only written when the visitor allowed functional storage in the cookie banner.
function rememberDismissal(p: Popup): void {
  if (p.frequency === 'always' || !hasConsent('functional')) return;
  try {
    const key = storageKey(p);
    if (p.frequency === 'session') sessionStorage.setItem(key, '1');
    else localStorage.setItem(key, String(Date.now()));
  } catch {
    /* storage unavailable */
  }
}

export default function PopupManager() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [consentDone, setConsentDone] = useState(false);
  const [modalReady, setModalReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setLoggedIn(!!data.session);
      })
      .catch(() => {
        if (active) setLoggedIn(false);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setLoggedIn(!!session);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('popups')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });
        if (!active) return;
        if (error) {
          console.warn('popups load failed:', error.code, error.message);
          return;
        }
        setPopups((data ?? []) as Popup[]);
      } catch (err) {
        console.warn('popups load failed:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Read the consent state on the client only, so server and browser render the same first frame.
  useEffect(() => {
    const sync = () => setConsentDone(hasDecided());
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  // Small delay so popups do not jump in the moment a page opens.
  useEffect(() => {
    setModalReady(false);
    const t = window.setTimeout(() => setModalReady(true), 1500);
    return () => window.clearTimeout(t);
  }, [pathname]);

  const eligible = useMemo(() => {
    if (loggedIn === null) return [];
    if (EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return [];
    const now = Date.now();
    return popups.filter((p) => {
      if (!p.is_active || hidden.has(p.id)) return false;
      if (p.starts_at && new Date(p.starts_at).getTime() > now) return false;
      if (p.ends_at && new Date(p.ends_at).getTime() < now) return false;
      if (p.audience === 'guests' && loggedIn) return false;
      if (p.audience === 'customers' && !loggedIn) return false;
      if (!scopeMatches(p.page_scope, pathname)) return false;
      return !isDismissed(p);
    });
  }, [popups, hidden, loggedIn, pathname]);

  const banner = eligible.find((p) => p.placement === 'banner');
  const modal = eligible.find((p) => p.placement === 'modal');

  const dismiss = useCallback((p: Popup) => {
    rememberDismissal(p);
    setHidden((prev) => new Set(prev).add(p.id));
  }, []);

  return (
    <>
      {banner && <PopupBannerView key={banner.id} popup={banner} onDismiss={() => dismiss(banner)} />}
      {modal && consentDone && modalReady && <PopupModalView key={modal.id} popup={modal} onDismiss={() => dismiss(modal)} />}
    </>
  );
}