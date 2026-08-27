"use client";
// Escáner por cámara (§15.1, §15.4). `BarcodeDetector` nativo donde exista
// (Chrome/Android); si no, respaldo con @zxing/browser cargado de forma diferida
// (nunca entra al bundle del catálogo). Modo continuo: descarta lecturas
// repetidas del mismo código dentro de 1,5 s, con pitido y vibración.
import { useEffect, useRef, useState } from "react";

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (opts?: {
  formats?: string[];
}) => BarcodeDetectorLike;

const FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "itf",
  "qr_code",
];

function beep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
    osc.onended = () => ctx.close();
  } catch {
    // sin audio: no es un error
  }
}

export function CameraScanner({
  onScan,
  continuous = true,
}: {
  onScan: (code: string) => void;
  continuous?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<"nativo" | "zxing" | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let zxingStop: (() => void) | null = null;
    const last = { code: "", at: 0 };

    function emit(code: string) {
      const now = performance.now();
      if (code === last.code && now - last.at < 1500) return;
      last.code = code;
      last.at = now;
      beep();
      navigator.vibrate?.(60);
      onScanRef.current(code);
    }

    async function startNative(
      video: HTMLVideoElement,
      Ctor: BarcodeDetectorCtor,
    ) {
      setEngine("nativo");
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (cancelled) return;
      video.srcObject = stream;
      await video.play();
      const detector = new Ctor({ formats: FORMATS });
      const tick = async () => {
        if (cancelled) return;
        try {
          const found = await detector.detect(video);
          if (found[0]?.rawValue) {
            emit(found[0].rawValue);
            if (!continuous) return;
          }
        } catch {
          // frame ilegible: se reintenta
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    async function startZxing(video: HTMLVideoElement) {
      setEngine("zxing");
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      if (cancelled) return;
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: "environment" } },
        video,
        (result) => {
          if (result) {
            emit(result.getText());
            if (!continuous) controls.stop();
          }
        },
      );
      zxingStop = () => controls.stop();
      if (cancelled) controls.stop();
    }

    async function start() {
      const video = videoRef.current;
      if (!video) return;
      try {
        const Ctor = (
          window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }
        ).BarcodeDetector;
        if (Ctor) {
          await startNative(video, Ctor);
        } else {
          await startZxing(video);
        }
      } catch (e) {
        setError(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "Sin permiso de cámara. Usá el lector físico o escribí el código."
            : "No se pudo abrir la cámara. Usá el lector físico o escribí el código.",
        );
      }
    }

    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      zxingStop?.();
      for (const t of stream?.getTracks() ?? []) t.stop();
    };
  }, [continuous]);

  return (
    <div className="flex flex-col gap-2">
      {/* Vídeo en vivo de la cámara: no hay pista de subtítulos posible. */}
      <video
        ref={videoRef}
        className="aspect-square w-full rounded-md bg-black object-cover"
        muted
        playsInline
      >
        <track kind="captions" />
      </video>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {engine === "zxing"
            ? "Cámara (respaldo). Acercá el código, con buena luz."
            : "Apuntá al código de barras."}
        </p>
      )}
    </div>
  );
}
