"use client";
import { Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applyPercent, formatBob, roundToStep } from "@/domain/money";
import type { OperatorSession } from "../pos-session";
import type { CreateSaleInput } from "../schemas";
import type { PosBootstrap, PosProduct } from "../types";
import { OrderLookup } from "./order-lookup";
import { PayDialog } from "./pay-dialog";
import { ProductGrid } from "./product-grid";
import { ExpiredBanner, SyncBadge } from "./sync-badge";
import { useSyncStatus } from "./use-sync-status";

interface Line {
  variantId: string;
  name: string;
  listBob: number;
  unitBob: number;
  qty: number;
  discountPercent: number;
}

const STEP: Record<string, number> = {
  NONE: 1,
  NEAREST_10: 10,
  NEAREST_50: 50,
};

export function SaleScreen({
  token,
  session,
  bootstrap,
}: {
  token: string;
  session: OperatorSession;
  bootstrap: PosBootstrap;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState("");
  const [orderId, setOrderId] = useState<string | undefined>();
  const [paying, setPaying] = useState(false);
  const sync = useSyncStatus();
  const blocked = sync.packageStatus === "blocked";

  const step = STEP[bootstrap.settings.roundingMode] ?? 1;
  const globalPct = Math.max(
    0,
    Math.min(100, Number.parseInt(globalDiscount, 10) || 0),
  );

  const { subtotal, total } = useMemo(() => {
    const sub = lines.reduce((s, l) => {
      const unit = l.unitBob - applyPercent(l.unitBob, l.discountPercent);
      return s + unit * l.qty;
    }, 0);
    const afterGlobal = sub - applyPercent(sub, globalPct);
    return { subtotal: sub, total: roundToStep(afterGlobal, step) };
  }, [lines, globalPct, step]);

  function addProduct(p: PosProduct) {
    setLines((prev) => {
      const hit = prev.find((l) => l.variantId === p.variantId);
      if (hit) {
        return prev.map((l) =>
          l.variantId === p.variantId ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          variantId: p.variantId,
          name: p.variantLabel
            ? `${p.productName} · ${p.variantLabel}`
            : p.productName,
          listBob: p.basePriceBob,
          unitBob: p.effectiveBob,
          qty: 1,
          discountPercent: 0,
        },
      ];
    });
  }

  function setQty(variantId: string, qty: number) {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.variantId !== variantId)
        : prev.map((l) => (l.variantId === variantId ? { ...l, qty } : l)),
    );
  }

  const salePayload: { lines: CreateSaleInput["lines"] } = {
    lines: lines.map((l) => ({
      variantId: l.variantId,
      qty: l.qty,
      discountPercent: l.discountPercent || undefined,
    })),
  };
  const needsAuth =
    globalPct > bootstrap.settings.maxCashierDiscountPercent ||
    lines.some(
      (l) => l.discountPercent > bootstrap.settings.maxCashierDiscountPercent,
    );

  return (
    <div className="flex h-dvh flex-col">
      <ExpiredBanner onUnlock={() => setPaying(false)} />
      <header className="flex items-center justify-between border-b px-4 py-2 text-sm">
        <span className="flex items-center gap-3 font-medium">
          {bootstrap.settings.name} · {bootstrap.device.name}
          <SyncBadge />
        </span>
        <span className="flex items-center gap-3 text-muted-foreground">
          {session.operatorName}
          <Button asChild size="sm" variant="ghost">
            <Link href="/pos/turno/cerrar">Cerrar turno</Link>
          </Button>
        </span>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_360px]">
        <div className="flex min-h-0 flex-col gap-3 border-r p-3">
          <OrderLookup
            token={token}
            onLoad={(o) => {
              setOrderId(o.id);
              setLines(
                o.items.map((it) => ({
                  variantId: it.variantId,
                  name: it.variantLabel
                    ? `${it.productName} · ${it.variantLabel}`
                    : it.productName,
                  listBob: it.basePriceBob,
                  unitBob: it.effectiveBob,
                  qty: it.qty,
                  discountPercent: 0,
                })),
              );
              toast.success(`Pedido ${o.folio} cargado`);
            }}
          />
          <ProductGrid
            token={token}
            topSellers={bootstrap.topSellers}
            categories={bootstrap.categories}
            onPick={addProduct}
            onMiss={(code) => toast.error(`Sin producto para "${code}"`)}
          />
        </div>

        <aside className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {lines.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Escaneá o tocá productos para armar el ticket.
              </p>
            )}
            {lines.map((l) => (
              <div key={l.variantId} className="border-b py-2">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="flex-1">{l.name}</span>
                  <button
                    type="button"
                    onClick={() => setQty(l.variantId, 0)}
                    aria-label="Quitar"
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center rounded-md border">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQty(l.variantId, l.qty - 1)}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-8 text-center text-sm tabular-nums">
                      {l.qty}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQty(l.variantId, l.qty + 1)}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {formatBob(
                      (l.unitBob - applyPercent(l.unitBob, l.discountPercent)) *
                        l.qty,
                    )}
                  </span>
                </div>
                <Input
                  className="mt-1 h-7 text-xs"
                  inputMode="numeric"
                  placeholder="% desc. línea"
                  value={l.discountPercent || ""}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((x) =>
                        x.variantId === l.variantId
                          ? {
                              ...x,
                              discountPercent: Math.max(
                                0,
                                Math.min(
                                  100,
                                  Number.parseInt(e.target.value, 10) || 0,
                                ),
                              ),
                            }
                          : x,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>

          <div className="border-t p-3">
            <Input
              className="mb-2 h-8 text-sm"
              inputMode="numeric"
              placeholder="% descuento global"
              value={globalDiscount}
              onChange={(e) =>
                setGlobalDiscount(e.target.value.replace(/\D/g, ""))
              }
            />
            {subtotal !== total && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatBob(subtotal)}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">TOTAL</span>
              <span className="text-3xl font-bold tabular-nums">
                {formatBob(total)}
              </span>
            </div>
            <Button
              size="lg"
              className="mt-2 h-14 w-full text-lg"
              disabled={lines.length === 0 || blocked}
              onClick={() => setPaying(true)}
            >
              Cobrar
            </Button>
          </div>
        </aside>
      </div>

      <PayDialog
        open={paying}
        onOpenChange={setPaying}
        token={token}
        totalBob={total}
        methods={bootstrap.paymentMethods}
        needsAuth={needsAuth}
        payload={{
          sessionId: session.sessionId,
          lines: salePayload.lines,
          globalDiscountPercent: globalPct || undefined,
          orderId,
        }}
        onPaid={(ref) => {
          setLines([]);
          setGlobalDiscount("");
          setOrderId(undefined);
          toast.success("Ticket registrado", {
            action: {
              label: "Ver comprobante",
              onClick: () => {
                window.location.href = `/pos/comprobante/${ref}`;
              },
            },
          });
        }}
      />
    </div>
  );
}
