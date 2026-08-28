"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deletePageAction, deletePostAction } from "../../actions";
import type { PanelDocRow } from "../../panel-queries";

export function DocList({
  kind,
  rows,
  basePath,
}: {
  kind: "page" | "post";
  rows: PanelDocRow[];
  basePath: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function remove(id: string) {
    start(async () => {
      const r =
        kind === "page"
          ? await deletePageAction(id)
          : await deletePostAction(id);
      if (r.ok) {
        toast.success("Eliminado");
        router.refresh();
      } else toast.error(r.error ?? "No se pudo");
    });
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nada todavía.</p>;
  }

  return (
    <ul className="flex flex-col divide-y">
      {rows.map((row) => (
        <li key={row.id} className="flex items-center gap-3 py-3">
          <Link href={`${basePath}/${row.id}`} className="flex-1">
            <span className="font-medium">{row.title}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              /{row.slug} ·{" "}
              {row.status === "PUBLISHED" ? "publicada" : "borrador"}
            </span>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" disabled={pending}>
                Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar «{row.title}»?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se borra junto con sus bloques. No se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => remove(row.id)}>
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </li>
      ))}
    </ul>
  );
}
