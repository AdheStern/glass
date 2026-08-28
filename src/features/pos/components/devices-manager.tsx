"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  generatePairingCodeAction,
  revokeDeviceAction,
} from "../panel-actions";

interface Device {
  id: string;
  name: string;
  createdAt: Date;
  lastSyncAt: Date | null;
  revokedAt: Date | null;
}

export function DevicesManager({ devices }: { devices: Device[] }) {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await generatePairingCodeAction();
              if (r.ok && r.code) setCode(r.code);
              else toast.error(r.error ?? "Error");
            })
          }
        >
          Generar código de emparejamiento
        </Button>
        {code && (
          <span className="rounded-md border bg-muted px-3 py-1 font-mono text-lg tracking-widest">
            {code}
          </span>
        )}
      </div>
      {code && (
        <p className="text-xs text-muted-foreground">
          Válido 10 minutos. En la tablet: abrir <code>/pos</code> e ingresarlo.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">Caja</th>
              <th className="p-2">Alta</th>
              <th className="p-2">Última sync</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {devices.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="p-4 text-center text-muted-foreground"
                >
                  Sin dispositivos.
                </td>
              </tr>
            )}
            {devices.map((d) => (
              <tr key={d.id} className={d.revokedAt ? "opacity-50" : ""}>
                <td className="p-2 font-medium">{d.name}</td>
                <td className="p-2 text-xs text-muted-foreground">
                  {d.createdAt.toLocaleDateString("es-BO")}
                </td>
                <td className="p-2 text-xs text-muted-foreground">
                  {d.lastSyncAt?.toLocaleString("es-BO") ?? "—"}
                </td>
                <td className="p-2 text-right">
                  {d.revokedAt ? (
                    <span className="text-xs text-muted-foreground">
                      revocado
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const r = await revokeDeviceAction(d.id);
                          if (r.ok) router.refresh();
                          else toast.error(r.error ?? "Error");
                        })
                      }
                    >
                      Revocar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
