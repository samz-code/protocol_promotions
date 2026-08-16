import { useState, useEffect } from "react";
import { X, Send, Sparkles, Check, RefreshCw } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

/* ============================================================
   Interactive Floating WhatsApp Assistant with dynamic step-based 
   inputs, pre-fill option chips, and state preservation.

   Requires once:  npm install react-icons lucide-react

   Usage: render <WhatsAppFloat /> once inside SiteLayout.
   ============================================================ */

const WHATSAPP_NUMBER = "254762446077";
const DEFAULT_MESSAGE =
  "Hello Protocol Promotions, I would like to enquire about your branding and printing services.";

const DRAFT_STORAGE_KEY = "protocol_chat_interactive_draft";

const SERVICES = [
  { id: "branding", name: "Corporate Branding" },
  { id: "printing", name: "Printing Services" },
  { id: "merch", name: "Custom Merchandise" },
  { id: "other", name: "General Enquiry" },
];

const QUANTITIES = ["1 - 50", "50 - 200", "200 - 1,000", "1,000+"];
const TIMELINES = ["Urgent (1-2 days)", "Standard (3-7 days)", "Flexible"];

export function WhatsAppFloat() {
  const [showTip, setShowTip] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Chat window visibility & interactive steps state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Interactive selections state
  const [service, setService] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [timeline, setTimeline] = useState<string>("");
  const [customDetails, setCustomDetails] = useState<string>("");

  // Restore interactive state from localStorage draft on mount
  useEffect(() => {
    const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (rawDraft) {
      try {
        const parsed = JSON.parse(rawDraft);
        if (parsed.service) setService(parsed.service);
        if (parsed.quantity) setQuantity(parsed.quantity);
        if (parsed.timeline) setTimeline(parsed.timeline);
        if (parsed.customDetails) setCustomDetails(parsed.customDetails);
        if (parsed.step) setStep(parsed.step);
      } catch (err) {
        console.error("Failed to parse draft chat state", err);
      }
    }
  }, []);

  // Sync draft state to localStorage
  useEffect(() => {
    const draftState = { service, quantity, timeline, customDetails, step };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftState));
  }, [service, quantity, timeline, customDetails, step]);

  // Tooltip popup timer
  useEffect(() => {
    if (tipDismissed || isChatOpen) return;
    const t = setTimeout(() => setShowTip(true), 3500);
    return () => clearTimeout(t);
  }, [tipDismissed, isChatOpen]);

  // Auto-hide tooltip on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setShowTip(false);
        setTipDismissed(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Periodic button wiggle
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

  const dismissTip = () => {
    setShowTip(false);
    setTipDismissed(true);
  };

  const resetForm = () => {
    setService("");
    setQuantity("");
    setTimeline("");
    setCustomDetails("");
    setStep(1);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    let formattedMsg = "*New Quote Enquiry*\n";
    if (service) formattedMsg += `• *Service:* ${service}\n`;
    if (quantity) formattedMsg += `• *Quantity:* ${quantity}\n`;
    if (timeline) formattedMsg += `• *Timeline:* ${timeline}\n`;
    if (customDetails.trim()) formattedMsg += `• *Note:* ${customDetails.trim()}`;

    if (!service && !customDetails.trim()) {
      formattedMsg = DEFAULT_MESSAGE;
    }

    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      formattedMsg
    )}`;

    resetForm();
    setIsChatOpen(false);

    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <style>{`
        @keyframes waFloatIn {
          0%   { opacity: 0; transform: translateY(14px) scale(0.85); }
          60%  { opacity: 1; transform: translateY(-3px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes waPulseRing {
          0%   { transform: scale(1);   opacity: 0.5; }
          70%  { transform: scale(1.7); opacity: 0; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes waBob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
        @keyframes waWiggle {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(-11deg); }
          30% { transform: rotate(9deg); }
          45% { transform: rotate(-7deg); }
          60% { transform: rotate(5deg); }
          75% { transform: rotate(-3deg); }
        }
        @keyframes waStatusPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(74,222,128,0.6); }
          50%      { transform: scale(1.12); box-shadow: 0 0 0 4px rgba(74,222,128,0); }
        }
        @keyframes waTypingDot {
          0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
          30%           { opacity: 1;    transform: translateY(-2px); }
        }

        .wa-in    { animation: waFloatIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
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
          .wa-in, .wa-ring, .wa-bob, .wa-wiggle,
          .wa-status, .wa-typing span { animation: none !important; }
        }
      `}</style>

      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
        {/* Interactive Multi-step Chat Assistant */}
        {isChatOpen && (
          <div className="wa-in w-80 rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-black/10 sm:w-88">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <FaWhatsapp className="h-6 w-6 text-[#25D366]" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-brand-navy">
                    Protocol Assistant
                  </h4>
                  <p className="text-[11px] text-green-600">
                    Step {step} of 3 • Quick Estimator
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {(service || customDetails) && (
                  <button
                    type="button"
                    onClick={resetForm}
                    title="Reset Form"
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSendMessage} className="mt-3 flex flex-col gap-3">
              {/* Step 1: Select Service */}
              {step === 1 && (
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-1 text-[11px] font-medium text-gray-600">
                    <Sparkles className="h-3 w-3 text-[#25D366]" /> What service are
                    you interested in?
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SERVICES.map((s) => {
                      const selected = service === s.name;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setService(s.name);
                            setStep(2);
                          }}
                          className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-all ${
                            selected
                              ? "bg-[#25D366]/15 font-semibold text-[#1ba14e] ring-1 ring-[#25D366]"
                              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <span>{s.name}</span>
                          {selected && <Check className="h-3.5 w-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: Select Quantity & Timeline */}
              {step === 2 && (
                <div className="flex flex-col gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-gray-600">
                      Estimated Quantity:
                    </label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {QUANTITIES.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setQuantity(q)}
                          className={`rounded-lg px-2 py-1 text-[11px] transition-all ${
                            quantity === q
                              ? "bg-[#25D366] text-white font-medium"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-gray-600">
                      Turnaround urgency:
                    </label>
                    <div className="mt-1 flex flex-col gap-1">
                      {TIMELINES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTimeline(t)}
                          className={`rounded-lg px-2.5 py-1 text-left text-[11px] transition-all ${
                            timeline === t
                              ? "bg-[#25D366]/15 text-[#1ba14e] font-medium ring-1 ring-[#25D366]/40"
                              : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-1/3 rounded-xl border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="w-2/3 rounded-xl bg-brand-navy py-2 text-xs font-semibold text-white transition-all hover:opacity-90"
                    >
                      Next Step
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Notes & Final Send */}
              {step === 3 && (
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-medium text-gray-600">
                    Additional notes or specifications:
                  </label>
                  <textarea
                    rows={2}
                    value={customDetails}
                    onChange={(e) => setCustomDetails(e.target.value)}
                    placeholder="e.g. Color preferences, size, delivery location..."
                    className="w-full resize-none rounded-xl border border-gray-200 p-2.5 text-xs text-brand-navy outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366]"
                  />

                  <div className="rounded-xl bg-gray-50 p-2 text-[11px] text-gray-500">
                    <p className="font-medium text-gray-700">Summary:</p>
                    <p>• Service: {service || "Not specified"}</p>
                    {quantity && <p>• Quantity: {quantity}</p>}
                    {timeline && <p>• Urgency: {timeline}</p>}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="w-1/3 rounded-xl border border-gray-200 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex w-2/3 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#20bd5a] active:scale-98"
                    >
                      <span>Send to WhatsApp</span>
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Floating Tooltip */}
        {showTip && !tipDismissed && !isChatOpen && (
          <div className="wa-in relative max-w-[16rem] rounded-2xl rounded-br-sm bg-white px-4 py-3 shadow-lg ring-1 ring-black/5">
            <button
              type="button"
              onClick={dismissTip}
              className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-brand-navy text-white shadow-md transition-transform duration-200 hover:scale-110 hover:brightness-110 active:scale-95"
              aria-label="Dismiss WhatsApp message"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-brand-navy">
                Interactive Quote Estimator
              </p>
              <span className="wa-typing inline-flex items-center gap-0.5" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-brand-navy/60">
              Get an interactive estimate in 3 simple steps.
            </p>

            <span
              aria-hidden="true"
              className="absolute -bottom-1.5 right-4 h-3 w-3 rotate-45 bg-white ring-1 ring-black/5"
            />
          </div>
        )}

        {/* Floating Button */}
        <button
          type="button"
          onClick={() => {
            dismissTip();
            setIsChatOpen((prev) => !prev);
          }}
          aria-label="Chat with us on WhatsApp"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`group relative grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl active:scale-95 sm:h-16 sm:w-16 ${
            hovered || isChatOpen ? "" : "wa-bob"
          }`}
        >
          <span
            className="wa-ring pointer-events-none absolute inset-0 rounded-full bg-[#25D366]"
            aria-hidden="true"
          />

          <span
            className="wa-status pointer-events-none absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full border-2 border-white bg-green-400 sm:h-4.5 sm:w-4.5"
            aria-hidden="true"
          />

          {isChatOpen ? (
            <X className="relative h-7 w-7 text-white" />
          ) : (
            <FaWhatsapp
              className={`relative h-8 w-8 transition-transform duration-300 group-hover:rotate-6 sm:h-9 sm:w-9 ${
                nudge ? "wa-wiggle" : ""
              }`}
            />
          )}
        </button>
      </div>
    </>
  );
}