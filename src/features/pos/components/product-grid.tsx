"use client";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { formatBob } from "@/domain/money";
import { ScanField } from "@/features/scanner/scan-field";
import { posLookupAction, posSearchAction } from "../actions";
import {
  isOffline,
  lookupOffline,
  searchOffline,
} from "../offline/catalog-lookup";
import type { PosProduct } from "../types";

export function ProductGrid({
  token,
  topSellers,
  categories,
  onPick,
  onMiss,
}: {
  token: string;
  topSellers: PosProduct[];
  categories: { id: string; name: string }[];
  onPick: (p: PosProduct) => void;
  onMiss: (code: string) => void;
}) {
  const [tab, setTab] = useState<string>("top");
  const [query, setQuery] = useState("");
  const [list, setList] = useState<PosProduct[]>(topSellers);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (tab === "top" && !query) {
      setList(topSellers);
      return;
    }
    start(async () => {
      const categoryId = tab === "top" ? undefined : tab;
      try {
        if (isOffline()) {
          setList(await searchOffline(query));
        } else {
          setList(await posSearchAction(token, query, categoryId));
        }
      } catch {
        setList(await searchOffline(query));
      }
    });
  }, [tab, query, token, topSellers]);

  function onScan(code: string) {
    start(async () => {
      let p: PosProduct | null = null;
      try {
        p = isOffline()
          ? await lookupOffline(code)
          : await posLookupAction(token, code);
      } catch {
        p = await lookupOffline(code);
      }
      if (p) onPick(p);
      else onMiss(code);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex gap-2">
        <ScanField onScan={onScan} placeholder="Escaneá o buscá un producto" />
      </div>

      <div className="flex flex-wrap gap-1">
        <Button
          size="sm"
          variant={tab === "top" ? "default" : "outline"}
          onClick={() => {
            setTab("top");
            setQuery("");
          }}
        >
          Más vendidos
        </Button>
        {categories.map((c) => (
          <Button
            key={c.id}
            size="sm"
            variant={tab === c.id ? "default" : "outline"}
            onClick={() => setTab(c.id)}
          >
            {c.name}
          </Button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
        {list.length === 0 && (
          <p className="col-span-full p-4 text-sm text-muted-foreground">
            {pending ? "Buscando…" : "Sin resultados."}
          </p>
        )}
        {list.map((p) => (
          <button
            key={p.variantId}
            type="button"
            onClick={() => onPick(p)}
            className="flex min-h-20 flex-col items-start justify-between rounded-lg border p-2 text-left hover:bg-muted/60"
          >
            <span className="line-clamp-2 text-sm">
              {p.productName}
              {p.variantLabel ? ` · ${p.variantLabel}` : ""}
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {formatBob(p.effectiveBob)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
