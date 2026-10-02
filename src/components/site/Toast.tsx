import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  text: string;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ToastApi {
  showToast: (type: ToastType, text: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'border-emerald-500 bg-emerald-50 text-emerald-900',
  error: 'border-rose-500 bg-rose-50 text-rose-900',
  info: 'border-sky-500 bg-sky-50 text-sky-900',
};

const TOAST_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const nextId = useRef(1);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const pendingRef = useRef<PendingConfirm | null>(null);
  pendingRef.current = pending;

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, text: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev.slice(-3), { id, type, text }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), TOAST_MS),
      );
    },
    [dismiss],
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // If another confirm is already open, cancel it first.
      pendingRef.current?.resolve(false);
      setPending({ options, resolve });
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    setPending((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((t) => clearTimeout(t));
      activeTimers.clear();
    };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settle(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pending, settle]);

  const value = useMemo<ToastApi>(() => ({ showToast, confirm }), [showToast, confirm]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-120 flex flex-col items-center gap-2 p-4 sm:items-end"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 border p-3 text-sm shadow-lg ${TOAST_STYLES[t.type]}`}
          >
            <p className="min-w-0 flex-1 wrap-break-wordword">{t.text}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss message"
              className="shrink-0 px-1 text-lg leading-none hover:opacity-70"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {pending && (
        <div
          className="fixed inset-0 z-130 flex items-center justify-center bg-slate-900/60 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) settle(false);
          }}
        >
          <div role="alertdialog" aria-modal="true" aria-label={pending.options.title} className="w-full max-w-sm bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">{pending.options.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{pending.options.message}</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => settle(false)}
                className="min-h-11 border border-slate-900 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                {pending.options.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => settle(true)}
                className="min-h-11 bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                {pending.options.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside a ToastProvider');
  }
  return ctx;
}