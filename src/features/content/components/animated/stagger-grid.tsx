"use client";
import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import { Children, type ReactNode } from "react";

export default function StaggerGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const items = Children.toArray(children);
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <LazyMotion features={domAnimation} strict>
      <div className={className}>
        {items.map((child, i) => (
          <m.div
            key={i}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.4) }}
          >
            {child}
          </m.div>
        ))}
      </div>
    </LazyMotion>
  );
}
