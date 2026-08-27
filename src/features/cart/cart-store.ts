"use client";
// Glass — carrito local del comprador (§9.2). Sin cuenta, sin servidor.
// Persiste en localStorage y se sincroniza entre pestañas.
import { useSyncExternalStore } from "react";

export interface CartLine {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  /** Precio efectivo mostrado al agregar (solo referencia; el pedido revalida). */
  unitHintBob: number;
  qty: number;
  note?: string;
}

const KEY = "glass.cart.v1";
let lines: CartLine[] = [];
const listeners = new Set<() => void>();

function load() {
  try {
    lines = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(lines)) lines = [];
  } catch {
    lines = [];
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // modo privado / sin storage: el carrito vive solo en memoria
  }
  for (const l of listeners) l();
}

let initialized = false;
function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  load();
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      load();
      for (const l of listeners) l();
    }
  });
}

function subscribe(cb: () => void) {
  ensureInit();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const EMPTY: CartLine[] = [];
function getSnapshot(): CartLine[] {
  ensureInit();
  return lines;
}

export const cart = {
  add(line: Omit<CartLine, "qty">, qty = 1) {
    ensureInit();
    const existing = lines.find((l) => l.variantId === line.variantId);
    lines = existing
      ? lines.map((l) =>
          l.variantId === line.variantId ? { ...l, qty: l.qty + qty } : l,
        )
      : [...lines, { ...line, qty }];
    persist();
  },
  setQty(variantId: string, qty: number) {
    ensureInit();
    lines =
      qty <= 0
        ? lines.filter((l) => l.variantId !== variantId)
        : lines.map((l) => (l.variantId === variantId ? { ...l, qty } : l));
    persist();
  },
  setNote(variantId: string, note: string) {
    ensureInit();
    lines = lines.map((l) => (l.variantId === variantId ? { ...l, note } : l));
    persist();
  },
  remove(variantId: string) {
    cart.setQty(variantId, 0);
  },
  clear() {
    ensureInit();
    lines = [];
    persist();
  },
};

export function useCart() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function useCartCount() {
  const c = useCart();
  return c.reduce((n, l) => n + l.qty, 0);
}
