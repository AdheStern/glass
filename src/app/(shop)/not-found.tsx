import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <h1 className="text-2xl font-bold tracking-tight">
        No encontramos esa página
      </h1>
      <p className="text-black/60">
        Puede que el producto ya no esté o el enlace haya cambiado.
      </p>
      <Link
        href="/catalogo"
        className="rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-[var(--on-brand)]"
      >
        Ir al catálogo
      </Link>
    </div>
  );
}
