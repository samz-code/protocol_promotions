import { useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Logo } from "@/components/site/Logo";
import { AlertCircle, Loader2 } from "lucide-react";

type RegisterSearchSchema = {
  redirect?: string;
};

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Account | Protocol Promotions" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): RegisterSearchSchema => {
    return {
      redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    };
  },
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/register" });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setAuthError("Please fill in your name, email, phone and password to create your account.");
      return;
    }

    if (password.length < 8) {
      setAuthError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setAuthError("Passwords do not match. Please re-enter them.");
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            company_name: companyName.trim() || null,
          },
        },
      });

      if (error) throw error;

      // If email confirmation is required on this Supabase project, signUp()
      // returns no active session. In that case we cannot send them straight
      // into a guarded route, so surface it rather than bouncing them again.
      if (!data.session) {
        setAuthError(
          "Account created. Please check your email to confirm your address, then sign in to continue."
        );
        setIsLoading(false);
        return;
      }

      navigate({ to: redirect || "/dashboard" });
    } catch (err: any) {
      console.error("Registration failure:", err.message);
      setAuthError(err.message || "We couldn't create your account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SiteLayout>
      <section className="container-page py-16 md:py-24 grid place-items-center">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-sm">
          <div className="flex justify-center">
            <Logo />
          </div>

          <h1 className="mt-6 text-2xl font-extrabold text-brand-navy text-center">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground text-center">
            {redirect === "/checkout"
              ? "Create an account to complete your order and track production."
              : "Place orders, request quotes and follow your jobs through production."}
          </p>

          {authError && (
            <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="fullName" className="mb-1.5 block text-sm font-semibold text-brand-navy">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                disabled={isLoading}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm font-medium text-brand-navy transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-50"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-brand-navy">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm font-medium text-brand-navy transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-50"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold text-brand-navy">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                required
                disabled={isLoading}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm font-medium text-brand-navy transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-50"
                placeholder="+254 7XX XXX XXX"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                We call or WhatsApp you to confirm artwork proofs and delivery.
              </p>
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="companyName" className="block text-sm font-semibold text-brand-navy">
                  Company or organisation
                </label>
                <span className="text-[11px] text-muted-foreground">Optional</span>
              </div>
              <input
                id="companyName"
                type="text"
                autoComplete="organization"
                disabled={isLoading}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm font-medium text-brand-navy transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-50"
                placeholder="School, church, club or business name"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Add this if you need it printed on invoices and quotes.
              </p>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-brand-navy">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm font-medium text-brand-navy transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-50"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-semibold text-brand-navy"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                disabled={isLoading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm font-medium text-brand-navy transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-50"
                placeholder="Re-enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-navy px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating your account...
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-border pt-4 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              search={{ redirect }}
              className="font-bold text-brand-blue hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}