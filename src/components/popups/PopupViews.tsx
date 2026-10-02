import { useEffect } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { VARIANT_STYLES, type Popup } from './popupTypes';

interface ViewProps {
  popup: Popup;
  onDismiss?: () => void;
  preview?: boolean;
}

const BUTTON_BASE =
  'inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

interface ActionLinkProps {
  href: string;
  className: string;
  preview: boolean;
  onDismiss?: () => void;
  children: ReactNode;
}

// Plain anchors keep query strings and external links working without needing
// every admin-entered path to exist in the typed router.
function ActionLink({ href, className, preview, onDismiss, children }: ActionLinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (preview) {
      e.preventDefault();
      return;
    }
    onDismiss?.();
  };
  const newTab = /^https?:/i.test(href) && !href.startsWith(typeof window !== 'undefined' ? window.location.origin : '\u0000');
  return (
    <a href={href} className={className} onClick={handleClick} {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </a>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function CloseButton({ onClick, className }: { onClick?: () => void; className: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className={`absolute flex h-9 w-9 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ${className}`}
    >
      <CloseIcon className="h-5 w-5" />
    </button>
  );
}

function Actions({ popup, onDismiss, preview = false }: ViewProps) {
  const v = VARIANT_STYLES[popup.variant];
  const hasPrimary = !!popup.cta_label && !!popup.cta_href;
  const hasSecondary = !!popup.secondary_label && !!popup.secondary_href;
  if (!hasPrimary && !hasSecondary) return null;
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      {hasPrimary && (
        <ActionLink href={popup.cta_href as string} className={`${BUTTON_BASE} ${v.primary}`} preview={preview} onDismiss={onDismiss}>
          {popup.cta_label}
        </ActionLink>
      )}
      {hasSecondary && (
        <ActionLink href={popup.secondary_href as string} className={`${BUTTON_BASE} ${v.secondary}`} preview={preview} onDismiss={onDismiss}>
          {popup.secondary_label}
        </ActionLink>
      )}
    </div>
  );
}

export function PopupBannerView({ popup, onDismiss, preview = false }: ViewProps) {
  const v = VARIANT_STYLES[popup.variant];
  const wrapper = preview ? 'relative' : 'pointer-events-none fixed inset-x-0 top-0 z-[60] px-3 pt-3 sm:px-4';

  if (popup.display_mode === 'image' && popup.image_url) {
    const img = <img src={popup.image_url} alt={popup.title || popup.name} width={1200} height={675} className="aspect-video w-full object-cover" />;
    return (
      <div className={wrapper}>
        <div className="pointer-events-auto relative mx-auto w-full max-w-xl bg-white shadow-xl ring-1 ring-black/10">
          {popup.cta_href ? (
            <ActionLink href={popup.cta_href} className="block" preview={preview} onDismiss={onDismiss}>
              {img}
            </ActionLink>
          ) : (
            img
          )}
          <CloseButton onClick={onDismiss} className="right-2 top-2 bg-black/60 text-white hover:bg-black/80" />
        </div>
      </div>
    );
  }

  const showImage = popup.display_mode === 'image_text' && !!popup.image_url;

  return (
    <div className={wrapper}>
      <div role="status" className={`pointer-events-auto relative mx-auto flex w-full max-w-3xl items-start gap-3 border p-4 pr-12 shadow-lg ${v.alert}`}>
        {showImage ? (
          <img src={popup.image_url as string} alt="" width={1200} height={675} className="aspect-video w-20 shrink-0 object-cover sm:w-28" />
        ) : (
          <InfoIcon className={`mt-0.5 h-5 w-5 shrink-0 ${v.icon}`} />
        )}
        <div className="min-w-0 flex-1">
          {popup.activity_tag && <span className={`mb-1 inline-block px-2 py-0.5 text-xs font-semibold ${v.badge}`}>{popup.activity_tag}</span>}
          {popup.title && <p className="text-sm font-semibold sm:text-base">{popup.title}</p>}
          {popup.body && <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed">{popup.body}</p>}
          <Actions popup={popup} onDismiss={onDismiss} preview={preview} />
        </div>
        <CloseButton onClick={onDismiss} className="right-2 top-2 text-current hover:bg-black/10" />
      </div>
    </div>
  );
}

export function PopupModalView({ popup, onDismiss, preview = false }: ViewProps) {
  const v = VARIANT_STYLES[popup.variant];

  useEffect(() => {
    if (preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [preview, onDismiss]);

  const backdrop = preview ? 'relative flex justify-center bg-slate-900/50 p-4' : 'fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4';

  const imageOnly = popup.display_mode === 'image' && !!popup.image_url;
  const showImage = popup.display_mode !== 'text' && !!popup.image_url;
  const label = popup.title || popup.name;

  const flyer = showImage ? (
    <img src={popup.image_url as string} alt={imageOnly ? label : ''} width={1200} height={675} className="aspect-video w-full object-cover" />
  ) : null;

  return (
    <div
      className={backdrop}
      onClick={(e) => {
        if (!preview && e.target === e.currentTarget) onDismiss?.();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={label} className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        {imageOnly ? (
          popup.cta_href ? (
            <ActionLink href={popup.cta_href} className="block" preview={preview} onDismiss={onDismiss}>
              {flyer}
            </ActionLink>
          ) : (
            flyer
          )
        ) : (
          <>
            {flyer ?? (
              <div className={`flex items-center gap-2 px-5 py-3 ${v.strip}`}>
                <InfoIcon className="h-5 w-5" />
                {popup.activity_tag && <span className="text-sm font-semibold">{popup.activity_tag}</span>}
              </div>
            )}
            <div className="p-5 sm:p-6">
              {popup.activity_tag && showImage && <span className={`mb-2 inline-block px-2 py-0.5 text-xs font-semibold ${v.badge}`}>{popup.activity_tag}</span>}
              {popup.title && <h2 className="text-xl font-bold text-slate-900">{popup.title}</h2>}
              {popup.body && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600 sm:text-base">{popup.body}</p>}
              <Actions popup={popup} onDismiss={onDismiss} preview={preview} />
              <button
                type="button"
                onClick={onDismiss}
                className="mt-3 text-xs text-slate-500 underline hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                Maybe later
              </button>
            </div>
          </>
        )}
        <CloseButton onClick={onDismiss} className="right-3 top-3 z-10 bg-black/60 text-white hover:bg-black/80" />
      </div>
    </div>
  );
}