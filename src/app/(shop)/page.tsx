// Portada pública (§7.1). Placeholder de Fase 0 — la portada real es Fase 1.
export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center gap-4 p-8">
      <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
        Glass · Fase 0
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">
        Andamiaje en pie.
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Catálogo, punto de venta e inventario. La portada real llega en la Fase 1.
      </p>
      <a className="font-medium underline" href="/catalogo">
        Ver catálogo
      </a>
    </main>
  );
}
