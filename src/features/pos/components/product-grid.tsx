"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { formatBob } from "@/domain/money";
import { ScanField } from "@/features/scanner/scan-field";
import { posLookupAction, posSearchAction } from "../actions";
import { lookupOffline, searchOffline } from "../offline/catalog-lookup";
import type { PosProduct } from "../types";

/** ¿Parece un código de barras (solo dígitos, largo de EAN/UPC/interno)? */
function looksLikeBarcode(s: string): boolean {
  return /^\d{6,14}$/.test(s.trim());
}

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
  const [loading, setLoading] = useState(false);
  const [, start] = useTransition();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    if (tab === "top" && !query.trim()) {
      setList(topSellers);
      return;
    }
    const mine = ++reqId.current;
    const apply = (r: PosProduct[]) => {
      if (mine === reqId.current) setList(r); // ignora respuestas viejas
    };
    setLoading(true);
    start(async () => {
      const categoryId = tab === "top" ? undefined : tab;
      const q = query.trim();
      try {
        // Se intenta en línea siempre; si el servidor no responde, el paquete
        // local de Dexie (§17). `navigator.onLine` no es de fiar.
        apply(await posSearchAction(token, q, categoryId));
      } catch {
        apply(await searchOffline(q));
      }
      if (mine === reqId.current) setLoading(false);
    });
  }, [tab, query, token, topSellers]);

  function onType(value: string) {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setQuery(value), 200);
  }

  function onScan(code: string) {
    start(async () => {
      let p: PosProduct | null = null;
      try {
        p = await posLookupAction(token, code);
      } catch {
        p = await lookupOffline(code);
      }
      if (p) {
        onPick(p);
        setQuery("");
      } else if (looksLikeBarcode(code)) {
        onMiss(code); // código real desconocido → alta rápida
      } else {
        setQuery(code); // era una búsqueda por nombre
      }
    });
  }

  const showingSearch = query.trim().length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <ScanField
        onScan={onScan}
        onType={onType}
        placeholder="Escaneá un código o buscá por nombre"
      />

      <div className="flex flex-wrap gap-1">
        <Button
          size="sm"
          variant={tab === "top" && !showingSearch ? "default" : "outline"}
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
            onClick={() => {
              setTab(c.id);
              setQuery("");
            }}
          >
            {c.name}
          </Button>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {loading
            ? "Buscando…"
            : showingSearch
              ? `${list.length} resultado(s) para "${query.trim()}"`
              : `${list.length} producto(s)`}
        </span>
        {showingSearch && (
          <button
            type="button"
            className="underline"
            onClick={() => setQuery("")}
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="relative grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-start justify-center bg-background/70 pt-10 text-sm text-muted-foreground">
            Buscando…
          </div>
        )}
        {!loading && list.length === 0 && (
          <p className="col-span-full p-4 text-sm text-muted-foreground">
            Sin resultados.
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
