"use client";
// Orquestador del POS: emparejamiento → abrir turno → pantalla de venta. En la
// Fase 6 arranca también sin red, desde el paquete de Dexie (§17.1).
import { useCallback, useEffect, useState } from "react";
import { posBootstrapAction } from "../actions";
import { offlineBootstrap } from "../offline/bootstrap";
import { fetchAndStorePackage, hasPackage } from "../offline/package";
import { registerPosServiceWorker } from "../offline/register-sw";
import { patchSyncState } from "../offline/store";
import { startSyncLoop } from "../offline/sync";
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
  | { phase: "needs-package" }
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
    registerPosServiceWorker();

    const r = await posBootstrapAction(device.token).catch(() => null);

    if (r?.ok && r.data) {
      patchSyncState({ net: "online" });
      // Con red: baja el paquete para poder operar sin conexión (§17.3).
      await fetchAndStorePackage(device.token).catch(() => false);
      startSyncLoop(device.token);
      applyBootstrap(device, r.data, setState);
      return;
    }
    if (
      r &&
      !r.ok &&
      r.error &&
      (r.error.includes("revocado") || r.error.includes("reconocido"))
    ) {
      posDevice.clear();
      setState({ phase: "pair" });
      return;
    }

    // Sin red (o error transitorio): intentar el paquete local.
    patchSyncState({ net: "offline" });
    if (!(await hasPackage())) {
      setState({ phase: "needs-package" });
      return;
    }
    const op = posOperator.get();
    const boot = await offlineBootstrap(
      { id: device.deviceId, name: device.name },
      op
        ? {
            id: op.sessionId,
            operatorId: op.operatorId,
            operatorName: op.operatorName,
          }
        : null,
    );
    if (!boot) {
      setState({ phase: "needs-package" });
      return;
    }
    startSyncLoop(device.token);
    applyBootstrap(device, boot, setState);
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

  if (state.phase === "needs-package") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-lg font-medium">Conectá la caja una vez</p>
        <p className="text-sm text-muted-foreground">
          Necesita bajar el catálogo y los precios para poder trabajar sin
          conexión.
        </p>
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm"
          onClick={() => load()}
        >
          Reintentar
        </button>
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

function applyBootstrap(
  device: DeviceSession,
  b: PosBootstrap,
  setState: (s: State) => void,
) {
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
    return;
  }
  posOperator.clear();
  setState({ phase: "shift", device, bootstrap: b });
}
