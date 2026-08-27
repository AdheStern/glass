// Panel — placeholder de Fase 0. El tablero real es Fase 8.
export default function PanelPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Panel</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Autenticación con Supabase y roles llegan cableados en la Fase 0; las
        pantallas de gestión, en la Fase 2.
      </p>
    </main>
  );
}
