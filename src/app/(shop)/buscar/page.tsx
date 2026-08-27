import type { Metadata } from "next";
import { Suspense } from "react";
import { GridSkeleton } from "@/components/skeletons";
import { CatalogView } from "@/features/catalog/components/catalog-view";
import {
  parseCatalogParams,
  type SearchParams,
} from "@/features/catalog/params";

export const metadata: Metadata = { title: "Buscar", robots: { index: false } };

function SearchForm() {
  return (
    <form method="get" action="/buscar" className="flex gap-2">
      <input
        name="q"
        placeholder="taladro, pintura, cable…"
        className="flex-1 rounded-lg border border-black/15 bg-white px-3 py-2"
      />
      <button
        type="submit"
        className="rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-[var(--on-brand)]"
      >
        Buscar
      </button>
    </form>
  );
}

async function BuscarInner({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const parsed = parseCatalogParams(await searchParams);

  if (!parsed.q) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <h1 className="mb-4 text-2xl font-bold tracking-tight">Buscar</h1>
        <SearchForm />
      </div>
    );
  }

  return (
    <CatalogView
      heading={`Resultados para «${parsed.q}»`}
      mode="search"
      basePath="/buscar"
      searchParams={searchParams}
    />
  );
}

export default function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-6xl px-4 py-10">
          <GridSkeleton />
        </div>
      }
    >
      <BuscarInner searchParams={searchParams} />
    </Suspense>
  );
}
