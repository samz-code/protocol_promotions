import { useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { supabase } from "@/lib/supabase";
import { useCart, type CartLine } from "@/lib/cart";
import {
  Trash2, Plus, Minus, ArrowRight, ArrowLeft, ShoppingCart, FileText,
  ShieldCheck, LogIn, Package, Paperclip, Truck, Clock,
} from "lucide-react";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart | Protocol Promotions" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

const KSH = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function kes(n: number) {
  return KSH.format(Number(n) || 0);
}

/** Cart lines only store a product id, so thumbnails are fetched here.
 *  Seeing the product is the difference between trusting the cart and
 *  going back to check you picked the right thing. */
async function fetchThumbnails(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();

  const { data, error } = await supabase
    .from("products")
    .select("id, images, lead_time")
    .in("id", ids);

  const map = new Map<string, string>();
  if (error || !data) return map;

  for (const p of data as any[]) {
    const first = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null;
    if (typeof first === "string" && first) map.set(p.id, first);
  }
  return map;
}

function CartPage() {
  const { lines, count, subtotal, removeLine, setLineQty, clear } = useCart();

  const productIds = useMemo(
    () => Array.from(new Set(lines.map((l) => l.productId).filter(Boolean))),
    [lines]
  );

  const { data: thumbs } = useQuery({
    queryKey: ["cart-thumbnails", productIds.join(",")],
    queryFn: () => fetchThumbnails(productIds),
    enabled: productIds.length > 0,
  });

  if (lines.length === 0) {
    return (
      <SiteLayout>
        <EmptyCart />
      </SiteLayout>
    );
  }

  const setupTotal = lines.reduce((sum, l) => sum + (l.setupFee || 0), 0);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        {/* Header */}
        <header className="border-b-2 border-brand-navy pb-5 sm:pb-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black uppercase leading-none tracking-tight text-brand-navy sm:text-3xl md:text-4xl">
                Your Cart
              </h1>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-brand-navy/50 sm:text-xs">
                {count} {count === 1 ? "unit" : "units"} across {lines.length}{" "}
                {lines.length === 1 ? "line" : "lines"}
              </p>
            </div>
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-2 border-2 border-brand-navy px-3 py-2 text-[11px] font-black uppercase tracking-wider text-brand-navy transition-colors hover:border-brand-orange hover:text-brand-orange sm:px-4 sm:py-2.5 sm:text-xs"
            >
              <Trash2 className="h-3.5 w-3.5 stroke-3" />
              <span className="hidden sm:inline">Clear cart</span>
              <span className="sm:hidden">Clear</span>
            </button>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 items-start gap-6 sm:mt-8 lg:grid-cols-12 lg:gap-10 xl:gap-12">
          {/* Lines */}
          <div className="space-y-3 sm:space-y-4 lg:col-span-8">
            {lines.map((line) => (
              <CartRow
                key={line.lineId}
                line={line}
                thumbnail={thumbs?.get(line.productId) ?? null}
                onQty={(q) => setLineQty(line.lineId, q)}
                onRemove={() => removeLine(line.lineId)}
              />
            ))}

            <Link
              to="/shop"
              className="inline-flex items-center gap-2 pt-2 text-[11px] font-black uppercase tracking-widest text-brand-navy/60 transition-colors hover:text-brand-orange sm:text-xs"
            >
              <ArrowLeft className="h-4 w-4 stroke-3" /> Continue shopping
            </Link>
          </div>

          {/* Summary */}
          <div className="lg:col-span-4 lg:sticky lg:top-8">
            <OrderSummary subtotal={subtotal} count={count} setupTotal={setupTotal} />
          </div>
        </div>
      </div>

      {/* Mobile sticky action bar, so the total and next step are always reachable */}
      <div className="sticky bottom-0 z-30 border-t-2 border-brand-navy bg-white px-4 py-3 shadow-[0_-4px_16px_-6px_rgba(30,41,89,0.25)] lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-brand-navy/50">
              Estimate
            </div>
            <div className="text-lg font-black tabular-nums leading-tight text-brand-navy">
              {kes(subtotal)}
            </div>
          </div>
          <MobileActions />
        </div>
      </div>
    </SiteLayout>
  );
}

function MobileActions() {
  const navigate = useNavigate();
  return (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        onClick={() => navigate({ to: "/request-quote" })}
        className="border-2 border-brand-navy px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-brand-navy"
      >
        Quote
      </button>
      <button
        type="button"
        onClick={() => navigate({ to: "/checkout" })}
        className="inline-flex items-center gap-1.5 border-2 border-brand-navy bg-brand-navy px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white"
      >
        Order <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function CartRow({
  line, thumbnail, onQty, onRemove,
}: {
  line: CartLine;
  thumbnail: string | null;
  onQty: (quantity: number) => void;
  onRemove: () => void;
}) {
  const { color, size, printMethod, artworkUrl, customBranding } = line.configuration;
  const specs = [color, size, printMethod].filter(Boolean);

  return (
    <article className="border-2 border-brand-navy bg-white shadow-[4px_4px_0_0_var(--color-brand-navy)]">
      <div className="flex gap-3 p-4 sm:gap-4 sm:p-5">
        {/* Thumbnail, so the line is recognisable at a glance */}
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden border-2 border-brand-navy/12 bg-brand-surface sm:h-20 sm:w-20">
          {thumbnail ? (
            <img src={thumbnail} alt={line.name} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <Package className="h-6 w-6 text-brand-navy/20" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-black uppercase leading-snug tracking-wide text-brand-navy">
              {line.name}
            </h3>
            <button
              type="button"
              onClick={onRemove}
              className="grid h-8 w-8 shrink-0 place-items-center border-2 border-brand-navy text-brand-navy transition-colors hover:border-brand-orange hover:text-brand-orange sm:h-9 sm:w-9"
              aria-label={`Remove ${line.name}`}
              title="Remove line"
            >
              <Trash2 className="h-3.5 w-3.5 stroke-3 sm:h-4 sm:w-4" />
            </button>
          </div>

          {specs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {specs.map((s, i) => (
                <span
                  key={`${s}-${i}`}
                  className="inline-block border border-brand-navy/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-navy/70"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Signals that reassure: artwork attached, custom work flagged */}
          {(artworkUrl || customBranding) && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {artworkUrl && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-orange">
                  <Paperclip className="h-3 w-3" /> Artwork attached
                </span>
              )}
              {customBranding && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-navy/55">
                  <FileText className="h-3 w-3" /> Custom branding requested
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quantity and money */}
      <div className="flex flex-col gap-4 border-t-2 border-brand-navy/10 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
        <div>
          <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-brand-navy/50">
            Quantity
          </div>
          <div className="inline-flex items-center border-2 border-brand-navy bg-white">
            <button
              type="button"
              onClick={() => onQty(line.quantity - 1)}
              disabled={line.quantity <= 1}
              className="grid h-11 w-11 place-items-center border-r-2 border-brand-navy text-brand-navy transition-colors hover:bg-brand-surface disabled:opacity-30 sm:h-10 sm:w-10"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4 stroke-3" />
            </button>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={line.quantity}
              onChange={(e) => {
                const next = Number(e.target.value);
                onQty(Number.isNaN(next) ? 1 : next);
              }}
              className="h-11 w-16 text-center text-sm font-black tabular-nums uppercase tracking-wide text-brand-navy outline-none sm:h-10 sm:text-xs"
            />
            <button
              type="button"
              onClick={() => onQty(line.quantity + 1)}
              className="grid h-11 w-11 place-items-center border-l-2 border-brand-navy text-brand-navy transition-colors hover:bg-brand-surface sm:h-10 sm:w-10"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4 stroke-3" />
            </button>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 sm:block sm:text-right">
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wider tabular-nums text-brand-navy/50">
              {kes(line.baseUnitPrice)} each
            </div>
            {line.setupFee > 0 && (
              <div className="text-[10px] font-bold uppercase tracking-wider tabular-nums text-brand-navy/50">
                plus {kes(line.setupFee)} setup
              </div>
            )}
          </div>
          <div className="text-xl font-black tabular-nums text-brand-navy sm:mt-1 sm:text-2xl">
            {kes(line.totalCost)}
          </div>
        </div>
      </div>
    </article>
  );
}

function OrderSummary({
  subtotal, count, setupTotal,
}: {
  subtotal: number;
  count: number;
  setupTotal: number;
}) {
  const navigate = useNavigate();
  const goods = subtotal - setupTotal;

  return (
    <div className="border-2 border-brand-navy bg-white p-5 shadow-[6px_6px_0_0_var(--color-brand-navy)] sm:p-6">
      <h2 className="border-b-2 border-brand-navy/10 pb-4 text-sm font-black uppercase tracking-widest text-brand-navy">
        Order Summary
      </h2>

      <div className="mt-4 space-y-3 text-[11px] font-bold uppercase tracking-wider text-brand-navy/70 sm:text-xs">
        <div className="flex justify-between gap-4">
          <span>Items</span>
          <span className="font-black tabular-nums text-brand-navy">{count}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Goods</span>
          <span className="font-black tabular-nums text-brand-navy">{kes(goods)}</span>
        </div>
        {setupTotal > 0 && (
          <div className="flex justify-between gap-4">
            <span>Artwork setup</span>
            <span className="font-black tabular-nums text-brand-navy">{kes(setupTotal)}</span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span>Delivery</span>
          <span className="font-black text-brand-navy/50">Quoted separately</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t-2 border-brand-navy/10 pt-4">
        <span className="text-xs font-black uppercase tracking-widest text-brand-navy">
          Estimate
        </span>
        <span className="text-2xl font-black tabular-nums text-brand-navy">{kes(subtotal)}</span>
      </div>

      {/* Two ways forward. Order now if the estimate works, or have us price it first. */}
      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/checkout" })}
          className="flex w-full items-center justify-center gap-2 border-2 border-brand-navy bg-brand-navy px-6 py-4 text-xs font-black uppercase tracking-widest text-white shadow-[4px_4px_0_0_var(--color-brand-orange)] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          Place this order <ArrowRight className="h-4 w-4" />
        </button>
        <p className="flex items-start gap-2 text-[11px] font-medium leading-relaxed text-brand-navy/55">
          <LogIn className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-navy/40" />
          <span>
            Sign in required, so you can track production and reorder later. Payment is arranged
            once we confirm the order.
          </span>
        </p>

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-brand-navy/12" />
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-navy/35">
            or
          </span>
          <span className="h-px flex-1 bg-brand-navy/12" />
        </div>

        <button
          type="button"
          onClick={() => navigate({ to: "/request-quote" })}
          className="flex w-full items-center justify-center gap-2 border-2 border-brand-navy bg-white px-6 py-4 text-xs font-black uppercase tracking-widest text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
        >
          <FileText className="h-4 w-4" /> Request a formal quote
        </button>
        <p className="flex items-start gap-2 text-[11px] font-medium leading-relaxed text-brand-navy/55">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-orange" />
          <span>
            No account needed. We price the job against your artwork and quantity, then send an
            itemised quote. Best for custom work, large volumes or if you need an invoice for
            approval.
          </span>
        </p>
      </div>

      {/* Quiet reassurance, the things people worry about before committing */}
      <ul className="mt-6 space-y-2.5 border-t-2 border-brand-navy/10 pt-4">
        <li className="flex items-start gap-2.5 text-[11px] font-medium leading-relaxed text-brand-navy/60">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-navy/35" />
          Nothing is printed until you approve a proof
        </li>
        <li className="flex items-start gap-2.5 text-[11px] font-medium leading-relaxed text-brand-navy/60">
          <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-navy/35" />
          Delivery across Kenya, confirmed on your quote
        </li>
        <li className="flex items-start gap-2.5 text-[11px] font-medium leading-relaxed text-brand-navy/60">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-navy/35" />
          Most orders move within one business day
        </li>
      </ul>

      <p className="mt-4 border-t-2 border-brand-navy/10 pt-4 text-[11px] font-medium leading-relaxed text-brand-navy/55">
        The figure above is a production estimate. Delivery and any artwork setup are confirmed
        before you pay.
      </p>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
      <div className="max-w-md">
        <div className="grid h-14 w-14 place-items-center border-2 border-brand-navy bg-white shadow-[4px_4px_0_0_var(--color-brand-orange)] sm:h-16 sm:w-16">
          <ShoppingCart className="h-6 w-6 stroke-3 text-brand-navy sm:h-7 sm:w-7" />
        </div>
        <h1 className="mt-6 text-3xl font-black uppercase leading-none tracking-tight text-brand-navy sm:mt-8 sm:text-4xl">
          Your cart is empty
        </h1>
        <p className="mt-4 text-sm font-medium leading-relaxed text-brand-navy/70 sm:mt-5">
          Configure a product in the catalogue and it lands here, ready to turn into an order or a
          quote. Nothing has been added yet.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
          <Link
            to="/shop"
            className="inline-flex w-full items-center justify-center gap-2 border-2 border-brand-navy bg-brand-navy px-7 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-[4px_4px_0_0_var(--color-brand-orange)] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none sm:w-auto"
          >
            Browse catalogue <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/request-quote"
            className="inline-flex w-full items-center justify-center gap-2 border-2 border-brand-navy px-7 py-3.5 text-xs font-black uppercase tracking-widest text-brand-navy transition-colors hover:border-brand-orange hover:text-brand-orange sm:w-auto"
          >
            Request a quote
          </Link>
        </div>
      </div>
    </div>
  );
}