import { useEffect, useState } from "react";
import { X, Send, Sparkles, Check, RefreshCw } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

const WHATSAPP_NUMBER = "254762446077";

const STORAGE_KEY = "protocol_promotion_quote_draft_v2";

type Step = 1 | 2 | 3;

type FormData = {
  service: string;
  quantity: string;
  timeline: string;
  artwork: string;
  details: string;
};

const SERVICES = [
  "Branding & Identity",
  "Printing Services",
  "Signage & Large Format",
  "Product & Packaging",
  "Promotional Merchandise",
  "Graphic Design",
  "General Enquiry",
];

const QUANTITIES = [
  "1 - 50",
  "50 - 200",
  "200 - 1,000",
  "1,000+",
  "Not sure",
];

const TIMELINES = [
  "Urgent - confirm availability",
  "Standard",
  "Flexible",
];

const ARTWORK_OPTIONS = [
  "I have print-ready artwork",
  "I need design assistance",
  "Not sure",
];

const DEFAULT_MESSAGE =
  "Hello Protocol Promotion, I would like to enquire about your printing, branding or graphic design services.";

export function WhatsAppFloat() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [hovered, setHovered] = useState(false);
  const [nudge, setNudge] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    service: "",
    quantity: "",
    timeline: "",
    artwork: "",
    details: "",
  });

  /* Load saved enquiry */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) return;

      const parsed = JSON.parse(saved);

      if (parsed?.formData) {
        setFormData((current) => ({
          ...current,
          ...parsed.formData,
        }));
      }

      if (
        parsed?.step === 1 ||
        parsed?.step === 2 ||
        parsed?.step === 3
      ) {
        setStep(parsed.step);
      }
    } catch {
      // Ignore invalid localStorage data
    }
  }, []);

  /* Save enquiry */
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          step,
          formData,
        })
      );
    } catch {
      // Ignore localStorage errors
    }
  }, [step, formData]);

  /* Hide the small notification after a few seconds */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNudge(false);
    }, 7000);

    return () => window.clearTimeout(timer);
  }, []);

  const updateField = (
    field: keyof FormData,
    value: string
  ) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      service: "",
      quantity: "",
      timeline: "",
      artwork: "",
      details: "",
    });

    setStep(1);

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }
  };

  const openWhatsApp = (message: string) => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      message
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleQuickWhatsApp = () => {
    openWhatsApp(DEFAULT_MESSAGE);
  };

  const handleSendEnquiry = () => {
    const message = [
      "*NEW QUOTE ENQUIRY - PROTOCOL PROMOTION*",
      "",
      `*Service:* ${formData.service || "Not specified"}`,
      `*Quantity:* ${formData.quantity || "Not specified"}`,
      `*Timeline:* ${formData.timeline || "Not specified"}`,
      `*Artwork:* ${formData.artwork || "Not specified"}`,
      "",
      "*Project Details:*",
      formData.details.trim() || "Not provided",
      "",
      "Please confirm pricing, availability and production timeline.",
    ].join("\n");

    openWhatsApp(message);

    resetForm();
    setIsChatOpen(false);
  };

  const canContinueFromStep1 = Boolean(formData.service);

  const goNext = () => {
    if (step === 1 && !canContinueFromStep1) return;

    if (step < 3) {
      setStep((current) => (current + 1) as Step);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep((current) => (current - 1) as Step);
    }
  };

  return (
    <>
      <style>{`
        @keyframes waFloatIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes waPulseRing {
          0% {
            transform: scale(1);
            opacity: 0.55;
          }
          70% {
            transform: scale(1.35);
            opacity: 0;
          }
          100% {
            transform: scale(1.35);
            opacity: 0;
          }
        }

        @keyframes waBob {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        @keyframes waWiggle {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-5deg);
          }
          75% {
            transform: rotate(5deg);
          }
        }

        @keyframes waStatusPulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.45;
          }
        }

        .wa-float-in {
          animation: waFloatIn 0.3s ease-out both;
        }

        .wa-pulse-ring {
          animation: waPulseRing 2s ease-out infinite;
        }

        .wa-bob {
          animation: waBob 2.8s ease-in-out infinite;
        }

        .wa-wiggle {
          animation: waWiggle 0.45s ease-in-out;
        }

        .wa-status-pulse {
          animation: waStatusPulse 2s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .wa-float-in,
          .wa-pulse-ring,
          .wa-bob,
          .wa-wiggle,
          .wa-status-pulse {
            animation: none !important;
          }
        }
      `}</style>

      {/* Assistant panel */}
      {isChatOpen && (
        <div
          className="
            fixed
            bottom-24
            right-4
            z-9998
            w-[calc(100vw-2rem)]
            max-w-sm
            overflow-hidden
            rounded-2xl
            border
            border-slate-200
            bg-white
            shadow-2xl
            wa-float-in
            sm:right-6
            sm:bottom-28
          "
        >
          {/* Header */}
          <div className="bg-brand-navy px-4 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Protocol Assistant
                  </p>

                  <p className="mt-0.5 text-xs text-white/70">
                    Get your printing & branding enquiry ready
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="
                  rounded-full
                  p-1.5
                  text-white/70
                  transition
                  hover:bg-white/10
                  hover:text-white
                "
                aria-label="Close assistant"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Progress */}
            <div className="mt-4 flex items-center gap-2">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className={`h-1.5 flex-1 rounded-full transition ${
                    item <= step
                      ? "bg-white"
                      : "bg-white/20"
                  }`}
                />
              ))}
            </div>

            <p className="mt-2 text-[11px] text-white/60">
              Step {step} of 3
            </p>
          </div>

          {/* Body */}
          <div className="max-h-[65vh] overflow-y-auto p-4">
            {/* STEP 1 */}
            {step === 1 && (
              <div>
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-slate-900">
                    What do you need?
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Select the service that best describes your project.
                  </p>
                </div>

                <div className="space-y-2">
                  {SERVICES.map((service) => {
                    const selected =
                      formData.service === service;

                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() =>
                          updateField("service", service)
                        }
                        className={`
                          flex
                          w-full
                          items-center
                          justify-between
                          rounded-xl
                          border
                          px-3.5
                          py-3
                          text-left
                          text-sm
                          transition
                          ${
                            selected
                              ? "border-brand-navy bg-brand-navy/5 text-brand-navy"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          }
                        `}
                      >
                        <span>{service}</span>

                        {selected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-navy text-white">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div>
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-slate-900">
                    Quantity & deadline
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    This helps the team understand the scale and urgency
                    of your project.
                  </p>
                </div>

                <div className="mb-5">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Quantity
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {QUANTITIES.map((quantity) => {
                      const selected =
                        formData.quantity === quantity;

                      return (
                        <button
                          key={quantity}
                          type="button"
                          onClick={() =>
                            updateField("quantity", quantity)
                          }
                          className={`
                            rounded-xl
                            border
                            px-3
                            py-3
                            text-sm
                            transition
                            ${
                              selected
                                ? "border-brand-navy bg-brand-navy text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }
                          `}
                        >
                          {quantity}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Timeline
                  </label>

                  <div className="space-y-2">
                    {TIMELINES.map((timeline) => {
                      const selected =
                        formData.timeline === timeline;

                      return (
                        <button
                          key={timeline}
                          type="button"
                          onClick={() =>
                            updateField("timeline", timeline)
                          }
                          className={`
                            flex
                            w-full
                            items-center
                            justify-between
                            rounded-xl
                            border
                            px-3.5
                            py-3
                            text-left
                            text-sm
                            transition
                            ${
                              selected
                                ? "border-brand-navy bg-brand-navy/5 text-brand-navy"
                                : "border-slate-200 text-slate-700 hover:bg-slate-50"
                            }
                          `}
                        >
                          <span>{timeline}</span>

                          {selected && (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div>
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-slate-900">
                    Tell us about the project
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Include sizes, materials, finishing, colours, delivery
                    location or anything else we should know.
                  </p>
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Artwork
                  </label>

                  <div className="space-y-2">
                    {ARTWORK_OPTIONS.map((option) => {
                      const selected =
                        formData.artwork === option;

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            updateField("artwork", option)
                          }
                          className={`
                            flex
                            w-full
                            items-center
                            justify-between
                            rounded-xl
                            border
                            px-3.5
                            py-3
                            text-left
                            text-sm
                            transition
                            ${
                              selected
                                ? "border-brand-navy bg-brand-navy/5 text-brand-navy"
                                : "border-slate-200 text-slate-700 hover:bg-slate-50"
                            }
                          `}
                        >
                          <span>{option}</span>

                          {selected && (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="protocol-project-details"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Project details
                  </label>

                  <textarea
                    id="protocol-project-details"
                    value={formData.details}
                    onChange={(event) =>
                      updateField("details", event.target.value)
                    }
                    rows={6}
                    placeholder="Example: 500 A5 flyers, double-sided, full colour, matte finish. I already have the design. I need them by Friday."
                    className="
                      w-full
                      resize-none
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      px-3.5
                      py-3
                      text-sm
                      leading-6
                      text-slate-800
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-brand-navy
                      focus:ring-2
                      focus:ring-brand-navy/10
                    "
                  />
                </div>

                {/* Summary */}
                <div className="mt-4 rounded-xl bg-slate-50 p-3.5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Enquiry summary
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-800">
                        Service:
                      </span>{" "}
                      {formData.service || "Not specified"}
                    </p>

                    <p>
                      <span className="font-semibold text-slate-800">
                        Quantity:
                      </span>{" "}
                      {formData.quantity || "Not specified"}
                    </p>

                    <p>
                      <span className="font-semibold text-slate-800">
                        Timeline:
                      </span>{" "}
                      {formData.timeline || "Not specified"}
                    </p>

                    <p>
                      <span className="font-semibold text-slate-800">
                        Artwork:
                      </span>{" "}
                      {formData.artwork || "Not specified"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-white p-4">
            <div className="flex gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="
                    flex-1
                    rounded-xl
                    border
                    border-slate-200
                    px-4
                    py-3
                    text-sm
                    font-medium
                    text-slate-700
                    transition
                    hover:bg-slate-50
                  "
                >
                  Back
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={step === 1 && !canContinueFromStep1}
                  className="
                    flex
                    flex-1
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-brand-navy
                    px-4
                    py-3
                    text-sm
                    font-semibold
                    text-white
                    transition
                    hover:opacity-90
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                >
                  Continue
                  <span aria-hidden="true">→</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendEnquiry}
                  className="
                    flex
                    flex-1
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#25D366]
                    px-4
                    py-3
                    text-sm
                    font-semibold
                    text-white
                    transition
                    hover:bg-[#20bd5a]
                  "
                >
                  <FaWhatsapp className="h-5 w-5" />
                  Send on WhatsApp
                </button>
              )}
            </div>

            {step === 3 && (
              <button
                type="button"
                onClick={resetForm}
                className="
                  mx-auto
                  mt-3
                  flex
                  items-center
                  gap-1.5
                  text-xs
                  text-slate-400
                  transition
                  hover:text-slate-600
                "
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Start over
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating button */}
      <div
        className="
          fixed
          bottom-5
          right-5
          z-9999
          sm:bottom-6
          sm:right-6
        "
      >
        {/* Notification */}
        {nudge && !isChatOpen && (
          <div
            className="
              absolute
              bottom-16
              right-0
              mb-2
              w-56
              rounded-xl
              border
              border-slate-200
              bg-white
              p-3
              shadow-xl
              wa-float-in
            "
          >
            <div className="flex items-start gap-2">
              <div className="mt-0.5 rounded-full bg-[#25D366]/10 p-1.5 text-[#25D366]">
                <Sparkles className="h-3.5 w-3.5" />
              </div>

              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-900">
                  Need a quote?
                </p>

                <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                  Tell us what you need and send the details directly to
                  WhatsApp.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setNudge(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Pulse ring */}
        {!isChatOpen && (
          <span
            className="
              pointer-events-none
              absolute
              inset-0
              rounded-full
              bg-[#25D366]
              wa-pulse-ring
            "
          />
        )}

        {/* Main button */}
        <button
          type="button"
          onClick={() => {
            setIsChatOpen((current) => !current);
            setNudge(false);
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`
            relative
            flex
            h-14
            w-14
            items-center
            justify-center
            rounded-full
            bg-[#25D366]
            text-white
            shadow-lg
            shadow-black/20
            transition
            hover:scale-105
            active:scale-95
            sm:h-16
            sm:w-16
            ${!hovered && !isChatOpen ? "wa-bob" : ""}
            ${hovered ? "wa-wiggle" : ""}
          `}
          aria-label={
            isChatOpen
              ? "Close Protocol Assistant"
              : "Open Protocol Assistant"
          }
        >
          {isChatOpen ? (
            <X className="h-6 w-6 sm:h-7 sm:w-7" />
          ) : (
            <FaWhatsapp className="h-7 w-7 sm:h-8 sm:w-8" />
          )}

          {/* Online indicator */}
          {!isChatOpen && (
            <span
              className="
                absolute
                right-0.5
                top-0.5
                h-3.5
                w-3.5
                rounded-full
                border-2
                border-white
                bg-green-500
                wa-status-pulse
              "
              aria-hidden="true"
            />
          )}
        </button>

        {/* Direct WhatsApp fallback */}
        {!isChatOpen && (
          <button
            type="button"
            onClick={handleQuickWhatsApp}
            className="
              absolute
              -left-1
              -top-1
              h-5
              w-5
              rounded-full
              bg-white
              text-[#25D366]
              shadow-md
              transition
              hover:scale-110
            "
            aria-label="Send a direct WhatsApp enquiry"
            title="Send direct WhatsApp enquiry"
          >
            <Send className="mx-auto h-3 w-3" />
          </button>
        )}
      </div>
    </>
  );
}

export default WhatsAppFloat;