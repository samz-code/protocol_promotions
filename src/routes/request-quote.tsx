import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/lib/cart";
import {
  Upload, Loader2, CheckCircle2, AlertCircle, ShoppingCart, X,
  FileText, ArrowRight, Clock, ShieldCheck, Smartphone, Mail,
  MessageCircle,
} from "lucide-react";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.34.657 4.6 1.902 6.57L4 29l7.605-1.87A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.818c-1.94 0-3.84-.523-5.5-1.512l-.395-.234-4.51 1.11 1.176-4.395-.257-.406A9.78 9.78 0 0 1 5.09 15c0-6.02 4.895-10.909 10.914-10.909 6.017 0 10.909 4.89 10.909 10.91 0 6.018-4.892 10.817-10.91 10.817Zm5.98-8.17c-.328-.164-1.94-.957-2.24-1.066-.3-.11-.518-.164-.737.164-.219.328-.846 1.066-1.037 1.285-.191.219-.383.246-.71.082-.328-.164-1.386-.51-2.64-1.63-.976-.87-1.635-1.946-1.826-2.274-.191-.328-.02-.505.144-.668.148-.148.328-.383.492-.575.164-.191.219-.328.328-.547.11-.219.055-.41-.027-.574-.082-.164-.737-1.776-1.01-2.433-.266-.64-.537-.553-.737-.563l-.628-.011c-.219 0-.574.082-.875.41-.3.328-1.148 1.121-1.148 2.735 0 1.613 1.176 3.172 1.34 3.39.164.219 2.312 3.531 5.602 4.95.783.338 1.394.54 1.87.69.786.25 1.501.215 2.067.13.63-.094 1.94-.793 2.213-1.559.273-.766.273-1.422.191-1.559-.082-.137-.3-.219-.628-.383Z" />
    </svg>
  );
}

export const Route = createFileRoute("/request-quote")({
  head: () => ({
    meta: [
      { title: "Request a Quote | Protocol Promotions" },
      { name: "description", content: "Tell us what you need branded or printed and we'll send you a real quote, usually within one business day." },
      { property: "og:title", content: "Request a Quote | Protocol Promotions" },
      { property: "og:description", content: "Send us your project. Get a real quote back fast." },
    ],
  }),
  component: QuotePage,
});

const KSH = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

// wa.me needs the number without the leading "+" or "tel:" prefix.
const WHATSAPP_NUMBER = "254762446077";
const CONTACT_EMAIL = "protocolpromotions@gmail.com";

function buildWhatsAppLink(text: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function buildMailtoLink(subject: string, body: string) {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

type FormState = {
  name: string;
  company: string;
  email: string;
  phone: string;
  product: string;
  quantity: string;
  deadline: string;
  message: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  company: "",
  email: "",
  phone: "",
  product: "",
  quantity: "",
  deadline: "",
  message: "",
};

function QuotePage() {
  const { lines, subtotal, removeLine, clear } = useCart();
  const hasCart = lines.length > 0;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{
    name: string;
    deadline: string;
    itemNames: string[];
  } | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function uploadArtwork(): Promise<string[]> {
    if (files.length === 0) return [];
    const urls: string[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `quotes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("artworks").upload(path, file);
      if (error) throw new Error(`We couldn't upload ${file.name}. ${error.message}`);
      const { data } = supabase.storage.from("artworks").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!form.name.trim() || !form.email.trim()) {
      setErrorMsg("We at least need your name and email so we know who to reply to.");
      return;
    }
    if (!hasCart && !form.product.trim() && !form.message.trim()) {
      setErrorMsg("Tell us what you need made. Add products to your cart, or just describe it below.");
      return;
    }

    setStatus("sending");

    try {
      const artworkUrls = await uploadArtwork();
      const { data: auth } = await supabase.auth.getUser();

      // Configured cart lines become the quote's line items.
      const items = hasCart
        ? lines.map((l) => ({
            product_id: l.productId,
            name: l.name,
            quantity: l.quantity,
            unit_price: l.baseUnitPrice,
            setup_fee: l.setupFee,
            estimated_total: l.totalCost,
            color: l.configuration.color,
            size: l.configuration.size,
            print_method: l.configuration.printMethod,
            artwork_url: l.configuration.artworkUrl,
            custom_branding: l.configuration.customBranding,
          }))
        : [
            {
              name: form.product.trim() || "Custom enquiry",
              quantity: Number(form.quantity) || null,
              custom: true,
            },
          ];

      const { data, error } = await supabase
        .from("quotes")
        .insert({
          user_id: auth?.user?.id ?? null,
          status: "pending",
          amount_due: hasCart ? subtotal : null,
          items,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          company: form.company.trim() || null,
          message: form.message.trim() || null,
          deadline: form.deadline || null,
          artwork_urls: artworkUrls,
          source: hasCart ? "cart" : "website",
        })
        .select("quote_number")
        .single();

      if (error) throw error;

      setReference(data?.quote_number ?? null);
      setSubmitted({
        name: form.name.trim(),
        deadline: form.deadline,
        itemNames: hasCart
          ? lines.map((l) => `${l.name} x${l.quantity}`)
          : form.product.trim()
            ? [`${form.product.trim()}${form.quantity ? ` x${form.quantity}` : ""}`]
            : [],
      });
      setStatus("sent");
      setForm(EMPTY_FORM);
      setFiles([]);
      if (hasCart) clear();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong on our end. Please try again.");
      setStatus("error");
    }
  }

  function successWhatsAppMessage() {
    const lead = reference
      ? `Hi, I just sent quote request ${reference} on the website.`
      : "Hi, I just sent a quote request on the website.";

    const itemLines = submitted && submitted.itemNames.length > 0
      ? submitted.itemNames.map((name) => `- ${name}`).join("\n")
      : null;

    return [
      lead,
      submitted?.name ? `Name: ${submitted.name}` : null,
      itemLines ? `Items:\n${itemLines}` : null,
      submitted?.deadline ? `Deadline: ${submitted.deadline}` : null,
      "Could you confirm you've received it?",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  function successEmailBody() {
    const itemLines = submitted && submitted.itemNames.length > 0
      ? submitted.itemNames.map((name) => `- ${name}`).join("\n")
      : null;

    return [
      submitted?.name ? `Hi, this is ${submitted.name}.` : "Hi,",
      `I just sent quote request ${reference ?? "(see website confirmation)"} through the website and wanted to follow up here too.`,
      itemLines ? `Items:\n${itemLines}` : null,
      submitted?.deadline ? `Deadline: ${submitted.deadline}` : null,
      "Could you confirm you've received it?",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (status === "sent") {
    return (
      <SiteLayout>
        <PageHeader eyebrow="Request Quote" title="Got it. We're on it." />
        <section className="container-page py-16 md:py-24">
          <div className="mx-auto max-w-xl rounded-2xl border-2 border-brand-navy bg-white p-10 text-center md:p-14">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-50">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mt-7 text-3xl font-black tracking-tight text-brand-navy md:text-4xl">
              Thanks, that's in our hands now
            </h2>
            {reference && (
              <p className="mt-4 text-base text-brand-navy/70">
                Your reference is{" "}
                <span className="font-mono text-lg font-bold text-brand-navy">{reference}</span>.
                Keep it handy if you need to follow up.
              </p>
            )}
            <p className="mt-5 text-base leading-relaxed text-brand-navy/70">
              We'll price this properly and send you a clear, itemised quote, usually within one
              business day. Once you're happy with the number, pay by M-Pesa and we go straight
              into artwork proofing.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a
                href={buildWhatsAppLink(successWhatsAppMessage())}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-md bg-[#25D366] px-7 py-3.5 text-base font-bold text-white transition hover:brightness-95"
              >
                <MessageCircle className="h-5 w-5" />
                Share on WhatsApp
              </a>
              <a
                href={buildMailtoLink(
                  reference ? `Quote request ${reference}` : "Quote request",
                  successEmailBody(),
                )}
                className="inline-flex items-center gap-2.5 rounded-md border-2 border-brand-navy px-7 py-3.5 text-base font-bold text-brand-navy transition hover:bg-brand-navy hover:text-white"
              >
                <Mail className="h-5 w-5" />
                Email it instead
              </a>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-md bg-brand-navy px-7 py-3.5 text-base font-bold text-white transition hover:brightness-110"
              >
                Back to shop
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-md border-2 border-brand-navy/20 px-7 py-3.5 text-base font-bold text-brand-navy transition hover:border-brand-navy"
              >
                Home
              </Link>
            </div>
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Request Quote"
        title={hasCart ? "Let's lock this in" : "Tell us what you need"}
        description={
          hasCart
            ? "Here's what you've configured so far. Add your details below and we'll price the job and send you a proper quote."
            : "No forms with fifty fields. Just tell us what you're branding, how many, and by when. We'll get back to you with real numbers, usually within one business day."
        }
      />

      <section className="container-page py-16 md:py-24">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* How this works */}
          <ol className="grid gap-4 rounded-2xl border-2 border-border bg-brand-surface/50 p-6 sm:grid-cols-3">
            <Step n="1" icon={FileText} title="You tell us" body="Send the details and any artwork you've got. Rough is fine." />
            <Step n="2" icon={Clock} title="We price it" body="A clear, itemised quote lands in your inbox within a business day." />
            <Step n="3" icon={Smartphone} title="You pay and we print" body="Approve the number, pay by M-Pesa, and we start proofing." />
          </ol>

          {/* Configured cart items */}
          {hasCart && (
            <div className="rounded-2xl border-2 border-brand-navy bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b-2 border-border bg-brand-surface px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className="h-5 w-5 text-brand-orange" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-brand-navy">
                    What you've configured
                  </h2>
                </div>
                <span className="text-sm font-bold text-brand-navy/50">
                  {lines.length} {lines.length === 1 ? "item" : "items"}
                </span>
              </div>

              <ul className="divide-y-2 divide-border">
                {lines.map((l) => (
                  <li key={l.lineId} className="flex items-start gap-4 p-6">
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-bold text-brand-navy">{l.name}</div>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-brand-navy/55">
                        <span>Qty {l.quantity}</span>
                        {l.configuration.color && <span>{l.configuration.color}</span>}
                        {l.configuration.size && <span>{l.configuration.size}</span>}
                        {l.configuration.printMethod && <span>{l.configuration.printMethod}</span>}
                        {l.configuration.customBranding && (
                          <span className="font-bold text-brand-orange">Custom branding</span>
                        )}
                      </div>
                      {l.configuration.artworkUrl && (
                        <a
                          href={l.configuration.artworkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-orange hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" /> Artwork attached
                        </a>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-base font-black tabular-nums text-brand-navy">
                        {KSH.format(l.totalCost)}
                      </div>
                      {l.setupFee > 0 && (
                        <div className="text-xs text-brand-navy/45">
                          incl. {KSH.format(l.setupFee)} setup
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeLine(l.lineId)}
                      className="grid h-8 w-8 shrink-0 place-items-center text-brand-navy/35 transition-colors hover:text-brand-orange"
                      aria-label={`Remove ${l.name}`}
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between border-t-2 border-brand-navy bg-brand-surface px-6 py-5">
                <div>
                  <div className="text-sm font-black uppercase tracking-widest text-brand-navy">
                    Estimated total
                  </div>
                  <p className="mt-1 text-sm text-brand-navy/55">
                    This is a rough figure. Your formal quote confirms the real one.
                  </p>
                </div>
                <div className="text-2xl font-black tabular-nums text-brand-navy">
                  {KSH.format(subtotal)}
                </div>
              </div>
            </div>
          )}

          {!hasCart && (
            <div className="flex items-start gap-3.5 rounded-2xl border-2 border-border bg-white p-6">
              <ShoppingCart className="mt-0.5 h-5 w-5 shrink-0 text-brand-navy/35" />
              <p className="text-base text-brand-navy/65 leading-relaxed">
                Nothing in your cart yet. Head to the{" "}
                <Link to="/shop" className="font-bold text-brand-orange hover:underline">
                  shop
                </Link>{" "}
                if you want to configure exact products, or just describe what you need below and
                we'll work from that.
              </p>
            </div>
          )}

          {/* The form */}
          <form
            onSubmit={handleSubmit}
            className="grid gap-6 rounded-2xl border-2 border-border bg-white p-7 md:p-10"
          >
            <h2 className="text-sm font-black uppercase tracking-widest text-brand-navy">
              Your details
            </h2>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Full name" required value={form.name} onChange={(v) => set("name", v)} placeholder="Your name" />
              <Field label="Company" value={form.company} onChange={(v) => set("company", v)} placeholder="Company name" />
              <Field label="Email" required type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="you@company.com" />
              <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} placeholder="+254 7.." />
            </div>

            {!hasCart && (
              <div className="grid gap-6 sm:grid-cols-2">
                <Field
                  label="Product or service"
                  value={form.product}
                  onChange={(v) => set("product", v)}
                  placeholder="e.g. 200 polo shirts with embroidery"
                />
                <Field
                  label="Quantity"
                  type="number"
                  value={form.quantity}
                  onChange={(v) => set("quantity", v)}
                  placeholder="0"
                />
              </div>
            )}

            <Field label="Deadline" type="date" value={form.deadline} onChange={(v) => set("deadline", v)} />

            <div>
              <label htmlFor="q-message" className="mb-2 block text-base font-medium text-brand-navy">
                {hasCart ? "Anything else we should know" : "Tell us about the project"}
              </label>
              <textarea
                id="q-message"
                rows={5}
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
                className="w-full rounded-lg border-2 border-border bg-white px-4 py-3 text-base outline-none transition focus:border-brand-navy"
                placeholder={
                  hasCart
                    ? "Delivery location, where the logo goes, anything specific about this job."
                    : "Sizes, colours, how you'd like it printed, where it needs to go."
                }
              />
            </div>

            {/* Artwork */}
            <div>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-border bg-brand-surface px-4 py-10 transition-colors hover:border-brand-orange">
                <Upload className="h-7 w-7 text-brand-orange" />
                <div className="text-base font-bold text-brand-navy">
                  Drop your artwork here (PDF, PNG, AI, PSD)
                </div>
                <div className="text-sm text-brand-navy/50">Optional. Up to 50MB per file.</div>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.ai,.psd,.eps,.svg"
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                  className="hidden"
                />
              </label>

              {files.length > 0 && (
                <ul className="mt-3.5 space-y-2">
                  {files.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-lg border-2 border-border bg-white px-4 py-2.5"
                    >
                      <span className="min-w-0 truncate text-sm font-medium text-brand-navy">
                        {f.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                        className="shrink-0 text-brand-navy/40 hover:text-brand-orange"
                        aria-label={`Remove ${f.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {errorMsg && (
              <div className="flex items-start gap-3 rounded-lg border-2 border-brand-orange bg-brand-orange/8 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
                <span className="text-base font-medium text-brand-navy">{errorMsg}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-orange px-8 py-4 text-base font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "sending" ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    Send quote request <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              <a
                href={buildWhatsAppLink("Hi, I'd like to ask about a quote before I send the form.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#25D366] px-8 py-4 text-base font-bold text-white transition hover:brightness-95"
              >
                Message us on WhatsApp
              </a>

              <a
                href={buildMailtoLink("Quote request", "Hi,\n\nI'd like a quote for the following:\n\n")}
                className="inline-flex items-center justify-center gap-2 rounded-md border-2 border-brand-navy/20 px-8 py-4 text-base font-bold text-brand-navy transition hover:border-brand-navy"
              >
                <Mail className="h-5 w-5" />
                Email us instead
              </a>
            </div>

            <p className="flex items-start gap-2.5 text-sm leading-relaxed text-brand-navy/50">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-navy/35" />
              No payment now. We price the job first, then you approve before anything goes to production.
            </p>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}

function Step({
  n, icon: Icon, title, body,
}: {
  n: string;
  icon: typeof FileText;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-navy text-sm font-black text-white">
        {n}
      </div>
      <div>
        <div className="flex items-center gap-2 text-sm font-bold text-brand-navy">
          <Icon className="h-4 w-4 text-brand-orange" />
          {title}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-brand-navy/60">{body}</p>
      </div>
    </li>
  );
}

function Field({
  label, type = "text", placeholder, value, onChange, required,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const id = `q-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-base font-medium text-brand-navy">
        {label}
        {required && <span className="ml-1 text-brand-orange">*</span>}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border-2 border-border bg-white px-4 py-3 text-base outline-none transition focus:border-brand-navy"
      />
    </div>
  );
}