// Glass — portada por defecto cuando el comercio no armó una con bloques. La
// disposición sale del preset / de `settings.homeLayout` (§10.1): 5 variantes.
import Link from "next/link";
import { getSiteSettings } from "@/db/settings";
import { CategoryNav } from "@/features/catalog/components/category-nav";
import { ProductGrid } from "@/features/catalog/components/product-grid";
import { getCategoryTree, getFeatured } from "@/features/catalog/queries";
import type { CategoryNode, ProductCardData } from "@/features/catalog/types";
import {
  type CardPresetName,
  resolveCardPresetName,
} from "@/theme/card-presets";
import { type HomeLayoutName, resolveHomeLayoutName } from "@/theme/presets";

interface Parts {
  name: string;
  tree: CategoryNode[];
  featured: ProductCardData[];
  card: CardPresetName;
}

export async function DefaultHome({
  layout,
  cardPreset,
}: {
  layout?: HomeLayoutName;
  cardPreset?: CardPresetName;
} = {}) {
  const [settings, tree, featured] = await Promise.all([
    getSiteSettings(),
    getCategoryTree(),
    getFeatured(8),
  ]);
  const parts: Parts = {
    name: settings.name,
    tree,
    featured,
    card: cardPreset ?? resolveCardPresetName(settings.cardPreset),
  };
  const which = layout ?? resolveHomeLayoutName(settings.homeLayout);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      {which === "HERO" && <HeroHome {...parts} />}
      {which === "BENTO" && <BentoHome {...parts} />}
      {which === "CAROUSEL" && <CarouselHome {...parts} />}
      {which === "DIRECTO" && <DirectoHome {...parts} />}
      {which === "EDITORIAL" && <EditorialHome {...parts} />}
    </div>
  );
}

function CtaLink({ children = "Ver catálogo" }: { children?: string }) {
  return (
    <Link
      href="/catalogo"
      className="inline-block rounded-lg bg-[var(--surface)] px-4 py-2 font-medium text-[var(--ink)]"
    >
      {children}
    </Link>
  );
}

function Featured({ parts }: { parts: Parts }) {
  return (
    <>
      <h2 className="mb-4 text-xl font-bold tracking-tight">Destacados</h2>
      <ProductGrid products={parts.featured} preset={parts.card} />
    </>
  );
}

function HeroHome(parts: Parts) {
  return (
    <>
      <section className="mb-8 rounded-2xl bg-[var(--brand)] px-6 py-12 text-[var(--on-brand)]">
        <p className="font-mono text-xs uppercase tracking-widest opacity-80">
          {parts.name}
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Todo lo que buscás, a un mensaje de distancia.
        </h1>
        <div className="mt-6">
          <CtaLink />
        </div>
      </section>
      <div className="mb-6">
        <CategoryNav tree={parts.tree} />
      </div>
      <Featured parts={parts} />
    </>
  );
}

function DirectoHome(parts: Parts) {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{parts.name}</h1>
        <CtaLink>Ver todo el catálogo</CtaLink>
      </div>
      <div className="mb-6">
        <CategoryNav tree={parts.tree} />
      </div>
      <Featured parts={parts} />
    </>
  );
}

function CarouselHome(parts: Parts) {
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">{parts.name}</h1>
      <div className="-mx-1 mb-8 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {parts.tree.map((cat) => (
          <Link
            key={cat.id}
            href={`/catalogo/${cat.slug}`}
            className="flex h-24 w-40 shrink-0 snap-start items-end rounded-xl bg-[var(--brand)] p-3 font-medium text-[var(--on-brand)]"
          >
            {cat.name}
          </Link>
        ))}
      </div>
      <Featured parts={parts} />
    </>
  );
}

function BentoHome(parts: Parts) {
  const [lead, ...rest] = parts.featured;
  return (
    <>
      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-[var(--brand)] p-6 text-[var(--on-brand)] sm:col-span-2 sm:row-span-2">
          <p className="font-mono text-xs uppercase tracking-widest opacity-80">
            {parts.name}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Lo mejor de la casa
          </h1>
          <div className="mt-6">
            <CtaLink />
          </div>
        </div>
        {parts.tree.slice(0, 2).map((cat) => (
          <Link
            key={cat.id}
            href={`/catalogo/${cat.slug}`}
            className="flex items-end rounded-2xl border border-black/10 p-4 font-medium"
          >
            {cat.name}
          </Link>
        ))}
      </section>
      {lead && <Featured parts={{ ...parts, featured: [lead, ...rest] }} />}
    </>
  );
}

function EditorialHome(parts: Parts) {
  return (
    <>
      <section className="mb-12 max-w-3xl py-10">
        <p className="text-sm uppercase tracking-[0.2em] text-black/50">
          {parts.name}
        </p>
        <h1 className="mt-4 text-4xl leading-tight tracking-tight sm:text-5xl">
          Piezas elegidas con cuidado, una por una.
        </h1>
        <p className="mt-6 text-lg text-black/60">
          Mirá la selección de esta temporada o recorré el catálogo completo.
        </p>
        <div className="mt-8">
          <CtaLink />
        </div>
      </section>
      <Featured parts={parts} />
    </>
  );
}
