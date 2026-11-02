import { useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { supabase } from "@/lib/supabase";
import { useCart, type CartLine } from "@/lib/cart";
import {
  Trash2, Plus, Minus, ArrowRight, ArrowLeft, ShoppingCart, FileText,
  Package, Paperclip,
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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-brand-navy sm:text-2xl">
            Cart ({count} {count === 1 ? "item" : "items"})
          </h1>
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-2 rounded-md bg-brand-orange px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-brand-orange/90"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear cart</span>
              <span className="sm:hidden">Clear</span>
            </button>
        </header>

        <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(19rem,1fr)] lg:gap-6">
          <div className="space-y-3">
            {lines.map((line) => (
              <CartRow
                key={line.lineId}
                line={line}
                thumbnail={thumbs?.get(line.productId) ?? null}
                onQty={(q) => setLineQty(line.lineId, q)}
                onRemove={() => removeLine(line.lineId)}
              />
            ))}
          </div>

          <div className="lg:sticky lg:top-8">
            <OrderSummary subtotal={subtotal} count={count} setupTotal={setupTotal} />
          </div>
        </div>
        <Link
          to="/shop"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-blue transition-colors hover:text-brand-navy"
        >
          <ArrowLeft className="h-4 w-4" /> Continue shopping
        </Link>
      </div>
    </SiteLayout>
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
    <article className="rounded-xl bg-slate-100 p-3 sm:p-4">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-md bg-white sm:h-20 sm:w-20">
          {thumbnail ? (
            <img src={thumbnail} alt={line.name} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <Package className="h-6 w-6 text-brand-navy/25" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-brand-navy sm:text-base">
              {line.name}
            </h3>
            {specs.length > 0 && (
              <p className="mt-1 truncate text-xs text-brand-navy/55">
                {specs.join(" · ")}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex h-9 items-center overflow-hidden rounded-full border border-brand-blue bg-white">
              <button
                type="button"
                onClick={() => onQty(line.quantity - 1)}
                disabled={line.quantity <= 1}
                className="grid h-9 w-9 place-items-center text-brand-navy transition-colors hover:bg-brand-blue/10 disabled:opacity-30"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
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
                className="h-9 w-10 border-x border-brand-blue/20 text-center text-sm font-semibold tabular-nums text-brand-navy outline-none"
                aria-label="Quantity"
              />
              <button
                type="button"
                onClick={() => onQty(line.quantity + 1)}
                className="grid h-9 w-9 place-items-center text-brand-navy transition-colors hover:bg-brand-blue/10"
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-1.5 px-1 py-1 text-xs font-medium text-brand-blue underline underline-offset-2 transition-colors hover:text-brand-orange"
              aria-label={`Remove ${line.name}`}
            >
              <Trash2 className="h-3.5 w-3.5 text-brand-orange" />
              Remove
            </button>
          </div>

          <div className="flex shrink-0 items-baseline gap-2 sm:block sm:text-right">
            {line.setupFee > 0 && (
              <span className="text-xs text-brand-navy/50">
                Incl. {kes(line.setupFee)} setup
              </span>
            )}
            <span className="text-base font-bold tabular-nums text-brand-navy sm:text-lg">
              {kes(line.totalCost)}
            </span>
          </div>
        </div>
      </div>
      {(artworkUrl || customBranding) && (
        <div className="mt-2 flex flex-wrap gap-2 pl-19 text-[11px] text-brand-navy/55 sm:pl-24">
          {artworkUrl && <span className="inline-flex items-center gap-1"><Paperclip className="h-3 w-3" /> Artwork attached</span>}
          {customBranding && <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" /> Custom branding</span>}
        </div>
      )}
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
    <div className="rounded-xl bg-brand-blue/10 p-4 sm:p-5">
      <h2 className="text-base font-bold text-brand-navy">
        Order summary
      </h2>

      <div className="mt-4 space-y-3 text-sm text-brand-navy/75">
        <div className="flex justify-between gap-4">
          <span>Items ({count})</span>
          <span className="font-semibold tabular-nums text-brand-navy">{kes(goods)}</span>
        </div>
        {setupTotal > 0 && (
          <div className="flex justify-between gap-4">
            <span>Setup</span>
            <span className="font-semibold tabular-nums text-brand-navy">{kes(setupTotal)}</span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span>Delivery</span>
          <span className="text-right font-medium text-brand-navy/60">Quoted separately</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-brand-navy/15 pt-4">
        <span className="font-semibold text-brand-navy">Total</span>
        <span className="text-xl font-bold tabular-nums text-brand-navy">{kes(subtotal)}</span>
      </div>

      <div className="mt-5 space-y-2.5">
        <button
          type="button"
          onClick={() => navigate({ to: "/checkout" })}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-orange px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange/90"
        >
          Continue to checkout <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: "/request-quote" })}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-brand-blue bg-white px-5 py-3 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blue hover:text-white"
        >
          <FileText className="h-4 w-4" /> Request a quote
        </button>
      </div>
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