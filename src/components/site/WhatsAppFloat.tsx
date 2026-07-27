import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

/* ============================================================
   Floating WhatsApp button (real WhatsApp logo via react-icons).

   Requires once:  npm install react-icons

   Usage: render <WhatsAppFloat /> once inside SiteLayout.
   ============================================================ */

// Business WhatsApp number, full international format, digits only (no +, spaces or dashes).
const WHATSAPP_NUMBER = "254762446077";

// Message pre-filled when a visitor opens the chat.
const PREFILLED_MESSAGE =
  "Hello Protocol Promotions, I would like to enquire about your branding and printing services.";

export function WhatsAppFloat() {
  const [showTip, setShowTip] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [nudge, setNudge] = useState(false); // periodic attention wiggle
  const [hovered, setHovered] = useState(false);

  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(PREFILLED_MESSAGE)}`;

  // Surface the tooltip after a natural pause, as if someone noticed you.
  useEffect(() => {
    if (tipDismissed) return;
    const t = setTimeout(() => setShowTip(true), 3500);
    return () => clearTimeout(t);
  }, [tipDismissed]);

  // Every so often, give a little wiggle so the button feels alive without
  // being annoying. Skips entirely if the user prefers reduced motion.
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setNudge(true);
      timeoutId = setTimeout(() => setNudge(false), 900);
    }, 8000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, []);

  const dismiss = () => {
    setShowTip(false);
    setTipDismissed(true);
  };

  return (
    <>
      <style>{`
        @keyframes waFloatIn {
          0%   { opacity: 0; transform: translateY(14px) scale(0.85); }
          60%  { opacity: 1; transform: translateY(-3px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes waTipOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(8px) scale(0.92); }
        }
        @keyframes waPulseRing {
          0%   { transform: scale(1);   opacity: 0.5; }
          70%  { transform: scale(1.7); opacity: 0; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        /* Gentle idle bob so the button breathes instead of sitting frozen */
        @keyframes waBob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
        /* Occasional playful wiggle to catch the eye */
        @keyframes waWiggle {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(-11deg); }
          30% { transform: rotate(9deg); }
          45% { transform: rotate(-7deg); }
          60% { transform: rotate(5deg); }
          75% { transform: rotate(-3deg); }
        }
        /* Soft breathing on the status dot */
        @keyframes waStatusPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(74,222,128,0.6); }
          50%      { transform: scale(1.12); box-shadow: 0 0 0 4px rgba(74,222,128,0); }
        }
        /* Typing dots in the tooltip */
        @keyframes waTypingDot {
          0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
          30%           { opacity: 1;    transform: translateY(-2px); }
        }

        .wa-in    { animation: waFloatIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        .wa-out   { animation: waTipOut 0.25s ease-in forwards; }
        .wa-ring  { animation: waPulseRing 2.6s ease-out infinite; }
        .wa-bob   { animation: waBob 3.6s ease-in-out infinite; }
        .wa-wiggle{ animation: waWiggle 0.9s ease-in-out; }
        .wa-status{ animation: waStatusPulse 2.2s ease-in-out infinite; }

        .wa-typing span {
          display: inline-block;
          height: 5px; width: 5px;
          border-radius: 9999px;
          background: #25D366;
          animation: waTypingDot 1.2s ease-in-out infinite;
        }
        .wa-typing span:nth-child(2) { animation-delay: 0.18s; }
        .wa-typing span:nth-child(3) { animation-delay: 0.36s; }

        @media (prefers-reduced-motion: reduce) {
          .wa-in, .wa-out, .wa-ring, .wa-bob, .wa-wiggle,
          .wa-status, .wa-typing span { animation: none !important; }
        }
      `}</style>

      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
        {showTip && !tipDismissed && (
          <div className="wa-in relative max-w-[16rem] rounded-2xl rounded-br-sm bg-white px-4 py-3 shadow-lg ring-1 ring-black/5">
            <button
              type="button"
              onClick={dismiss}
              className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-brand-navy text-white shadow-md transition-transform duration-200 hover:scale-110 hover:brightness-110 active:scale-95"
              aria-label="Dismiss WhatsApp message"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-brand-navy">Need a quick quote?</p>
              <span className="wa-typing inline-flex items-center gap-0.5" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-brand-navy/60">
              Chat with us on WhatsApp and we'll reply fast.
            </p>

            {/* Little tail pointing down toward the button */}
            <span
              aria-hidden="true"
              className="absolute -bottom-1.5 right-4 h-3 w-3 rotate-45 bg-white ring-1 ring-black/5"
            />
          </div>
        )}

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          onClick={dismiss}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`group relative grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl active:scale-95 sm:h-16 sm:w-16 ${
            hovered ? "" : "wa-bob"
          }`}
        >
          {/* Pulsing ring */}
          <span
            className="wa-ring pointer-events-none absolute inset-0 rounded-full bg-[#25D366]"
            aria-hidden="true"
          />

          {/* Online status dot */}
          <span
            className="wa-status pointer-events-none absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full border-2 border-white bg-green-400 sm:h-4.5 sm:w-4.5"
            aria-hidden="true"
          />

          {/* Logo wiggles on the periodic nudge and leans in on hover */}
          <FaWhatsapp
            className={`relative h-8 w-8 transition-transform duration-300 group-hover:rotate-6 sm:h-9 sm:w-9 ${
              nudge ? "wa-wiggle" : ""
            }`}
          />
        </a>
      </div>
    </>
  );
}