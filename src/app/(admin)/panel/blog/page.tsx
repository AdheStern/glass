import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requirePanel } from "@/features/auth/roles";
import { DocList } from "@/features/content/components/panel/doc-list";
import { listPostsForPanel } from "@/features/content/panel-queries";

export const metadata: Metadata = { title: "Blog" };
export const instant = false;

export default async function BlogPanelPage() {
  await requirePanel("PROPIETARIO", "ADMINISTRADOR");
  const rows = await listPostsForPanel();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Blog</h1>
        <Button asChild size="sm">
          <Link href="/panel/blog/nueva">Nueva entrada</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Opcional (§11.2). El que escribe consigue tráfico de búsqueda real.
      </p>
      <DocList kind="post" rows={rows} basePath="/panel/blog" />
    </div>
  );
}
