"use client";
// Glass — indicador de estado de la sincronización (§17.4). Nunca interrumpe una
// venta; solo informa.
import { useSyncStatus } from "./use-sync-status";

export function SyncBadge() {
  const s = useSyncStatus();

  let dot = "bg-emerald-500";
  let text = "";
  if (s.syncing) {
    dot = "bg-sky-500 animate-pulse";
    text = "Sincronizando…";
  } else if (s.net === "offline") {
    dot = "bg-amber-500";
    text = `Sin conexión · ${s.pending} ${s.pending === 1 ? "venta" : "ventas"} por enviar`;
  } else if (s.conflicts > 0) {
    dot = "bg-red-500";
    text = `${s.conflicts} ${s.conflicts === 1 ? "alerta" : "alertas"} de stock`;
  } else if (s.pending > 0) {
    dot = "bg-amber-500";
    text = `${s.pending} por enviar`;
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`inline-block size-2 rounded-full ${dot}`} />
      {text}
    </span>
  );
}

/** Franja roja de paquete caducado (§17.2 regla 6): bloquea ventas nuevas. */
export function ExpiredBanner({ onUnlock }: { onUnlock: () => void }) {
  const s = useSyncStatus();
  if (s.packageStatus !== "blocked") return null;
  return (
    <div className="flex items-center justify-between gap-3 bg-red-600 px-4 py-2 text-sm text-white">
      <span>
        El paquete de la caja lleva demasiado tiempo sin sincronizar. No se
        pueden registrar ventas nuevas.
      </span>
      <button
        type="button"
        onClick={onUnlock}
        className="rounded-md border border-white/40 px-2 py-1 text-xs"
      >
        Desbloquear con PIN del propietario
      </button>
    </div>
  );
}

export function isBlocked(status: string): boolean {
  return status === "blocked";
}
