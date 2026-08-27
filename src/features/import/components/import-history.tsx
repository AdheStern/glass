"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { undoImportAction } from "../actions";

interface Batch {
  id: string;
  createdAt: string | Date;
  rowCount: number;
  createdCount: number;
  updatedCount: number;
  status: string;
  canUndo: boolean;
}

export function ImportHistory({ batches }: { batches: Batch[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (batches.length === 0) return null;

  function undo(id: string) {
    start(async () => {
      const r = await undoImportAction(id);
      if (r.ok) {
        toast.success("Importación deshecha");
        router.refresh();
      } else {
        toast.error(r.error ?? "No se pudo deshacer");
      }
    });
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Filas</TableHead>
            <TableHead>Nuevos</TableHead>
            <TableHead>Actualizados</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((b) => (
            <TableRow key={b.id}>
              <TableCell>
                {new Date(b.createdAt).toLocaleString("es-BO")}
              </TableCell>
              <TableCell>{b.rowCount}</TableCell>
              <TableCell>{b.createdCount}</TableCell>
              <TableCell>{b.updatedCount}</TableCell>
              <TableCell>
                {b.status === "UNDONE" ? (
                  <Badge variant="outline">Deshecha</Badge>
                ) : (
                  <Badge variant="secondary">Aplicada</Badge>
                )}
              </TableCell>
              <TableCell>
                {b.canUndo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => undo(b.id)}
                  >
                    Deshacer
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
