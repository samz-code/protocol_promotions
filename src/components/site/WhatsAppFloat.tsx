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

  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(PREFILLED_MESSAGE)}`;

  useEffect(() => {
    if (tipDismissed) return;
    const t = setTimeout(() => setShowTip(true), 3500);
    return () => clearTimeout(t);
  }, [tipDismissed]);

  return (
    <>
      <style>{`
        @keyframes waFloatIn {
          from { opacity: 0; transform: translateY(12px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes waPulseRing {
          0%   { transform: scale(1);   opacity: 0.55; }
          70%  { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .wa-in { animation: waFloatIn 0.35s ease-out both; }
        .wa-ring { animation: waPulseRing 2.4s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .wa-in, .wa-ring { animation: none; }
        }
      `}</style>

      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
        {showTip && !tipDismissed && (
          <div className="wa-in relative max-w-[16rem] rounded-2xl rounded-br-sm bg-white px-4 py-3 shadow-lg ring-1 ring-black/5">
            <button
              type="button"
              onClick={() => { setShowTip(false); setTipDismissed(true); }}
              className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-brand-navy text-white shadow-md hover:brightness-110"
              aria-label="Dismiss WhatsApp message"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="text-sm font-semibold text-brand-navy">Need a quick quote?</p>
            <p className="mt-0.5 text-xs text-brand-navy/60 leading-relaxed">
              Chat with us on WhatsApp and we'll reply fast.
            </p>
          </div>
        )}

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          onClick={() => { setShowTip(false); setTipDismissed(true); }}
          className="group relative grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95 sm:h-16 sm:w-16"
        >
          <span className="wa-ring pointer-events-none absolute inset-0 rounded-full bg-[#25D366]" aria-hidden="true" />
          <FaWhatsapp className="relative h-8 w-8 sm:h-9 sm:w-9" />
        </a>
      </div>
    </>
  );
}