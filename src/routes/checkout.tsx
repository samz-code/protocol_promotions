import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { supabase } from "@/lib/supabase";
import { formatKes } from "@/components/shop/ProductConfigurator";
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">Checkout</h1>
        <p className="mt-1 text-sm text-brand-navy/60">
          Confirm your details and delivery address. Payment is arranged after we confirm your order.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-8">
          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
            {formError && (
              <div className="flex items-start gap-2.5 text-sm text-red-600 bg-red-50 p-3.5 rounded-lg border border-red-100">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div className="rounded-lg border border-border p-5 space-y-4">
              <h2 className="font-semibold text-brand-navy">Your details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full name" value={customerName} onChange={setCustomerName} required autoComplete="name" />
                <Field label="Email" type="email" value={customerEmail} onChange={setCustomerEmail} required autoComplete="email" />
                <Field label="Phone" value={customerPhone} onChange={setCustomerPhone} autoComplete="tel" placeholder="+254 7XX XXX XXX" />
                <Field label="Company" value={company} onChange={setCompany} autoComplete="organization" />
              </div>
            </div>

            <div className="rounded-lg border border-border p-5 space-y-4">
              <h2 className="font-semibold text-brand-navy">Delivery</h2>
              <Field label="Delivery address" value={deliveryAddress} onChange={setDeliveryAddress} required autoComplete="street-address" />
              <Field label="City / Town" value={deliveryCity} onChange={setDeliveryCity} required autoComplete="address-level2" />
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-1.5">Delivery notes (optional)</label>
                <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-blue transition-shadow"
                  placeholder="Gate code, landmark, preferred delivery time, etc."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-brand-navy text-white px-6 py-3.5 text-sm font-semibold hover:brightness-110 disabled:opacity-60 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Placing order...
                </>
              ) : (
                <>Place order <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          {/* Summary */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-lg border border-border bg-brand-surface p-6">
              <h2 className="font-semibold text-brand-navy">Order Summary</h2>

              <div className="mt-4 divide-y divide-border">
                {lines.map((line) => (
                  <div key={line.lineId} className="py-3 flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium text-brand-navy truncate">{line.name}</div>
                      <div className="text-brand-navy/50">Qty {line.quantity}</div>
                    </div>
                    <div className="font-semibold text-brand-navy tabular-nums shrink-0">
                      {formatKes(line.totalCost)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 space-y-2.5 text-sm border-t border-border pt-4">
                <div className="flex justify-between text-brand-navy/60">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatKes(subtotal)}</span>
                </div>
                <div className="flex justify-between text-brand-navy/60">
                  <span>Delivery</span>
                  <span>Confirmed separately</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="font-semibold text-brand-navy">Total</span>
                <span className="text-xl font-bold text-brand-navy tabular-nums">{formatKes(subtotal)}</span>
              </div>
            </div>
          </div>
        </div>
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