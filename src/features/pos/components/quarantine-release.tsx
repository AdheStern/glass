"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { releaseQuarantineAction } from "../panel-actions";

export function QuarantineRelease({ deviceId }: { deviceId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await releaseQuarantineAction(deviceId);
          toast[r.ok ? "success" : "error"](
            r.ok ? "Dispositivo reactivado" : (r.error ?? "No se pudo"),
          );
        })
      }
    >
      Liberar y reactivar
    </Button>
  );
}
