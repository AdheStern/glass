"use client";
import Papa from "papaparse";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { applyImportAction, type RowError } from "../actions";
import { autoMap, FIELD_KEYS, FIELD_LABELS, type FieldKey } from "../schema";

type Row = Record<string, string>;
const IGNORE = "__ignore__";

export function ImportWizard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<Record<string, FieldKey | null>>({});
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    batchId?: string;
    errors?: RowError[];
  } | null>(null);
  const [pending, start] = useTransition();

  function onFile(file: File) {
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const hs = res.meta.fields ?? [];
        setHeaders(hs);
        setRows(res.data);
        setMapping(autoMap(hs));
        setResult(null);
      },
      error: () => toast.error("No se pudo leer el CSV"),
    });
  }

  const preview = useMemo(() => rows.slice(0, 20), [rows]);
  const mappedFields = Object.values(mapping).filter(Boolean) as FieldKey[];
  const canApply =
    mappedFields.includes("name") && mappedFields.includes("priceBs");

  function apply() {
    start(async () => {
      const r = await applyImportAction({ mapping, rows });
      if (r.ok) {
        setResult({
          created: r.created ?? 0,
          updated: r.updated ?? 0,
          batchId: r.batchId,
        });
        toast.success(
          `Importado: ${r.created} nuevos, ${r.updated} actualizados`,
        );
        setRows([]);
        setHeaders([]);
      } else if (r.errors) {
        setResult({ created: 0, updated: 0, errors: r.errors });
        toast.error(r.error ?? "Errores en el archivo");
      } else {
        toast.error(r.error ?? "No se pudo importar");
      }
    });
  }

  function downloadErrors(errors: RowError[]) {
    const csv = [
      "fila,error",
      ...errors.map((e) => `${e.row},"${e.message}"`),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "errores-importacion.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (result?.errors) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {result.errors.length} fila(s) con errores — no se importó nada
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Una importación es todo o nada (§19.2). Corregí el archivo y volvé a
            subirlo.
          </p>
          <div className="max-h-64 overflow-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Fila</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.errors.slice(0, 100).map((e) => (
                  <TableRow key={e.row}>
                    <TableCell>{e.row}</TableCell>
                    <TableCell>{e.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => downloadErrors(result.errors ?? [])}
            >
              Descargar errores
            </Button>
            <Button onClick={() => setResult(null)}>Volver</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Importación lista</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p>
            {result.created} productos nuevos · {result.updated} actualizados.
          </p>
          <p className="text-sm text-muted-foreground">
            Se puede deshacer durante 24 horas desde la lista de importaciones.
          </p>
          <Button className="self-start" onClick={() => setResult(null)}>
            Importar otro archivo
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />

      {headers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <p className="text-sm text-muted-foreground">
              Subí un CSV con columnas de nombre y precio como mínimo.
            </p>
            <Button onClick={() => inputRef.current?.click()}>
              Elegir archivo CSV
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Asigná las columnas ({rows.length} filas)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {headers.map((h) => (
                <div
                  key={h}
                  className="flex items-center justify-between gap-3 rounded border p-2"
                >
                  <span className="truncate text-sm font-medium">{h}</span>
                  <Select
                    value={mapping[h] ?? IGNORE}
                    onValueChange={(v) =>
                      setMapping((m) => ({
                        ...m,
                        [h]: v === IGNORE ? null : (v as FieldKey),
                      }))
                    }
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={IGNORE}>Ignorar</SelectItem>
                      {FIELD_KEYS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {FIELD_LABELS[f]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vista previa (primeras 20)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h) => (
                      <TableHead key={h}>
                        {h}
                        {mapping[h] && (
                          <span className="block text-[10px] font-normal text-primary">
                            → {FIELD_LABELS[mapping[h] as FieldKey]}
                          </span>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((r, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: vista previa estática, no reordena
                    <TableRow key={`prev-${i}`}>
                      {headers.map((h) => (
                        <TableCell key={h} className="max-w-40 truncate">
                          {r[h]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={apply} disabled={!canApply || pending}>
              {pending ? "Importando…" : `Importar ${rows.length} filas`}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setHeaders([]);
                setRows([]);
              }}
            >
              Cancelar
            </Button>
          </div>
          {!canApply && (
            <p className="text-sm text-destructive">
              Asigná al menos «Nombre» y «Precio».
            </p>
          )}
        </>
      )}
    </div>
  );
}
