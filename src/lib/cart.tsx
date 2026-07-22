import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartPayload } from "@/components/shop/ProductConfigurator";

const STORAGE_KEY = "protocol_cart_v1";

export type CartLine = CartPayload & {
  /** Stable id for this line so duplicate configs of the same product don't collide. */
  lineId: string;
  addedAt: number;
};

type CartState = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  addLine: (payload: CartPayload) => void;
  removeLine: (lineId: string) => void;
  setLineQty: (lineId: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartState | null>(null);

function makeLineId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `line_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Reads persisted cart, tolerating malformed or empty storage. */
function readStorage(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        l &&
        typeof l.lineId === "string" &&
        typeof l.productId === "string" &&
        typeof l.quantity === "number" &&
        typeof l.totalCost === "number"
    );
  } catch {
    return [];
  }
}

/** Recomputes a line's totalCost after its quantity changes. */
function recalcLine(line: CartLine, quantity: number): CartLine {
  const safeQty = Math.max(1, Math.floor(quantity) || 1);
  const productSubtotal = line.baseUnitPrice * safeQty;
  return {
    ...line,
    quantity: safeQty,
    totalCost: productSubtotal + line.setupFee,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  // Hydrate once on mount (client only), then keep storage in sync on change.
  useEffect(() => {
    setLines(readStorage());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch (err) {
      console.error("Could not persist cart:", err);
    }
  }, [lines]);

  const addLine = useCallback((payload: CartPayload) => {
    setLines((prev) => [
      ...prev,
      { ...payload, lineId: makeLineId(), addedAt: Date.now() },
    ]);
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.lineId !== lineId));
  }, []);

  const setLineQty = useCallback((lineId: string, quantity: number) => {
    setLines((prev) =>
      prev.map((l) => (l.lineId === lineId ? recalcLine(l, quantity) : l))
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartState>(() => {
    const count = lines.reduce((sum, l) => sum + l.quantity, 0);
    const subtotal = lines.reduce((sum, l) => sum + l.totalCost, 0);
    return { lines, count, subtotal, addLine, removeLine, setLineQty, clear };
  }, [lines, addLine, removeLine, setLineQty, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside a CartProvider");
  }
  return ctx;
}