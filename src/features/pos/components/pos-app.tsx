"use client";
// Orquestador del POS: emparejamiento → abrir turno → pantalla de venta.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { posBootstrapAction } from "../actions";
import {
  type DeviceSession,
  type OperatorSession,
  posDevice,
  posOperator,
} from "../pos-session";
import type { PosBootstrap } from "../types";
import { PairingScreen } from "./pairing-screen";
import { SaleScreen } from "./sale-screen";
import { ShiftOpen } from "./shift-open";

type State =
  | { phase: "loading" }
  | { phase: "pair" }
  | { phase: "shift"; device: DeviceSession; bootstrap: PosBootstrap }
  | {
      phase: "sale";
      device: DeviceSession;
      bootstrap: PosBootstrap;
      session: OperatorSession;
    };

export function PosApp() {
  const [state, setState] = useState<State>({ phase: "loading" });

  const load = useCallback(async () => {
    const device = posDevice.get();
    if (!device) {
      setState({ phase: "pair" });
      return;
    }
    const r = await posBootstrapAction(device.token);
    if (!r.ok || !r.data) {
      if (
        r.error &&
        !r.error.includes("revocado") &&
        !r.error.includes("reconocido")
      ) {
        toast.error(r.error);
      } else {
        posDevice.clear();
      }
      setState({ phase: "pair" });
      return;
    }
    const b = r.data;
    if (b.openSession) {
      setState({
        phase: "sale",
        device,
        bootstrap: b,
        session: {
          sessionId: b.openSession.id,
          operatorId: b.openSession.operatorId,
          operatorName: b.openSession.operatorName,
          since: Date.now(),
        },
      });
    } else {
      posOperator.clear();
      setState({ phase: "shift", device, bootstrap: b });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.phase === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
        Cargando la caja…
      </div>
    );
  }

  if (state.phase === "pair") {
    return <PairingScreen onPaired={() => load()} />;
  }

  if (state.phase === "shift") {
    return (
      <ShiftOpen
        token={state.device.token}
        operators={state.bootstrap.operators}
        onOpen={(session) =>
          setState({
            phase: "sale",
            device: state.device,
            bootstrap: state.bootstrap,
            session,
          })
        }
      />
    );
  }

  return (
    <SaleScreen
      token={state.device.token}
      session={state.session}
      bootstrap={state.bootstrap}
    />
  );
}
