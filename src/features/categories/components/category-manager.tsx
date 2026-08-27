"use client";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { archiveCategoryAction, saveCategoryAction } from "../actions";
import type { CategoryTreeNode } from "../queries";

interface Editing {
  id?: string;
  name: string;
  parentId: string | null;
}

const NONE = "__none__";

export function CategoryManager({
  tree,
  parents,
}: {
  tree: CategoryTreeNode[];
  parents: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [pending, start] = useTransition();

  function save() {
    if (!editing) return;
    start(async () => {
      const r = await saveCategoryAction({
        id: editing.id,
        name: editing.name,
        parentId: editing.parentId,
      });
      if (r.ok) {
        toast.success("Categoría guardada");
        setEditing(null);
        router.refresh();
      } else {
        toast.error(r.error ?? "No se pudo guardar");
      }
    });
  }

  function remove() {
    if (!confirm) return;
    start(async () => {
      const r = await archiveCategoryAction(confirm.id);
      if (r.ok) {
        toast.success("Categoría archivada");
        setConfirm(null);
        router.refresh();
      } else {
        toast.error(r.error ?? "No se pudo archivar");
      }
    });
  }

  const Row = ({
    id,
    name,
    productCount,
    depth,
  }: {
    id: string;
    name: string;
    productCount: number;
    depth: number;
  }) => (
    <div
      className="flex items-center justify-between rounded-md border px-3 py-2"
      style={{ marginLeft: depth * 20 }}
    >
      <span className="flex items-center gap-2">
        {depth ? <span className="text-muted-foreground">—</span> : null}
        <span className={depth ? "" : "font-medium"}>{name}</span>
        <Badge variant="secondary">{productCount}</Badge>
      </span>
      <span className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            setEditing({
              id,
              name,
              parentId: depth
                ? (tree.find((p) => p.children.some((c) => c.id === id))?.id ??
                  null)
                : null,
            })
          }
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setConfirm({ id, name })}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button onClick={() => setEditing({ name: "", parentId: null })}>
          <Plus className="mr-1 size-4" /> Nueva categoría
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {tree.map((p) => (
          <div key={p.id} className="flex flex-col gap-1">
            <Row
              id={p.id}
              name={p.name}
              productCount={p.productCount}
              depth={0}
            />
            {p.children.map((c) => (
              <Row
                key={c.id}
                id={c.id}
                name={c.name}
                productCount={c.productCount}
                depth={1}
              />
            ))}
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Editar categoría" : "Nueva categoría"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-name">Nombre</Label>
              <Input
                id="cat-name"
                value={editing?.name ?? ""}
                onChange={(e) =>
                  setEditing((s) => (s ? { ...s, name: e.target.value } : s))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Categoría padre</Label>
              <Select
                value={editing?.parentId ?? NONE}
                onValueChange={(v) =>
                  setEditing((s) =>
                    s ? { ...s, parentId: v === NONE ? null : v } : s,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>
                    Sin padre (nivel principal)
                  </SelectItem>
                  {parents
                    .filter((p) => p.id !== editing?.id)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={pending || !editing?.name}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar «{confirm?.name}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Los productos dejan de estar en esta categoría. No se borra nada
              más.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={pending}>
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
