"use client";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCartCount } from "../cart-store";

export function CartButton() {
  const count = useCartCount();
  return (
    <Link
      href="/carrito"
      className="relative inline-flex items-center"
      aria-label="Carrito"
    >
      <ShoppingBag className="size-5" />
      {count > 0 && (
        <span className="absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-[var(--brand)] text-[10px] font-bold text-[var(--on-brand)]">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
