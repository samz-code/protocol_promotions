import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/lib/cart";
import {
  Upload, Loader2, CheckCircle2, AlertCircle, ShoppingCart, X,
  FileText, ArrowRight, Clock, ShieldCheck, Smartphone,
} from "lucide-react";

export const Route = createFileRoute("/request-quote")({
  head: () => ({
    meta: [
      { title: "Request a Quote | Protocol Promotions" },
      { name: "description", content: "Get a detailed, itemised quote for your branding and printing project, usually within one business day." },
      { property: "og:title", content: "Request a Quote | Protocol Promotions" },
      { property: "og:description", content: "Custom quote in one business day." },
    ],
  }),
  component: QuotePage,
});

const KSH = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

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
      if (error) throw new Error(`Could not upload ${file.name}. ${error.message}`);
      const { data } = supabase.storage.from("artworks").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!form.name.trim() || !form.email.trim()) {
      setErrorMsg("Please give us at least your name and email so we can reply.");
      return;
    }
    if (!hasCart && !form.product.trim() && !form.message.trim()) {
      setErrorMsg("Tell us what you need made, either by adding products to your cart or describing it below.");
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
      setStatus("sent");
      setForm(EMPTY_FORM);
      setFiles([]);
      if (hasCart) clear();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <SiteLayout>
        <PageHeader eyebrow="Request Quote" title="Quote request received" />
        <section className="container-page py-14 md:py-20">
          <div className="mx-auto max-w-xl rounded-xl border border-border bg-white p-8 text-center md:p-12">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-50">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-brand-navy">
              Thank you, we have it
            </h2>
            {reference && (
              <p className="mt-3 text-sm text-brand-navy/70">
                Your reference is{" "}
                <span className="font-mono font-bold text-brand-navy">{reference}</span>.
                Quote it if you need to follow up.
              </p>
            )}
            <p className="mt-4 text-sm leading-relaxed text-brand-navy/70">
              Our team will price this and send you an itemised quote, usually within one business
              day. Once you approve the figure, you can pay by M-Pesa and we move straight into
              artwork proofing.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-md bg-brand-navy px-6 py-3 text-sm font-bold text-white transition hover:brightness-110"
              >
                Back to shop
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-md border border-brand-navy/20 px-6 py-3 text-sm font-bold text-brand-navy transition hover:border-brand-navy"
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
        title={hasCart ? "Confirm your quote request" : "Tell us about your project"}
        description={
          hasCart
            ? "Your configured items are listed below. Add your contact details and we will price the job and send a formal quote."
            : "Share the details below. We will respond with an itemised quote, usually within one business day."
        }
      />

      <section className="container-page py-14 md:py-20">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* How this works */}
          <ol className="grid gap-3 rounded-xl border border-border bg-brand-surface/50 p-5 sm:grid-cols-3">
            <Step n="1" icon={FileText} title="You send this" body="We price the job against your artwork and quantity." />
            <Step n="2" icon={Clock} title="We quote you" body="An itemised quote lands with you within one business day." />
            <Step n="3" icon={Smartphone} title="You approve and pay" body="Pay by M-Pesa once the figure is agreed. Then we proof." />
          </ol>

          {/* Configured cart items */}
          {hasCart && (
            <div className="rounded-xl border-2 border-brand-navy bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-brand-surface px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-brand-orange" />
                  <h2 className="text-xs font-black uppercase tracking-widest text-brand-navy">
                    Items you configured
                  </h2>
                </div>
                <span className="text-xs font-bold text-brand-navy/50">
                  {lines.length} {lines.length === 1 ? "item" : "items"}
                </span>
              </div>

              <ul className="divide-y divide-border">
                {lines.map((l) => (
                  <li key={l.lineId} className="flex items-start gap-4 p-5">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-brand-navy">{l.name}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-brand-navy/55">
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
                          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-orange hover:underline"
                        >
                          <FileText className="h-3 w-3" /> Artwork attached
                        </a>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-sm font-black tabular-nums text-brand-navy">
                        {KSH.format(l.totalCost)}
                      </div>
                      {l.setupFee > 0 && (
                        <div className="text-[10px] text-brand-navy/45">
                          incl. {KSH.format(l.setupFee)} setup
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeLine(l.lineId)}
                      className="grid h-7 w-7 shrink-0 place-items-center text-brand-navy/35 transition-colors hover:text-brand-orange"
                      aria-label={`Remove ${l.name}`}
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between border-t-2 border-brand-navy bg-brand-surface px-5 py-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-brand-navy">
                    Estimated total
                  </div>
                  <p className="mt-0.5 text-[11px] text-brand-navy/55">
                    Indicative only. Your formal quote confirms the final figure.
                  </p>
                </div>
                <div className="text-xl font-black tabular-nums text-brand-navy">
                  {KSH.format(subtotal)}
                </div>
              </div>
            </div>
          )}

          {!hasCart && (
            <div className="flex items-start gap-3 rounded-xl border border-border bg-white p-5">
              <ShoppingCart className="mt-0.5 h-4 w-4 shrink-0 text-brand-navy/35" />
              <p className="text-sm text-brand-navy/65 leading-relaxed">
                Nothing configured yet. You can{" "}
                <Link to="/shop" className="font-bold text-brand-orange hover:underline">
                  browse the shop
                </Link>{" "}
                to configure exact products, or just describe what you need below and we will work
                from that.
              </p>
            </div>
          )}

          {/* The form */}
          <form
            onSubmit={handleSubmit}
            className="grid gap-5 rounded-xl border border-border bg-white p-6 md:p-8"
          >
            <h2 className="text-xs font-black uppercase tracking-widest text-brand-navy">
              Your details
            </h2>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name" required value={form.name} onChange={(v) => set("name", v)} placeholder="Your name" />
              <Field label="Company" value={form.company} onChange={(v) => set("company", v)} placeholder="Company name" />
              <Field label="Email" required type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="you@company.com" />
              <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} placeholder="+254 7.." />
            </div>

            {!hasCart && (
              <div className="grid gap-5 sm:grid-cols-2">
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
              <label htmlFor="q-message" className="mb-1.5 block text-sm font-medium text-brand-navy">
                {hasCart ? "Anything else we should know" : "Project details"}
              </label>
              <textarea
                id="q-message"
                rows={5}
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-navy"
                placeholder={
                  hasCart
                    ? "Delivery location, branding placement, anything specific about this job."
                    : "Sizes, colours, print method, delivery location."
                }
              />
            </div>

            {/* Artwork */}
            <div>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-brand-surface px-4 py-8 transition-colors hover:border-brand-orange">
                <Upload className="h-6 w-6 text-brand-orange" />
                <div className="text-sm font-bold text-brand-navy">
                  Upload artwork (PDF, PNG, AI, PSD)
                </div>
                <div className="text-xs text-brand-navy/50">Optional. Max 50MB per file.</div>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.ai,.psd,.eps,.svg"
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                  className="hidden"
                />
              </label>

              {files.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {files.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-md border border-border bg-white px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-xs font-medium text-brand-navy">
                        {f.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                        className="shrink-0 text-brand-navy/40 hover:text-brand-orange"
                        aria-label={`Remove ${f.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2.5 rounded-md border border-brand-orange bg-brand-orange/8 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                <span className="text-sm font-medium text-brand-navy">{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="inline-flex items-center justify-center gap-2 self-start rounded-md bg-brand-orange px-7 py-3.5 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "sending" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  Submit quote request <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <p className="flex items-start gap-2 text-xs leading-relaxed text-brand-navy/50">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-navy/35" />
              No payment is taken now. We price the job first and send you a formal quote to approve.
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
    <li className="flex gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-navy text-xs font-black text-white">
        {n}
      </div>
      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-brand-navy">
          <Icon className="h-3.5 w-3.5 text-brand-orange" />
          {title}
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-brand-navy/60">{body}</p>
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
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-brand-navy">
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
        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-navy"
      />
    </div>
  );
}