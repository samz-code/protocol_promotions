import { useCallback, useEffect, useRef, useState } from "react";
import { X, Check, RefreshCw } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

const WHATSAPP_NUMBER = "254762446077";
const STORAGE_KEY = "protocol_promotion_quote_draft_v2";

/** Served from the /public folder. Use "/your-subpath/favicon.png" if the site isn't at the domain root */
const LOGO_SRC = "/favicon.png";

/** Toggle each auto-hide behaviour (set to false to troubleshoot) */
const HIDE_ON_SCROLL = true;
const HIDE_ON_FIELD_FOCUS = true;
const HIDE_ON_OVERLAY = true;

/** How long (ms) the page must stop scrolling before the button returns */
const SCROLL_IDLE_MS = 700;
/** Minimum scroll distance (px) that counts as scrolling */
const SCROLL_THRESHOLD = 4;

type Step = 1 | 2 | 3;

type FormData = {
  service: string;
  quantity: string;
  timeline: string;
  artwork: string;
  details: string;
};

const EMPTY_FORM: FormData = {
  service: "",
  quantity: "",
  timeline: "",
  artwork: "",
  details: "",
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

const QUANTITIES = ["1 - 50", "50 - 200", "200 - 1,000", "1,000+", "Not sure"];

const TIMELINES = ["Urgent - confirm availability", "Standard", "Flexible"];

const ARTWORK_OPTIONS = [
  "I have print-ready artwork",
  "I need design assistance",
  "Not sure",
];

const DEFAULT_MESSAGE =
  "Hello Protocol Promotion, I would like to enquire about your printing, branding or graphic design services.";

const isEditableElement = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  return el.matches("input, textarea, select") || el.isContentEditable === true;
};

/** True only if the element is genuinely rendered and seen by the user */
const isVisible = (el: HTMLElement): boolean => {
  if (el.closest('[aria-hidden="true"], [hidden], [inert]')) return false;

  const style = window.getComputedStyle(el);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    parseFloat(style.opacity) === 0
  ) {
    return false;
  }

  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

/** A dialog counts as an overlay only if it's visible and modal-like */
const isBlockingDialog = (el: HTMLElement): boolean => {
  if (!isVisible(el)) return false;

  if (el.getAttribute("aria-modal") === "true") return true;
  if (el.tagName === "DIALOG" && (el as HTMLDialogElement).open) return true;

  const rect = el.getBoundingClientRect();
  const coverage =
    (rect.width * rect.height) / (window.innerWidth * window.innerHeight);

  // Large visible dialogs / drawers (e.g. mobile menu, cart drawer)
  return coverage >= 0.35;
};

export function WhatsAppFloat() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [hovered, setHovered] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  /* Visibility triggers */
  const [isScrolling, setIsScrolling] = useState(false);
  const [fieldFocused, setFieldFocused] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);

  /* Load saved enquiry */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);

      if (parsed?.formData && typeof parsed.formData === "object") {
        setFormData((current) => ({ ...current, ...parsed.formData }));
      }

      if (parsed?.step === 1 || parsed?.step === 2 || parsed?.step === 3) {
        setStep(parsed.step);
      }
    } catch {
      // Ignore invalid localStorage data
    }
  }, []);

  /* Save enquiry */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, formData }));
    } catch {
      // Ignore localStorage errors
    }
  }, [step, formData]);

  /* Hide while the page is scrolling, return once it stops */
  useEffect(() => {
    if (!HIDE_ON_SCROLL) return;

    let lastY = window.scrollY;
    let timer: number | undefined;

    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < SCROLL_THRESHOLD) return;
      lastY = y;

      setIsScrolling(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIsScrolling(false), SCROLL_IDLE_MS);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, []);

  /* Hide while the user types in a field elsewhere on the page */
  useEffect(() => {
    if (!HIDE_ON_FIELD_FOCUS) return;

    const onFocusIn = (event: FocusEvent) => {
      const root = rootRef.current;
      const target = event.target;

      if (
        isEditableElement(target) &&
        target instanceof HTMLElement &&
        isVisible(target) &&
        !(root && root.contains(target))
      ) {
        setFieldFocused(true);
      } else {
        setFieldFocused(false);
      }
    };

    const onFocusOut = (event: FocusEvent) => {
      // If focus is moving to another field, focusin will handle it
      if (!event.relatedTarget) setFieldFocused(false);
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  /* Hide while a visible modal / drawer is open */
  const detectOverlay = useCallback((): boolean => {
    const root = rootRef.current;

    const candidates = document.querySelectorAll<HTMLElement>(
      '[role="dialog"], [role="alertdialog"], [aria-modal="true"], dialog[open]'
    );

    for (const el of Array.from(candidates)) {
      if (root && root.contains(el)) continue;
      if (isBlockingDialog(el)) return true;
    }

    return false;
  }, []);

  useEffect(() => {
    if (!HIDE_ON_OVERLAY) return;

    let frame = 0;

    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setOverlayOpen(detectOverlay()));
    };

    check();

    const observer = new MutationObserver(check);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "open", "aria-modal", "aria-hidden", "hidden"],
    });

    window.addEventListener("resize", check);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [detectOverlay]);

  /* Close the panel with Escape */
  useEffect(() => {
    if (!isChatOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsChatOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isChatOpen]);

  /* Close the panel if another overlay takes over the screen */
  useEffect(() => {
    if (overlayOpen) setIsChatOpen(false);
  }, [overlayOpen]);

  const buttonHidden = overlayOpen || isScrolling || fieldFocused;
  const panelHidden = overlayOpen;

  /* Idle animations run only when the button is visible, closed and not hovered */
  const animateIdle = !buttonHidden && !isChatOpen && !hovered;

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
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

    const opened = window.open(url, "_blank", "noopener,noreferrer");

    // Popup blocked fallback
    if (!opened) {
      window.location.href = url;
    }
  };

  const handleQuickWhatsApp = () => openWhatsApp(DEFAULT_MESSAGE);

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
    if (step < 3) setStep((current) => (current + 1) as Step);
  };

  const goBack = () => {
    if (step > 1) setStep((current) => (current - 1) as Step);
  };

  const optionClass = (selected: boolean) =>
    `flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left text-sm transition ${
      selected
        ? "border-brand-navy bg-brand-navy/5 text-brand-navy"
        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
    }`;

  return (
    <div ref={rootRef} data-whatsapp-float>
      <style>{`
        @keyframes waPanelIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* One soft ripple, then a long rest (4s cycle) */
        @keyframes waRipple {
          0%   { transform: scale(1);    opacity: 0.45; }
          35%  { transform: scale(1.55); opacity: 0; }
          100% { transform: scale(1.55); opacity: 0; }
        }

        /* Quick friendly tilt, then a long rest (8s cycle) */
        @keyframes waTilt {
          0%, 100% { transform: rotate(0deg) scale(1); }
          2%       { transform: rotate(-14deg) scale(1.08); }
          4%       { transform: rotate(12deg) scale(1.08); }
          6%       { transform: rotate(-8deg) scale(1.04); }
          8%       { transform: rotate(5deg) scale(1.02); }
          10%      { transform: rotate(0deg) scale(1); }
        }

        .wa-panel-in {
          animation: waPanelIn 0.25s ease-out backwards;
        }

        .wa-ripple {
          animation: waRipple 4s ease-out infinite;
        }

        .wa-tilt {
          animation: waTilt 8s ease-in-out 1.5s infinite;
          transform-origin: 50% 60%;
        }

        @media (prefers-reduced-motion: reduce) {
          .wa-panel-in,
          .wa-ripple,
          .wa-tilt {
            animation: none !important;
          }
        }
      `}</style>

      {/* Assistant panel */}
      {isChatOpen && (
        <div
          aria-hidden={panelHidden}
          className={`wa-panel-in fixed bottom-24 right-4 z-9998 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 sm:bottom-28 sm:right-6 ${
            panelHidden
              ? "pointer-events-none translate-y-3 opacity-0"
              : "translate-y-0 opacity-100"
          }`}
        >
          {/* Header */}
          <div className="bg-brand-navy px-4 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Brand logo */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1.5">
                  {logoFailed ? (
                    <span className="text-sm font-bold text-brand-navy">
                      P
                    </span>
                  ) : (
                    <img
                      src={LOGO_SRC}
                      alt="Protocol Promotion logo"
                      className="h-full w-full object-contain"
                      onError={() => setLogoFailed(true)}
                      draggable={false}
                    />
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold">Protocol Assistant</p>
                  <p className="mt-0.5 text-xs text-white/70">
                    Get your printing & branding enquiry ready
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
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
                    item <= step ? "bg-white" : "bg-white/20"
                  }`}
                />
              ))}
            </div>

            <p className="mt-2 text-[11px] text-white/60">Step {step} of 3</p>
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
                    const selected = formData.service === service;

                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => updateField("service", service)}
                        className={optionClass(selected)}
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
                    This helps the team understand the scale and urgency of
                    your project.
                  </p>
                </div>

                <div className="mb-5">
                  <p className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Quantity
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {QUANTITIES.map((quantity) => {
                      const selected = formData.quantity === quantity;

                      return (
                        <button
                          key={quantity}
                          type="button"
                          onClick={() => updateField("quantity", quantity)}
                          className={`rounded-xl border px-3 py-3 text-sm transition ${
                            selected
                              ? "border-brand-navy bg-brand-navy text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {quantity}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Timeline
                  </p>

                  <div className="space-y-2">
                    {TIMELINES.map((timeline) => {
                      const selected = formData.timeline === timeline;

                      return (
                        <button
                          key={timeline}
                          type="button"
                          onClick={() => updateField("timeline", timeline)}
                          className={optionClass(selected)}
                        >
                          <span>{timeline}</span>
                          {selected && <Check className="h-4 w-4" />}
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
                  <p className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Artwork
                  </p>

                  <div className="space-y-2">
                    {ARTWORK_OPTIONS.map((option) => {
                      const selected = formData.artwork === option;

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateField("artwork", option)}
                          className={optionClass(selected)}
                        >
                          <span>{option}</span>
                          {selected && <Check className="h-4 w-4" />}
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
                    maxLength={1500}
                    placeholder="Example: 500 A5 flyers, double-sided, full colour, matte finish. I already have the design. I need them by Friday."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10"
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
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Back
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={step === 1 && !canContinueFromStep1}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue
                  <span aria-hidden="true">→</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendEnquiry}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#20bd5a]"
                >
                  <FaWhatsapp className="h-5 w-5" />
                  Send on WhatsApp
                </button>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleQuickWhatsApp}
                className="text-slate-500 underline-offset-2 transition hover:text-slate-800 hover:underline"
              >
                Or chat directly on WhatsApp
              </button>

              {step === 3 && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex items-center gap-1.5 text-slate-400 transition hover:text-slate-600"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Start over
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <div
        className={`fixed bottom-5 right-5 z-9999 transition-all duration-500 ease-out sm:bottom-6 sm:right-6 ${
          buttonHidden
            ? "pointer-events-none translate-y-6 scale-75 opacity-0"
            : "translate-y-0 scale-100 opacity-100"
        }`}
      >
        {/* Soft ripple ring (behind the button) */}
        {animateIdle && (
          <span
            aria-hidden="true"
            className="wa-ripple pointer-events-none absolute inset-0 rounded-full bg-[#25D366]"
          />
        )}

        <button
          type="button"
          onClick={() => setIsChatOpen((current) => !current)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          tabIndex={buttonHidden ? -1 : 0}
          aria-hidden={buttonHidden}
          aria-expanded={isChatOpen}
          aria-label={
            isChatOpen ? "Close Protocol Assistant" : "Open Protocol Assistant"
          }
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition hover:scale-105 active:scale-95 sm:h-16 sm:w-16"
        >
          {isChatOpen ? (
            <X className="h-6 w-6 sm:h-7 sm:w-7" />
          ) : (
            <FaWhatsapp
              className={`h-7 w-7 sm:h-8 sm:w-8 ${animateIdle ? "wa-tilt" : ""}`}
            />
          )}
        </button>
      </div>
    </div>
  );
}

export default WhatsAppFloat;