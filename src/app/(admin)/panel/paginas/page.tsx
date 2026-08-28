import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requirePanel } from "@/features/auth/roles";
import { DocList } from "@/features/content/components/panel/doc-list";
import { listPagesForPanel } from "@/features/content/panel-queries";

export const metadata: Metadata = { title: "Páginas" };
export const instant = false;

export default async function PaginasPage() {
  await requirePanel("PROPIETARIO", "ADMINISTRADOR");
  const rows = await listPagesForPanel();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Páginas</h1>
        <Button asChild size="sm">
          <Link href="/panel/paginas/nueva">Nueva página</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        La landing del comercio y sus páginas fijas (§11). Marcá una como
        portada para que reemplace la de inicio.
      </p>
      <DocList kind="page" rows={rows} basePath="/panel/paginas" />
    </div>
  );
}
