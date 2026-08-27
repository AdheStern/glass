import { prisma } from "@/db/client";

// Catálogo público (§7). Placeholder de Fase 0: solo confirma la conexión a datos.
// La grilla real, los filtros y la separación estático/dinámico son Fase 1.
export const dynamic = "force-dynamic";

export default async function CatalogoPage() {
  let count: number | null = null;
  try {
    count = await prisma.product.count({ where: { isActive: true, archivedAt: null } });
  } catch {
    count = null;
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Catálogo</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        {count === null
          ? "Sin conexión a la base de datos todavía."
          : `${count.toLocaleString("es-BO")} productos activos sembrados.`}
      </p>
    </main>
  );
}
