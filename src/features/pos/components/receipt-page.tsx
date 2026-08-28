"use client";
import { useEffect, useState } from "react";
import { getReceiptAction } from "../actions";
import { localReceipt } from "../offline/receipt-local";
import { posDevice } from "../pos-session";
import type { ReceiptView } from "../receipt";
import { Receipt } from "./receipt";

const IS_FOLIO = /^V-\d+$/i;

export function ReceiptPage({ folio }: { folio: string }) {
  const [state, setState] = useState<
    | { loading: true }
    | { loading: false; receipt: ReceiptView | null; token: string }
  >({ loading: true });

  useEffect(() => {
    const device = posDevice.get();
    const token = device?.token ?? "";

    async function resolve(): Promise<ReceiptView | null> {
      // Venta sincronizada: el servidor tiene el detalle completo.
      if (token && IS_FOLIO.test(folio)) {
        const server = await getReceiptAction(token, folio).catch(() => null);
        if (server) return server;
      }
      // Venta local (aún sin folio) o sin red: se arma desde Dexie.
      return localReceipt(folio);
    }

    resolve().then((receipt) => setState({ loading: false, receipt, token }));
  }, [folio]);

  if (state.loading) return null;
  if (!state.receipt) {
    return (
      <p className="p-8 text-center text-muted-foreground">
        No se encontró el comprobante {folio}.
      </p>
    );
  }
  return <Receipt receipt={state.receipt} token={state.token} />;
}
