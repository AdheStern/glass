"use client";
// Glass — el mapa se carga solo al entrar en pantalla (§11.1).
import { useEffect, useRef, useState } from "react";

export function LazyMap({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || show) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show]);

  return (
    <div ref={ref} className="aspect-4/3 overflow-hidden rounded-xl bg-black/5">
      {show && (
        <iframe
          title="Mapa"
          src={src}
          loading="lazy"
          className="h-full w-full border-0"
        />
      )}
    </div>
  );
}
