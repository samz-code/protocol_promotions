import { useState, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import type { Product, PriceTier } from "@/routes/shop_.$slug";
import {
  Minus, Plus, ShoppingCart, ArrowRight, Layers, UploadCloud, Check, AlertCircle, X,
} from "lucide-react";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

const KSH = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

export const formatKes = (val: number) => KSH.format(val);

type ConfiguratorProps = {
  product: Product;
  tiers: PriceTier[];
  /** Setup fee per print method, loaded from the DB (setup_fees table). */
  setupFees: Record<string, number>;
  onAddToCart?: (payload: CartPayload) => void;
};

export type CartPayload = {
  productId: string;
  name: string;
  quantity: number;
  baseUnitPrice: number;
  setupFee: number;
  totalCost: number;
  configuration: {
    color: string;
    size: string;
    printMethod: string;
    artworkUrl: string | null;
    customBranding: boolean;
  };
};

export function ProductConfigurator({ product, tiers, setupFees, onAddToCart }: ConfiguratorProps) {
  const [qty, setQty] = useState<number>(product.moq);
  const [color, setColor] = useState<string>(product.colors[0] ?? "");
  const [size, setSize] = useState<string>(product.sizes[0] ?? "");
  const [method, setMethod] = useState<string>(product.print_methods[0] ?? "");

  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [customBranding, setCustomBranding] = useState<boolean>(false);
  const [justAdded, setJustAdded] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const unitPrice = useMemo(() => {
    if (tiers.length === 0) return product.price;
    const applicable = tiers.filter((t) => qty >= t.min_qty);
    if (applicable.length === 0) return product.price;
    return applicable[applicable.length - 1].unit_price;
  }, [qty, tiers, product.price]);

  const setupFee = useMemo(() => setupFees[method] ?? 0, [method, setupFees]);
  const subtotal = unitPrice * qty;
  const lineTotal = subtotal + setupFee;
  const onSale = product.compare_at_price !== null && product.compare_at_price > product.price;
  const savings = onSale ? product.compare_at_price! - product.price : 0;
  const nextTier = useMemo(() => tiers.find((t) => t.min_qty > qty) ?? null, [qty, tiers]);

  const touch = () => setJustAdded(false);
  const handleBump = (delta: number) => { setQty((q) => Math.max(product.moq, q + delta)); touch(); };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError("File is over the 15MB limit. Upload an optimized export.");
      return;
    }
    setArtworkFile(file);
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${product.id}-${Date.now()}.${fileExt}`;
      const filePath = `user-uploads/${fileName}`;
      const { error: err } = await supabase.storage.from("artworks").upload(filePath, file);
      if (err) throw err;
      const { data } = supabase.storage.from("artworks").getPublicUrl(filePath);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("Could not resolve public asset path");
      setArtworkUrl(publicUrl);
    } catch (err) {
      console.error("Artwork upload failed:", err);
      setUploadError("Upload failed. Try again, or attach the file to your quote.");
      setArtworkFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setArtworkFile(null);
    setArtworkUrl(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddToCart = () => {
    const payload: CartPayload = {
      productId: product.id,
      name: product.name,
      quantity: qty,
      baseUnitPrice: unitPrice,
      setupFee,
      totalCost: lineTotal,
      configuration: { color, size, printMethod: method, artworkUrl, customBranding },
    };
    if (onAddToCart) onAddToCart(payload);
    setJustAdded(true);
  };

  return (
    <div className="mt-6 space-y-6">
      {product.colors.length > 0 && (
        <OptionRow label="Colour" options={product.colors} value={color} onChange={(v) => { setColor(v); touch(); }} />
      )}
      {product.sizes.length > 0 && (
        <OptionRow label="Size" options={product.sizes} value={size} onChange={(v) => { setSize(v); touch(); }} />
      )}

      {product.print_methods.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-brand-navy mb-2.5">Print method</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {product.print_methods.map((opt) => {
              const isSelected = opt === method;
              const buttonTheme = isSelected
                ? "border-brand-navy bg-brand-navy text-white"
                : "border-border hover:border-brand-navy/40 bg-white text-brand-navy";
              const labelTheme = isSelected ? "text-white/70" : "text-brand-navy/50";
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { setMethod(opt); touch(); }}
                  className={`w-full text-left rounded-md px-4 py-3 border transition-colors ${buttonTheme}`}
                >
                  <span className="text-sm font-medium block truncate">{opt}</span>
                  <span className={`text-xs block mt-0.5 ${labelTheme}`}>
                    {(setupFees[opt] ?? 0) > 0 ? `+ ${KSH.format(setupFees[opt])} setup` : "Free setup"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="text-sm font-semibold text-brand-navy mb-2.5">Quantity</div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="inline-flex items-center rounded-md border border-border shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleBump(-1)}
              disabled={qty <= product.moq}
              className="grid h-10 w-10 place-items-center text-brand-navy hover:bg-brand-surface disabled:opacity-30 transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
              type="number"
              value={qty}
              min={product.moq}
              onChange={(e) => {
                const next = Number(e.target.value);
                setQty(Number.isNaN(next) ? product.moq : Math.max(product.moq, next));
                touch();
              }}
              className="h-10 w-16 text-center text-sm font-medium text-brand-navy outline-none tabular-nums"
              aria-label="Quantity"
            />
            <button
              type="button"
              onClick={() => handleBump(1)}
              className="grid h-10 w-10 place-items-center text-brand-navy hover:bg-brand-surface transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="text-sm text-brand-navy/50">
            Minimum order: <span className="font-medium text-brand-navy">{product.moq} units</span>
          </div>
        </div>

        {nextTier && (
          <div className="mt-3 flex items-start gap-2.5 rounded-md bg-brand-surface p-3.5">
            <Layers className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
            <p className="text-sm leading-relaxed text-brand-navy/70">
              Order{" "}
              <button
                type="button"
                onClick={() => { setQty(nextTier.min_qty); touch(); }}
                className="font-semibold text-brand-orange hover:underline"
              >
                {nextTier.min_qty} pieces
              </button>{" "}
              or more and the unit price drops to{" "}
              <span className="font-semibold text-brand-navy tabular-nums">{KSH.format(nextTier.unit_price)}</span>.
            </p>
          </div>
        )}
      </div>

      <div>
        <div className="text-sm font-semibold text-brand-navy mb-2.5">Artwork (optional)</div>
        <label className="flex flex-col items-center justify-center rounded-md border border-dashed border-border p-6 cursor-pointer hover:border-brand-navy/40 hover:bg-brand-surface transition-colors group relative overflow-hidden">
          <input type="file" ref={fileInputRef} accept=".pdf,.ai,.eps,.png,.jpg" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          {uploading ? (
            <div className="flex flex-col items-center py-2 text-center">
              <Layers className="h-5 w-5 text-brand-orange animate-spin mb-2.5" />
              <span className="text-sm font-medium text-brand-navy">Uploading...</span>
            </div>
          ) : artworkUrl ? (
            <div className="flex flex-col items-center py-2 text-center relative w-full px-8">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-navy mb-2">
                <Check className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-brand-navy">Artwork attached</span>
              <span className="text-xs text-brand-navy/50 mt-1 truncate max-w-xs block">{artworkFile?.name}</span>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="absolute top-0 right-0 grid h-7 w-7 place-items-center rounded-full text-brand-navy/40 hover:text-brand-orange hover:bg-white transition-colors"
                aria-label="Remove artwork"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <UploadCloud className="h-5 w-5 text-brand-navy/40 group-hover:text-brand-orange mb-2 transition-colors" />
              <span className="text-sm font-medium text-brand-navy">Upload your artwork</span>
              <span className="text-xs text-brand-navy/40 mt-1 max-w-sm leading-normal">PDF, AI, EPS, or transparent PNG (max 15MB). You can also send it with your quote.</span>
            </div>
          )}
        </label>
        {uploadError && (
          <div className="mt-2.5 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-md p-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {uploadError}
          </div>
        )}
      </div>

      <label className="flex items-center gap-3 rounded-md border border-border p-3.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={customBranding}
          onChange={(e) => { setCustomBranding(e.target.checked); touch(); }}
          className="h-4 w-4 accent-brand-navy shrink-0"
        />
        <span className="text-sm font-medium text-brand-navy">Request custom branding</span>
        <span className="ml-auto text-xs text-brand-navy/40 hidden sm:block">We confirm on your quote</span>
      </label>

      <div className="rounded-lg border border-border bg-brand-surface p-5 space-y-4">
        <div className="space-y-2 text-sm text-brand-navy/60 border-b border-border pb-4">
          <div className="flex justify-between gap-4">
            <span>Unit price</span>
            <span className="text-brand-navy font-medium tabular-nums">{KSH.format(unitPrice)} ea</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Subtotal ({qty} pcs)</span>
            <span className="text-brand-navy font-medium tabular-nums">{KSH.format(subtotal)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>{method || "Setup"} fee</span>
            <span className="text-brand-navy font-medium tabular-nums">{KSH.format(setupFee)}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <span className="text-sm font-semibold text-brand-navy">Total estimate</span>
          <span className="text-2xl font-bold text-brand-navy tabular-nums">{KSH.format(lineTotal)}</span>
        </div>

        {onSale && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-md p-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            Volume discount applied. Save {KSH.format(savings * qty)} total.
          </div>
        )}

        {justAdded && (
          <div className="flex items-center gap-2 text-sm text-brand-navy bg-brand-sky/10 rounded-md p-3">
            <Check className="h-4 w-4 shrink-0 text-brand-sky" />
            Added to cart.
          </div>
        )}

        <div className="pt-2 space-y-2.5">
          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-brand-navy text-white px-6 py-3.5 text-sm font-semibold hover:brightness-110 transition-all"
          >
            <ShoppingCart className="h-4 w-4" />
            {justAdded ? "Add another" : "Add to cart"}
          </button>

          {justAdded && (
            <Link
              to="/cart"
              className="w-full flex items-center justify-center gap-2 rounded-md bg-brand-sky text-white px-6 py-3.5 text-sm font-semibold hover:brightness-95 transition-all"
            >
              View cart <ArrowRight className="h-4 w-4" />
            </Link>
          )}

          <Link
            to="/request-quote"
            className="w-full flex items-center justify-center gap-2 rounded-md border border-border px-6 py-3.5 text-sm font-semibold text-brand-navy hover:border-brand-navy transition-colors"
          >
            Request custom quote <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function OptionRow({
  label, options, value, onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-brand-navy mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = opt === value;
          const theme = isSelected
            ? "border-brand-navy bg-brand-navy text-white"
            : "border-border hover:border-brand-navy/40 bg-white text-brand-navy";
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`rounded-md px-4 py-2 text-sm font-medium border transition-colors ${theme}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}