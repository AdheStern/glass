"use client";
// Escucha global de teclado: un lector HID (USB/Bluetooth) se comporta como un
// teclado que teclea muy rápido y termina en Enter (§15.1). Se distingue del
// tipeo humano por el intervalo entre pulsaciones (`isHidBurst`, dominio).
import { useEffect, useRef } from "react";
import { isHidBurst } from "@/domain/barcode";

const RESET_MS = 100; // una pausa mayor reinicia el búfer

export function useHidScanner(
  onScan: (code: string) => void,
  enabled = true,
): void {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;
    let chars: string[] = [];
    let times: number[] = [];
    const reset = () => {
      chars = [];
      times = [];
    };

    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const inScanField = el?.dataset?.scanField === "true";
      const typingElsewhere =
        !inScanField &&
        el != null &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
      if (typingElsewhere) return;

      const now = performance.now();

      if (e.key === "Enter") {
        if (chars.length >= 4) {
          const intervals = times.slice(1).map((t, i) => t - times[i]);
          if (isHidBurst(intervals)) {
            e.preventDefault();
            onScanRef.current(chars.join(""));
          }
        }
        reset();
        return;
      }

      if (e.key.length !== 1) return; // Shift, flechas, F-keys…
      if (times.length && now - times[times.length - 1] > RESET_MS) reset();
      chars.push(e.key);
      times.push(now);
    }

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [enabled]);
}
