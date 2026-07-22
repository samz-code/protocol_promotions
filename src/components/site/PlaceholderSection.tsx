import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export function ContentCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white p-6 md:p-8">{children}</div>
  );
}

export function InlineCTA({ href, label }: { href: string; label: string }) {
  return (
    <Link
      to={href}
      className="inline-flex items-center gap-2 rounded-md bg-brand-orange px-5 py-3 text-sm font-semibold text-white hover:brightness-95 transition"
    >
      {label} <ArrowRight className="h-4 w-4" />
    </Link>
  );
}