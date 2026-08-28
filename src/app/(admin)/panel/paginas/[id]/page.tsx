import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePanel } from "@/features/auth/roles";
import { PageEditor } from "@/features/content/components/panel/page-editor";
import { getPageForPanel } from "@/features/content/panel-queries";

export const metadata: Metadata = { title: "Editar página" };
export const instant = false;

export default async function EditPaginaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePanel("PROPIETARIO", "ADMINISTRADOR");
  const { id } = await params;
  const page = await getPageForPanel(id);
  if (!page) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">{page.title}</h1>
      <PageEditor page={page} />
    </div>
  );
}
