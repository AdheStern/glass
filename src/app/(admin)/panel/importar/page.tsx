import type { Metadata } from "next";
import { requirePanel } from "@/features/auth/roles";
import { ImportHistory } from "@/features/import/components/import-history";
import { ImportWizard } from "@/features/import/components/import-wizard";
import { listRecentImports } from "@/features/import/queries";

export const metadata: Metadata = { title: "Importar" };

export default async function ImportarPage() {
  await requirePanel("PROPIETARIO", "ADMINISTRADOR");
  const batches = await listRecentImports();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Importar productos
        </h1>
        <p className="text-sm text-muted-foreground">
          Coincidencia por código de barras o SKU: reimportar la misma planilla
          es inocuo (§19.2). Reversible durante 24 horas.
        </p>
      </div>
      <ImportWizard />
      {batches.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Importaciones recientes</h2>
          <ImportHistory batches={batches} />
        </div>
      )}
    </div>
  );
}
