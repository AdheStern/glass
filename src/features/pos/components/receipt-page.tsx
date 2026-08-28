"use client";
import { useEffect, useState } from "react";
import { getReceiptAction } from "../actions";
import { posDevice } from "../pos-session";
import type { ReceiptView } from "../receipt";
import { Receipt } from "./receipt";

export function ReceiptPage({ folio }: { folio: string }) {
  const [state, setState] = useState<
    | { loading: true }
    | { loading: false; receipt: ReceiptView | null; token: string }
  >({ loading: true });

  useEffect(() => {
    const device = posDevice.get();
    if (!device) {
      setState({ loading: false, receipt: null, token: "" });
      return;
    }
    getReceiptAction(device.token, folio).then((receipt) =>
      setState({ loading: false, receipt, token: device.token }),
    );
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
