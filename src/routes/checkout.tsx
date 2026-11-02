import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { supabase } from "@/lib/supabase";
import { formatKes } from "@/components/shop/ProductConfigurator";
import { QuickAdd, useNewestProducts } from "@/components/site/storefront";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Protocol Promotions" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function generateOrderNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PP-${y}${m}${d}-${rand}`;
}

function CheckoutPage() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const { lines, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const {
    data: recommendedProducts = [],
    isLoading: recommendationsLoading,
    isError: recommendationsError,
  } = useNewestProducts(12);
  const frequentlyPurchased = [...recommendedProducts]
    .sort((a, b) => Number(b.tag === "Bestseller") - Number(a.tag === "Bestseller"))
    .slice(0, 4);

  // Guard: anonymous visitors get bounced to login, with a way back here.
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login", search: { redirect: "/checkout" }, replace: true });
    }
  }, [authLoading, user, navigate]);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [company, setCompany] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);

  // Prefill from the signed-in profile once it's available.
  useEffect(() => {
    if (profile) {
      setCustomerName((v) => v || profile.full_name || "");
      setCustomerEmail((v) => v || profile.email || "");
      setCustomerPhone((v) => v || profile.phone || "");
      setCompany((v) => v || profile.company || "");
    } else if (user?.email) {
      setCustomerEmail((v) => v || user.email || "");
    }
  }, [profile, user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    if (!customerName || !customerEmail || !deliveryAddress || !deliveryCity) {
      setFormError("Please fill in your name, email, and delivery address and city.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const orderNumber = generateOrderNumber();

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: user.id,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone || null,
          company: company || null,
          delivery_address: deliveryAddress,
          delivery_city: deliveryCity,
          delivery_notes: deliveryNotes || null,
          subtotal,
          delivery_fee: 0,
          total: subtotal,
          currency: "KES",
          status: "pending",
          payment_status: "unpaid",
        })
        .select("id, order_number")
        .single();

      if (orderErr) throw orderErr;

      const itemRows = lines.map((line) => ({
        order_id: order.id,
        product_id: line.productId || null,
        product_name: line.name,
        quantity: line.quantity,
        unit_price: line.baseUnitPrice,
        line_total: line.totalCost,
        selected_color: line.configuration.color || null,
        selected_size: line.configuration.size || null,
        print_method: line.configuration.printMethod || null,
        artwork_url: line.configuration.artworkUrl || null,
      }));

      if (itemRows.length > 0) {
        const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
        if (itemsErr) throw itemsErr;
      }

      clear();
      setPlacedOrderNumber(order.order_number);
    } catch (err: any) {
      console.error("Order placement failed:", err.message);
      setFormError(err.message || "Could not place your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Still resolving auth state, or about to redirect — avoid flashing the form.
  if (authLoading || !user) {
    return (
      <SiteLayout>
        <div className="min-h-[50vh] grid place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-brand-navy/40" />
        </div>
      </SiteLayout>
    );
  }

  // Order placed successfully.
  if (placedOrderNumber) {
    return (
      <SiteLayout>
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-20 lg:py-28 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-brand-navy">Order placed</h1>
          <p className="mt-3 text-sm text-brand-navy/60 leading-relaxed">
            Your order <span className="font-semibold text-brand-navy">{placedOrderNumber}</span> has
            been received. We'll confirm delivery timing and any artwork proofs before production starts.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-md bg-brand-navy px-6 py-3 text-sm font-semibold text-white hover:brightness-110 transition-all"
            >
              Track your order <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-semibold text-brand-navy hover:border-brand-navy transition-colors"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  // Nothing to check out.
  if (lines.length === 0) {
    return (
      <SiteLayout>
        <div className="max-w-md mx-auto px-4 sm:px-6 py-20 lg:py-28 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-surface">
            <ShoppingCart className="h-6 w-6 text-brand-navy/50" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-brand-navy">Your cart is empty</h1>
          <p className="mt-3 text-sm text-brand-navy/60">
            Add something from the catalogue before checking out.
          </p>
          <Link
            to="/shop"
            className="mt-7 inline-flex items-center gap-2 rounded-md bg-brand-navy px-6 py-3 text-sm font-semibold text-white hover:brightness-110 transition-all"
          >
            Browse catalogue <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <header>
          <h1 className="text-2xl font-bold text-brand-navy sm:text-3xl">Checkout</h1>
        </header>

        <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(19rem,1fr)] lg:gap-6">
          <form id="checkout-form" onSubmit={handleSubmit} className="rounded-xl border border-border bg-white p-4 sm:p-6">
            {formError && (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <h2 className="text-lg font-semibold text-brand-navy">Contact and delivery details</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name" value={customerName} onChange={setCustomerName} required autoComplete="name" />
              <Field label="Email" type="email" value={customerEmail} onChange={setCustomerEmail} required autoComplete="email" />
              <Field label="Phone" value={customerPhone} onChange={setCustomerPhone} autoComplete="tel" placeholder="+254 7XX XXX XXX" />
              <Field label="Company" value={company} onChange={setCompany} autoComplete="organization" />
              <div className="sm:col-span-2">
                <Field label="Delivery address" value={deliveryAddress} onChange={setDeliveryAddress} required autoComplete="street-address" />
              </div>
              <Field label="City / Town" value={deliveryCity} onChange={setDeliveryCity} required autoComplete="address-level2" />
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-brand-navy">Delivery notes (optional)</label>
                <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-blue transition-shadow"
                  placeholder="Landmark or delivery instructions"
                />
              </div>
            </div>
          </form>

          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-xl bg-brand-blue/10 p-4 sm:p-5">
              <h2 className="text-base font-bold text-brand-navy">Order summary</h2>

              <div className="mt-3 divide-y divide-brand-navy/10">
                {lines.map((line) => (
                  <div key={line.lineId} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium leading-snug text-brand-navy">{line.name}</div>
                      <div className="mt-1 text-xs text-brand-navy/55">Qty {line.quantity}</div>
                    </div>
                    <div className="shrink-0 font-semibold tabular-nums text-brand-navy">
                      {formatKes(line.totalCost)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-1 space-y-2.5 border-t border-brand-navy/15 pt-4 text-sm">
                <div className="flex justify-between gap-3 text-brand-navy/65">
                  <span>Subtotal (incl. setup)</span>
                  <span className="tabular-nums">{formatKes(subtotal)}</span>
                </div>
                <div className="flex justify-between gap-3 text-brand-navy/65">
                  <span>Delivery</span>
                  <span className="text-right">Quoted separately</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-brand-navy/15 pt-4">
                <span className="font-semibold text-brand-navy">Total</span>
                <span className="text-xl font-bold tabular-nums text-brand-navy">{formatKes(subtotal)}</span>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={submitting}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-brand-orange px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Placing order...
                  </>
                ) : (
                  <>Place order <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </div>
          </div>
        </div>

        <section className="mt-8 border-t border-border pt-6 sm:mt-10 sm:pt-8" aria-labelledby="frequently-purchased-title">
          <h2 id="frequently-purchased-title" className="text-xl font-bold text-brand-navy sm:text-2xl">
            Frequently purchased
          </h2>
          {recommendationsLoading ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4" aria-label="Loading product recommendations">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="aspect-square animate-pulse rounded-xl bg-brand-surface" />
              ))}
            </div>
          ) : recommendationsError ? (
            <p className="mt-3 text-sm text-brand-navy/60">Products are unavailable right now.</p>
          ) : frequentlyPurchased.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {frequentlyPurchased.map((product) => (
                <article key={product.id} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-white">
                  <Link
                    to="/shop/$slug"
                    params={{ slug: product.slug }}
                    className="block aspect-square overflow-hidden bg-brand-surface"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="h-full w-full object-contain p-3"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col p-3">
                    <Link
                      to="/shop/$slug"
                      params={{ slug: product.slug }}
                      className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug text-brand-navy hover:text-brand-orange"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-2 text-sm font-bold tabular-nums text-brand-navy">
                      {formatKes(product.price)}
                    </p>
                    <QuickAdd product={product} solid className="mt-3 w-full px-2 text-xs sm:text-sm" />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-brand-navy/60">No products are available right now.</p>
          )}
        </section>
      </div>
    </SiteLayout>
  );
}

function Field({
  label, value, onChange, type = "text", required = false, autoComplete, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-brand-navy mb-1.5">{label}</label>
      <input
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-blue transition-shadow"
      />
    </div>
  );
}