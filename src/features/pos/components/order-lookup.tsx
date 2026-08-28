"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { posFindOrderAction } from "../actions";
import type { PosOrderLookup } from "../types";

export function OrderLookup({
  token,
  onLoad,
}: {
  token: string;
  onLoad: (order: PosOrderLookup) => void;
}) {
  const [folio, setFolio] = useState("");
  const [pending, start] = useTransition();

  function search() {
    const f = folio.trim();
    if (!f) return;
    start(async () => {
      const order = await posFindOrderAction(token, f);
      if (!order) {
        toast.error("No se encontró ese pedido");
        return;
      }
      if (order.status === "COBRADO") {
        toast.error("Ese pedido ya se cobró");
        return;
      }
      onLoad(order);
      setFolio("");
    });
  }

  return (
    <div className="flex gap-2">
      <Input
        value={folio}
        onChange={(e) => setFolio(e.target.value)}
        placeholder="Cobrar pedido por folio (P-…)"
        className="h-9"
        onKeyDown={(e) => e.key === "Enter" && search()}
      />
      <Button variant="secondary" size="sm" disabled={pending} onClick={search}>
        Buscar
      </Button>
    </div>
  );
}
