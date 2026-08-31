"use client";
// Glass — campo de código de barras con opción de escaneo por cámara. Para
// formularios donde no conviene el `<ScanField>` completo (que engancha el
// lector HID global), p. ej. varias filas de variante a la vez.
import { Camera } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CameraScanner } from "./camera-scanner";

export function BarcodeInput({
  value,
  onChange,
  placeholder = "Escaneá o escribí el código",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [cam, setCam] = useState(false);
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Escanear con la cámara"
        onClick={() => setCam(true)}
      >
        <Camera className="size-4" />
      </Button>

      <Sheet open={cam} onOpenChange={setCam}>
        <SheetContent side="bottom" className="mx-auto max-w-md">
          <SheetHeader>
            <SheetTitle>Escanear código de barras</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <CameraScanner
              onScan={(code) => {
                onChange(code);
                setCam(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
