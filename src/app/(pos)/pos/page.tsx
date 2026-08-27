// POS — placeholder de Fase 0. La pantalla de venta es Fase 5; el modo sin
// conexión, Fase 6.
export default function PosPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Caja</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Emparejamiento de dispositivo y PIN de operador se modelan en la Fase 0;
        la venta, en la Fase 5.
      </p>
    </main>
  );
}
