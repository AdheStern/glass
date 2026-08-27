"use client";
import { Check, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cart } from "../cart-store";

export function AddToCartButton({
  line,
  disabled,
}: {
  line: {
    variantId: string;
    productId: string;
    slug: string;
    name: string;
    unitHintBob: number;
  };
  disabled?: boolean;
}) {
  const [added, setAdded] = useState(false);

  if (disabled) {
    return (
      <div className="flex flex-col gap-2">
        <Button disabled size="lg" variant="secondary">
          Agotado
        </Button>
        <a href="#avisame" className="text-sm text-[var(--brand)] underline">
          Avísame cuando vuelva
        </a>
      </div>
    );
  }

  return (
    <Button
      size="lg"
      onClick={() => {
        cart.add(line);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
    >
      {added ? (
        <Check className="mr-2 size-4" />
      ) : (
        <ShoppingCart className="mr-2 size-4" />
      )}
      {added ? "Agregado" : "Agregar al pedido"}
    </Button>
  );
}
