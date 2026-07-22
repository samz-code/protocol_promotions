import { useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Logo } from "@/components/site/Logo";
import { AlertCircle, Loader2 } from "lucide-react";

type LoginSearchSchema = {
  redirect?: string;
};

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — Protocol Promotions" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): LoginSearchSchema => {
    return {
      redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    };
  },
  component: Login,
});

/** Resolves where a freshly authenticated user should land, based on their role. */
async function resolveLandingRoute(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Could not read role for redirect:", error.message);
    return "/dashboard";
  }

  const role = data?.role;
  if (role === "staff" || role === "admin") return "/admin";
  return "/dashboard";
}

function Login() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/login" });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError("Please provide both your email and account password.");
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      // Where should they land?
      //
      // A redirect wins when it points somewhere specific, e.g. they were
      // bounced from /checkout or a particular admin page. But a bare
      // redirect to /dashboard is just the client guard doing its job, and
      // must not drag a staff member away from the control room.
      const roleTarget = data.user ? await resolveLandingRoute(data.user.id) : "/dashboard";
      const isGenericRedirect = !redirect || redirect === "/dashboard";
      const target = isGenericRedirect ? roleTarget : redirect;

      navigate({ to: target });
    } catch (err: any) {
      console.error("Authentication failure:", err.message);
      setAuthError(err.message || "Invalid credentials. Please verify your entries and try again.");
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

          <h1 className="mt-6 text-2xl font-extrabold text-brand-navy text-center">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground text-center">
            Sign in to manage orders, quotes and artwork.
          </p>

          {authError && (
            <div className="mt-5 flex items-start gap-2.5 text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
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

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-sm font-semibold text-brand-navy">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-brand-blue hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm font-medium text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-50 transition-shadow"
                placeholder="••••••••"
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
                  Verifying account credentials...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-border text-xs text-center text-muted-foreground">
            Don't have an account yet?{" "}
            <Link to="/register" className="text-brand-blue font-bold hover:underline">
              Create business account
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}