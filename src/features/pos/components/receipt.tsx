"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatBob } from "@/domain/money";
import type { ReceiptView } from "../receipt";

export function Receipt({
  receipt,
  token,
}: {
  receipt: ReceiptView;
  token: string;
}) {
  const waText = encodeURIComponent(
    `${receipt.siteName}\n${receipt.folio}\n` +
      receipt.items
        .map((i) => `${i.qty}x ${i.name}  ${formatBob(i.lineBob)}`)
        .join("\n") +
      `\nTotal: ${formatBob(receipt.totalBob)}\n${receipt.footer}`,
  );

  return (
    <div className="mx-auto max-w-sm p-6">
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <Button size="sm" onClick={() => window.print()}>
          Imprimir
        </Button>
        <Button asChild size="sm" variant="outline">
          <a
            href={`/pos/comprobante/${receipt.folio}/pdf?t=${token}`}
            target="_blank"
            rel="noopener"
          >
            PDF
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noopener"
          >
            WhatsApp
          </a>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href="/pos">Volver a la caja</Link>
        </Button>
      </div>

      <div className="rounded-lg border p-4 font-mono text-sm">
        <p className="text-center text-base font-bold">{receipt.siteName}</p>
        <p className="text-center text-xs text-muted-foreground">
          {receipt.deviceName} · {receipt.operatorName}
        </p>
        <p className="text-center text-xs text-muted-foreground">
          {receipt.folio} · {receipt.occurredAt.toLocaleString("es-BO")}
        </p>
        {receipt.voidedAt && (
          <p className="my-2 text-center font-bold text-red-600">
            *** ANULADA ***
          </p>
        )}
        <hr className="my-2" />
        {receipt.items.map((it) => (
          <div
            key={`${it.name}-${it.qty}`}
            className="flex justify-between gap-2"
          >
            <span>
              {it.qty}x {it.name}
            </span>
            <span className="tabular-nums">{formatBob(it.lineBob)}</span>
          </div>
        ))}
        <hr className="my-2" />
        {receipt.discountBob > 0 && (
          <div className="flex justify-between">
            <span>Descuento</span>
            <span className="tabular-nums">
              -{formatBob(receipt.discountBob)}
            </span>
          </div>
        )}
        {receipt.roundingBob !== 0 && (
          <div className="flex justify-between">
            <span>Redondeo</span>
            <span className="tabular-nums">
              {formatBob(receipt.roundingBob)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold">
          <span>TOTAL</span>
          <span className="tabular-nums">{formatBob(receipt.totalBob)}</span>
        </div>
        {receipt.payments.map((p) => (
          <div key={p.label} className="flex justify-between text-xs">
            <span>{p.label}</span>
            <span className="tabular-nums">{formatBob(p.amountBob)}</span>
          </div>
        ))}
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          {receipt.footer}
        </p>
      </div>
    </div>
  );
}
