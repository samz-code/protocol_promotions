import { useState, useEffect, useRef } from "react";
import logoImg from "@/assets/logo.png";

/* ================================================================
   Preloader
   Branded splash shown on first paint of the homepage. Holds for a
   minimum beat so the logo actually registers, then waits for the
   window load event before dismissing.

   Safety rules baked in:
   - Hard ceiling (MAX_MS) so a stalled image can never trap a visitor
   - Skips entirely for prefers-reduced-motion and for repeat visits
     within the same tab session
   - Restores body scroll on every exit path, including unmount
   ================================================================ */

const MIN_MS = 1500; // minimum time the splash stays up
const MAX_MS = 4000; // absolute ceiling, dismiss no matter what
const FADE_MS = 600; // fade-out duration
const LINE_MS = 1800; // how long each welcome line holds

const SESSION_KEY = "pp_seen_preloader";

const LINES = [
  "Setting up the press",
  "Mixing the ink",
  "Warming the heat press",
  "Ready when you are",
];

/**
 * Returns true while the splash should be covering the page.
 * Decided synchronously on first render so nothing behind it ever
 * paints first.
 */
export function shouldSplash(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem(SESSION_KEY) === "1") return false;
  } catch {
    // Private mode or blocked storage. Showing it is the safe default.
  }
  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return false;
  }
  return true;
}

export function Preloader({ onDone }: { onDone?: () => void } = {}) {
  // Decide synchronously on first render so the splash never flashes
  // for someone who should not see it at all.
  const [active, setActive] = useState(shouldSplash);

  const [leaving, setLeaving] = useState(false);
  const [line, setLine] = useState(0);
  const timers = useRef<number[]>([]);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // Rotate the welcome copy while the splash is up.
  useEffect(() => {
    if (!active || leaving) return;
    const id = window.setInterval(() => {
      setLine((i) => (i + 1) % LINES.length);
    }, LINE_MS);
    return () => window.clearInterval(id);
  }, [active, leaving]);

  // Dismiss logic.
  useEffect(() => {
    if (!active) return;

    const mountedAt = Date.now();
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;

      try {
        window.sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Not critical. Worst case the splash shows again next navigation.
      }

      setLeaving(true);
      timers.current.push(
        window.setTimeout(() => {
          setActive(false);
          onDoneRef.current?.();
        }, FADE_MS)
      );
    };

    // Hold for the minimum beat, then go as soon as the window is loaded.
    const release = () => {
      const elapsed = Date.now() - mountedAt;
      const wait = Math.max(0, MIN_MS - elapsed);
      timers.current.push(window.setTimeout(finish, wait));
    };

    if (document.readyState === "complete") {
      release();
    } else {
      window.addEventListener("load", release, { once: true });
    }

    // Ceiling. Nothing gets to hold the page hostage.
    timers.current.push(window.setTimeout(finish, MAX_MS));

    // Lock scroll while the splash covers the page.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const captured = timers.current;
    return () => {
      window.removeEventListener("load", release);
      for (const t of captured) window.clearTimeout(t);
      captured.length = 0;
      document.body.style.overflow = prevOverflow;
    };
  }, [active]);

  // If the splash was skipped outright, release the page immediately.
  useEffect(() => {
    if (!active) onDoneRef.current?.();
  }, [active]);

  // Belt and braces: if this component ever unmounts mid-splash,
  // make certain scrolling is not left disabled.
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Protocol Promotions"
      className={`pp-preloader ${leaving ? "pp-preloader-out" : ""}`}
    >
      <style>{`
        .pp-preloader {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2rem;
          background: #ffffff;
          background-image: radial-gradient(var(--color-brand-navy) 1.15px, transparent 1.15px);
          background-size: 28px 28px;
          transition: opacity ${FADE_MS}ms ease, visibility ${FADE_MS}ms ease;
        }
        .pp-preloader::before {
          content: "";
          position: absolute;
          inset: 0;
          background: #ffffff;
          -webkit-mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, transparent 20%, #000 70%);
          mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, transparent 20%, #000 70%);
          pointer-events: none;
        }
        .pp-preloader-out {
          opacity: 0;
          visibility: hidden;
        }

        .pp-pre-stage {
          position: relative;
          display: grid;
          place-items: center;
          width: 148px;
          height: 148px;
        }
        .pp-pre-ring,
        .pp-pre-ring-2 {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          border: 2px solid transparent;
        }
        .pp-pre-ring {
          border-top-color: var(--color-brand-orange);
          border-right-color: var(--color-brand-orange);
          animation: ppPreSpin 1.1s linear infinite;
        }
        .pp-pre-ring-2 {
          inset: 12px;
          border-bottom-color: var(--color-brand-navy);
          border-left-color: var(--color-brand-navy);
          opacity: 0.35;
          animation: ppPreSpin 1.7s linear infinite reverse;
        }
        .pp-pre-logo {
          position: relative;
          width: 84px;
          height: auto;
          object-fit: contain;
          animation: ppPreBreathe 2.4s ease-in-out infinite;
        }

        .pp-pre-copy {
          position: relative;
          text-align: center;
          padding: 0 1.5rem;
        }
        .pp-pre-title {
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3em;
          color: var(--color-brand-orange);
        }
        .pp-pre-line {
          margin-top: 0.85rem;
          min-height: 1.75rem;
          font-size: 1.0625rem;
          font-weight: 800;
          letter-spacing: -0.01em;
          color: var(--color-brand-navy);
          animation: ppPreFade 0.5s ease both;
        }
        .pp-pre-sub {
          margin-top: 0.4rem;
          font-size: 0.8125rem;
          line-height: 1.6;
          color: color-mix(in srgb, var(--color-brand-navy) 60%, transparent);
        }

        .pp-pre-bar {
          position: relative;
          width: 180px;
          height: 2px;
          overflow: hidden;
          background: color-mix(in srgb, var(--color-brand-navy) 12%, transparent);
        }
        .pp-pre-bar span {
          position: absolute;
          inset: 0;
          display: block;
          background: var(--color-brand-orange);
          transform-origin: left;
          animation: ppPreBar ${MAX_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes ppPreSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes ppPreBreathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.06); }
        }
        @keyframes ppPreFade {
          from { opacity: 0; transform: translate3d(0, 8px, 0); }
          to   { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes ppPreBar {
          0%   { transform: scaleX(0); }
          65%  { transform: scaleX(0.75); }
          100% { transform: scaleX(1); }
        }

        @media (max-width: 480px) {
          .pp-pre-stage { width: 124px; height: 124px; }
          .pp-pre-logo { width: 70px; }
          .pp-pre-line { font-size: 0.9375rem; }
        }

        @media (prefers-reduced-motion: reduce) {
          .pp-pre-ring,
          .pp-pre-ring-2,
          .pp-pre-logo,
          .pp-pre-line,
          .pp-pre-bar span { animation: none !important; }
          .pp-pre-bar span { transform: scaleX(1); }
        }
      `}</style>

      <div className="pp-pre-stage">
        <span className="pp-pre-ring" aria-hidden="true" />
        <span className="pp-pre-ring-2" aria-hidden="true" />
        <img
          src={logoImg}
          alt="Protocol Promotions"
          className="pp-pre-logo"
          width={168}
          height={168}
        />
      </div>

      <div className="pp-pre-copy">
        <p className="pp-pre-title">Protocol Promotions</p>
        <p key={line} className="pp-pre-line">
          {LINES[line]}
        </p>
        <p className="pp-pre-sub">
          Premium printing and merchandise, made real in Nairobi.
        </p>
      </div>

      <div className="pp-pre-bar" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}