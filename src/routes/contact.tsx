import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Mail, MapPin, Phone, Clock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact | Protocol Promotions" },
      { name: "description", content: "Get in touch. Call, WhatsApp, email or visit our Nairobi office." },
      { property: "og:title", content: "Contact | Protocol Promotions" },
      { property: "og:description", content: "We reply within one business day." },
    ],
  }),
  component: Contact,
});

// Update these to match actual opening hours. Shown to visitors and used to compute the live open/closed status below.
// Hours are in 24h format, evaluated in Africa/Nairobi time regardless of the visitor's own timezone.
const HOURS: { day: string; open: number | null; close: number | null }[] = [
  { day: "Monday", open: 8, close: 18 },
  { day: "Tuesday", open: 8, close: 18 },
  { day: "Wednesday", open: 8, close: 18 },
  { day: "Thursday", open: 8, close: 18 },
  { day: "Friday", open: 8, close: 18 },
  { day: "Saturday", open: 9, close: 14 },
  { day: "Sunday", open: null, close: null },
];

function useOpenStatus() {
  const nairobiNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
  const dayIndex = (nairobiNow.getDay() + 6) % 7; // Monday = 0
  const today = HOURS[dayIndex];
  const hour = nairobiNow.getHours() + nairobiNow.getMinutes() / 60;
  const isOpen = today.open !== null && today.close !== null && hour >= today.open && hour < today.close;
  return { isOpen, today };
}

function formatHour(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const hr12 = h % 12 === 0 ? 12 : h % 12;
  return `${hr12}:00 ${period}`;
}

type Today = { day: string; open: number | null; close: number | null };

// A prominent, large working-hours panel with an animated dotted background.
function WorkingHoursCard({ isOpen, today }: { isOpen: boolean; today: Today }) {
  const schedule = [
    { label: "Monday to Friday", value: "8:00 AM to 6:00 PM", closed: false },
    { label: "Saturday", value: "9:00 AM to 2:00 PM", closed: false },
    { label: "Sunday", value: "Closed", closed: true },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-brand-navy text-white">
      {/* Animated dotted background */}
      <style>{`
        @keyframes hoursDotsDrift {
          from { background-position: 0 0; }
          to   { background-position: 22px 22px; }
        }
        .hours-dots {
          background-image: radial-gradient(rgba(255,255,255,0.16) 1.5px, transparent 1.5px);
          background-size: 22px 22px;
          animation: hoursDotsDrift 6s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .hours-dots { animation: none; }
        }
      `}</style>
      <div className="hours-dots pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-white/10 text-white shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div className="text-lg font-extrabold tracking-tight">Working hours</div>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
              isOpen ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isOpen ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
            {isOpen ? "Open now" : "Closed now"}
          </span>
        </div>

        {/* Today, shown large */}
        <div className="mt-6 border-b border-white/15 pb-6">
          <div className="text-[11px] font-bold uppercase tracking-widest text-brand-orange">
            Today, {today.day}
          </div>
          <div className="mt-1.5 text-3xl md:text-4xl font-extrabold tracking-tight tabular-nums">
            {today.open !== null && today.close !== null
              ? `${formatHour(today.open)} to ${formatHour(today.close)}`
              : "Closed"}
          </div>
        </div>

        {/* Full week, clearly legible */}
        <dl className="mt-6 space-y-4">
          {schedule.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4">
              <dt className="text-base font-semibold text-white/80">{row.label}</dt>
              <dd className={`text-lg font-bold tabular-nums ${row.closed ? "text-white/40" : "text-white"}`}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function Contact() {
  const { isOpen, today } = useOpenStatus();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch("https://formsubmit.co/ajax/protocolpromotions@gmail.com", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data,
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <SiteLayout>
      <PageHeader eyebrow="Contact" title="Let's talk about your project" description="Reach us by phone, email or the form. We reply within one business day." />
      <section className="container-page py-14 md:py-20 grid lg:grid-cols-2 gap-10">
        <div className="space-y-4">
          {[
            { icon: MapPin, title: "Visit us", body: "Protocol Promotions Ltd., Nairobi, Kenya" },
            { icon: Phone, title: "Call us", body: "+254 762 446 077", href: "tel:+254762446077" },
            { icon: Mail, title: "Email us", body: "protocolpromotions@gmail.com", href: "mailto:protocolpromotions@gmail.com" },
          ].map((c) => (
            <div key={c.title} className="rounded-xl border border-border bg-white p-5 flex items-start gap-4">
              <div className="h-11 w-11 grid place-items-center rounded-lg bg-brand-navy/5 text-brand-navy shrink-0">
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-brand-navy">{c.title}</div>
                {c.href ? (
                  <a href={c.href} className="text-sm text-muted-foreground mt-0.5 block hover:text-brand-orange transition-colors">
                    {c.body}
                  </a>
                ) : (
                  <div className="text-sm text-muted-foreground mt-0.5">{c.body}</div>
                )}
              </div>
            </div>
          ))}

          <WorkingHoursCard isOpen={isOpen} today={today} />

          <div className="rounded-xl border border-border overflow-hidden">
            <iframe
              title="Protocol Promotions Ltd. location"
              src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d323.63734341647955!2d36.825604292318936!3d-1.2803791197739203!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f11a67bb07663%3A0x5b54221b99d2823f!2sProtocol%20Promotions%20Ltd.!5e1!3m2!1sen!2ske!4v1783805158362!5m2!1sen!2ske"
              width="100%"
              height="300"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="w-full block"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-white p-6 md:p-8 grid gap-4 self-start">
          {/* FormSubmit config fields, no backend required, delivers straight to protocolpromotions@gmail.com */}
          <input type="hidden" name="_subject" value="New enquiry from website contact form" />
          <input type="hidden" name="_captcha" value="false" />
          <input type="hidden" name="_template" value="table" />

          <div className="grid sm:grid-cols-2 gap-4">
            <input required name="name" placeholder="Your name" className="rounded-md border border-border px-3 py-2.5 text-sm" />
            <input required name="email" placeholder="Email" type="email" className="rounded-md border border-border px-3 py-2.5 text-sm" />
          </div>
          <input required name="subject" placeholder="Subject" className="rounded-md border border-border px-3 py-2.5 text-sm" />
          <textarea required name="message" rows={5} placeholder="Message" className="rounded-md border border-border px-3 py-2.5 text-sm" />

          <button
            type="submit"
            disabled={status === "sending"}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-orange px-6 py-3 text-sm font-semibold text-white hover:brightness-95 transition self-start disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
            {status === "sending" ? "Sending…" : "Send Message"}
          </button>

          {status === "sent" && (
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4" /> Message sent. We'll get back to you within one business day.
            </p>
          )}
          {status === "error" && (
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700">
              <AlertCircle className="h-4 w-4" /> Something went wrong. Please try again or email us directly.
            </p>
          )}
        </form>
      </section>
    </SiteLayout>
  );
}