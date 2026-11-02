import { Clock, Mail, PhoneCall } from "lucide-react";

export function TopBar() {
  return (
    <div className="relative z-50 hidden bg-brand-navy text-sm font-semibold text-white lg:block">
      <div className="container-page grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 py-2">
        <a
          href="mailto:protocolpromotions@gmail.com"
          className="inline-flex min-w-0 max-w-full items-center gap-2 text-[11px] font-bold text-white transition hover:text-brand-orange sm:text-xs lg:justify-self-start"
        >
          <Mail className="h-4 w-4 shrink-0 text-brand-orange" strokeWidth={3} aria-hidden="true" />
          <span>protocolpromotions@gmail.com</span>
        </a>

        <div className="inline-flex max-w-full items-center justify-center gap-1.5 whitespace-nowrap text-center text-xs font-semibold text-white/85">
          <Clock className="h-3.5 w-3.5 shrink-0 text-brand-orange" aria-hidden="true" />
          <span>Monday to Friday: 8:00 AM to 6:00 PM · Saturday: 9:00 AM to 2:00 PM · Sunday: Closed</span>
        </div>

        <a
          href="tel:+254762446077"
          className="inline-flex items-center gap-2 text-[11px] font-bold text-white transition hover:text-brand-orange sm:text-xs lg:justify-self-end"
        >
          <PhoneCall className="h-4 w-4 shrink-0 text-brand-orange" strokeWidth={3} aria-hidden="true" />
          <span>+254 762 446 077</span>
        </a>
      </div>
    </div>
  );
}