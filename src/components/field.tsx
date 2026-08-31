"use client";
// Glass — campo de formulario con etiqueta asociada. Genera un `id` y lo cablea
// al `<Label htmlFor>` y al control hijo (Input/Textarea/select), para que un
// lector de pantalla anuncie el campo y los tests puedan usar `getByLabel`.
import { cloneElement, isValidElement, type ReactElement, useId } from "react";
import { Label } from "@/components/ui/label";

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactElement<{ id?: string }>;
}) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5${className ? ` ${className}` : ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {isValidElement(children) ? cloneElement(children, { id }) : children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
