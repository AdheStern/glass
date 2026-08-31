"use client";
// Glass — fondo animado para el héroe de la landing (§8.3: animación permitida
// en la portada del negocio, con carga diferida). `motion` viaja en su propio
// chunk; el catálogo nunca lo descarga. Usa los tokens de marca, así respeta el
// tema elegido en Apariencia.
import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";

const BLOB = "absolute rounded-full blur-3xl";

export default function Aurora() {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div
          className={`${BLOB} left-[8%] top-4 size-72 bg-[var(--brand)] opacity-30`}
        />
        <div
          className={`${BLOB} right-[10%] bottom-0 size-80 bg-[var(--brand-8)] opacity-25`}
        />
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <m.div
          className={`${BLOB} left-[6%] top-2 size-72 bg-[var(--brand)] opacity-35`}
          animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
          transition={{
            duration: 12,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
        <m.div
          className={`${BLOB} right-[8%] bottom-0 size-80 bg-[var(--brand-8)] opacity-30`}
          animate={{ x: [0, -40, 0], y: [0, -25, 0], scale: [1, 1.2, 1] }}
          transition={{
            duration: 16,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: 1.5,
          }}
        />
        <m.div
          className={`${BLOB} left-1/2 top-1/3 size-56 bg-[var(--brand-6)] opacity-25`}
          animate={{ x: [0, -30, 25, 0], y: [0, 20, -15, 0] }}
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
      </div>
    </LazyMotion>
  );
}
