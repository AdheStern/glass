"use client";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBob } from "@/domain/money";
import { cart } from "../cart-store";

export interface VariantOption {
  variantId: string;
  label: string | null;
  effectiveBob: number;
  available: boolean;
}

export function AddToCartControl({
  productId,
  productName,
  slug,
  variants,
}: {
  productId: string;
  productName: string;
  slug: string;
  variants: VariantOption[];
}) {
  const firstAvailable = variants.find((v) => v.available) ?? variants[0];
  const [selectedId, setSelectedId] = useState(firstAvailable?.variantId ?? "");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const selected =
    variants.find((v) => v.variantId === selectedId) ?? firstAvailable;
  const canAdd = selected?.available ?? false;

  if (!selected) return null;

  return (
    <div className="flex flex-col gap-3">
      {variants.length > 1 && (
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {variants.map((v) => (
              <SelectItem
                key={v.variantId}
                value={v.variantId}
                disabled={!v.available}
              >
                {`${v.label ?? "Variante"} — ${formatBob(v.effectiveBob)}`}
                {!v.available ? " (agotado)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Menos"
          >
            <Minus className="size-4" />
          </Button>
          <span className="w-8 text-center tabular-nums">{qty}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQty((q) => Math.min(999, q + 1))}
            aria-label="Más"
          >
            <Plus className="size-4" />
          </Button>
        </div>

        {canAdd ? (
          <Button
            size="lg"
            onClick={() => {
              cart.add(
                {
                  variantId: selected.variantId,
                  productId,
                  slug,
                  name: selected.label
                    ? `${productName} — ${selected.label}`
                    : productName,
                  unitHintBob: selected.effectiveBob,
                },
                qty,
              );
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
        ) : (
          <div className="flex flex-col gap-1">
            <Button size="lg" variant="secondary" disabled>
              Agotado
            </Button>
            <a
              href="#avisame"
              className="text-sm text-[var(--brand)] underline"
            >
              Avísame cuando vuelva
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
