"use client";
// Glass — animación de la landing (§8.3, regla 7). Componente cliente aislado:
// `motion` viaja en su propio chunk y solo se descarga en las páginas de
// contenido, nunca en el catálogo. El contenido se renderiza en el servidor
// (visible sin JS); la entrada es un realce que anima al montar.
import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        className={className}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay, ease: "easeOut" }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
