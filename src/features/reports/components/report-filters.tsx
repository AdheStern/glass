// Glass — filtros de reporte (§18.2). Formulario GET nativo, sin JS.
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ReportDef } from "../registry";
import type { ReportFilters } from "../schemas";

export function ReportFiltersForm({
  def,
  current,
  operators,
}: {
  def: ReportDef;
  current: ReportFilters;
  operators: { id: string; name: string }[];
}) {
  const hasDates = def.slug !== "capital-dormido";
  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-3"
    >
      {hasDates && (
        <>
          <Field label="Desde">
            <Input type="date" name="from" defaultValue={current.from} />
          </Field>
          <Field label="Hasta">
            <Input type="date" name="to" defaultValue={current.to} />
          </Field>
        </>
      )}

      {def.filters.includes("operator") && (
        <Field label="Operador">
          <select
            name="operator"
            defaultValue={current.operator ?? ""}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">Todos</option>
            {operators.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {def.filters.includes("channel") && (
        <Field label="Canal">
          <select
            name="channel"
            defaultValue={current.channel ?? ""}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="MOSTRADOR">Mostrador</option>
            <option value="PEDIDO">Pedido</option>
          </select>
        </Field>
      )}

      {def.filters.includes("status") && (
        <Field label="Estado">
          <select
            name="status"
            defaultValue={current.status ?? ""}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">Todos</option>
            {["NUEVO", "CONFIRMADO", "PREPARADO", "ENTREGADO", "CANCELADO"].map(
              (s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ),
            )}
          </select>
        </Field>
      )}

      {def.filters.includes("unit") && (
        <Field label="Ordenar por">
          <select
            name="unit"
            defaultValue={current.unit ?? "unidades"}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="unidades">Unidades</option>
            <option value="dinero">Dinero</option>
          </select>
        </Field>
      )}

      <Button type="submit" size="sm">
        Aplicar
      </Button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
