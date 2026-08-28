"use client";
import { Delete } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export function PinPad({
  onComplete,
  length = 4,
  disabled = false,
}: {
  onComplete: (pin: string) => void;
  length?: number;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  function push(k: string) {
    if (disabled) return;
    if (k === "del") {
      setValue((v) => v.slice(0, -1));
      return;
    }
    if (!k) return;
    const next = (value + k).slice(0, length);
    setValue(next);
    if (next.length === length) {
      onComplete(next);
      setValue("");
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-3">
        {Array.from({ length }).map((_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: puntos fijos del PIN
            key={i}
            className={`size-4 rounded-full border-2 ${
              i < value.length
                ? "bg-foreground border-foreground"
                : "border-muted-foreground/40"
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k, i) =>
          k ? (
            <Button
              key={k}
              type="button"
              variant={k === "del" ? "ghost" : "outline"}
              className="h-16 w-20 text-xl"
              disabled={disabled}
              onClick={() => push(k)}
            >
              {k === "del" ? <Delete className="size-5" /> : k}
            </Button>
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: hueco fijo del teclado
            <span key={`gap-${i}`} />
          ),
        )}
      </div>
    </div>
  );
}
