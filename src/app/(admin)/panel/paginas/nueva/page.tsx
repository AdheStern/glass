import type { Metadata } from "next";
import { requirePanel } from "@/features/auth/roles";
import { PageEditor } from "@/features/content/components/panel/page-editor";

export const metadata: Metadata = { title: "Nueva página" };
export const instant = false;

export default async function NuevaPaginaPage() {
  await requirePanel("PROPIETARIO", "ADMINISTRADOR");
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Nueva página</h1>
      <PageEditor page={null} />
    </div>
  );
}
