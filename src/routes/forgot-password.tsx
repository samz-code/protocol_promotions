import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Logo } from "@/components/site/Logo";
import { AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password | Protocol Promotions" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Enter the email on the account.");
      return;
    }

    setIsLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      setSent(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not send the reset link. Try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SiteLayout>
      <section className="container-page py-16 md:py-24 grid place-items-center">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-sm">
          <div className="flex justify-center">
            <Logo />
          </div>

          {sent ? (
            <div className="text-center">
              <div className="mx-auto mt-6 grid h-14 w-14 place-items-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h1 className="mt-6 text-2xl font-extrabold text-brand-navy">Link sent</h1>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                If an account exists for <span className="font-semibold text-brand-navy">{email}</span>,
                a reset link is on its way. It expires in an hour, so use it soon.
              </p>
              <Link
                to="/login"
                className="mt-7 inline-flex items-center justify-center gap-2 rounded-md bg-brand-navy px-6 py-3 text-sm font-semibold text-white hover:brightness-110 transition-all"
              >
                Back to sign in <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mt-6 text-2xl font-extrabold text-brand-navy text-center">Locked out?</h1>
              <p className="mt-1 text-sm text-muted-foreground text-center">
                Give us the email on the account and we'll send a link to set a new password.
              </p>

              {error && (
                <div className="mt-5 flex items-start gap-2.5 text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-brand-navy mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={isLoading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm font-medium text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-50 transition-shadow"
                    placeholder="name@corporate.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-navy px-4 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50 transition-all shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send reset link <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-border text-xs text-center text-muted-foreground">
                Remembered it?{" "}
                <Link to="/login" className="text-brand-blue font-bold hover:underline">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}