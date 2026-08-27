"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createStockCountAction } from "../actions";

type Scope = "TODO" | "CATEGORIA" | "LIBRE";

export function NewCountForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>("CATEGORIA");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      const r = await createStockCountAction({ scope, categoryId, note });
      if (r.ok && r.id) {
        router.push(`/panel/inventario/tomas/${r.id}`);
      } else {
        toast.error(r.error ?? "Error");
      }
    });
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label>Alcance</Label>
        <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CATEGORIA">Una categoría</SelectItem>
            <SelectItem value="TODO">Toda la tienda</SelectItem>
            <SelectItem value="LIBRE">Libre (cuento lo que escanee)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Una toma parcial vale igual que una completa (§14.3).
        </p>
      </div>

      {scope === "CATEGORIA" && (
        <div className="flex flex-col gap-1">
          <Label>Categoría</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Elegí una categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <Label htmlFor="count-note">Nota</Label>
        <Textarea
          id="count-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <Button disabled={pending} onClick={submit} className="self-start">
        Iniciar toma
      </Button>
    </div>
  );
}
