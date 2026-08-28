"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { archiveOperatorAction, saveOperatorAction } from "../panel-actions";

const ROLES = ["PROPIETARIO", "ADMINISTRADOR", "EDITOR", "CAJERO", "ALMACEN"];

interface Operator {
  id: string;
  name: string;
  role: string;
}

export function OperatorsManager({ operators }: { operators: Operator[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [role, setRole] = useState("CAJERO");
  const [pin, setPin] = useState("");
  const [pending, start] = useTransition();

  function create() {
    start(async () => {
      const r = await saveOperatorAction({ name, role, pin });
      if (r.ok) {
        toast.success("Operador creado");
        setName("");
        setPin("");
        router.refresh();
      } else {
        toast.error(r.error ?? "Error");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex max-w-md flex-col gap-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Nuevo operador</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="op-name">Nombre</Label>
          <Input
            id="op-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Rol</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="op-pin">PIN (4 dígitos)</Label>
          <Input
            id="op-pin"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <Button
          disabled={pending || name.trim().length < 2 || pin.length !== 4}
          onClick={create}
          className="self-start"
        >
          Crear
        </Button>
      </section>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">Nombre</th>
              <th className="p-2">Rol</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {operators.map((o) => (
              <OperatorRow
                key={o.id}
                operator={o}
                onDone={() => router.refresh()}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OperatorRow({
  operator,
  onDone,
}: {
  operator: Operator;
  onDone: () => void;
}) {
  const [newPin, setNewPin] = useState("");
  const [pending, start] = useTransition();

  return (
    <tr>
      <td className="p-2 font-medium">{operator.name}</td>
      <td className="p-2 text-muted-foreground">{operator.role}</td>
      <td className="p-2">
        <div className="flex items-center justify-end gap-2">
          <Input
            className="h-8 w-24"
            inputMode="numeric"
            maxLength={4}
            placeholder="Nuevo PIN"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={pending || newPin.length !== 4}
            onClick={() =>
              start(async () => {
                const r = await saveOperatorAction({
                  id: operator.id,
                  name: operator.name,
                  role: operator.role,
                  pin: newPin,
                });
                if (r.ok) {
                  toast.success("PIN actualizado");
                  setNewPin("");
                  onDone();
                } else toast.error(r.error ?? "Error");
              })
            }
          >
            Cambiar PIN
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await archiveOperatorAction(operator.id);
                if (r.ok) onDone();
                else toast.error(r.error ?? "Error");
              })
            }
          >
            Archivar
          </Button>
        </div>
      </td>
    </tr>
  );
}
