"use client";
// Campo unificado de entrada de códigos (§15.1): tipeo, lector HID y cámara.
// Es lo que montan todos los formularios de inventario. El POS lo reutiliza (Fase 5).
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
import { useHidScanner } from "./use-hid-scanner";

export function ScanField({
  onScan,
  placeholder = "Escaneá o escribí el código",
  autoFocus = true,
}: {
  onScan: (code: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const [cam, setCam] = useState(false);

  useHidScanner((code) => {
    onScan(code);
    setValue("");
  });

  function submit() {
    const code = value.trim();
    if (!code) return;
    onScan(code);
    setValue("");
  }

  return (
    <div className="flex gap-2">
      <Input
        data-scan-field="true"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setCam(true)}
        aria-label="Abrir cámara"
      >
        <Camera className="size-4" />
      </Button>

      <Sheet open={cam} onOpenChange={setCam}>
        <SheetContent side="bottom" className="mx-auto max-w-md">
          <SheetHeader>
            <SheetTitle>Escanear con la cámara</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <CameraScanner onScan={onScan} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
