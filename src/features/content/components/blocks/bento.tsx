import Link from "next/link";
import { prisma } from "@/db/client";
import { getSiteSettings } from "@/db/settings";
import { sanitizeRichText } from "@/domain/rich-text";
import { ProductCard } from "@/features/catalog/components/product-card";
import { queryCatalogList } from "@/features/catalog/list-query";
import type { ProductCardData } from "@/features/catalog/types";
import { resolveCardPresetName } from "@/theme/card-presets";
import { BentoData } from "../../blocks/schemas";
import { StaggerGrid } from "../animated";
import { BlockImage } from "../block-image";
import { RichTextView } from "../rich-text-view";

const SPAN: Record<string, string> = {
  S: "col-span-1 sm:col-span-3 row-span-1",
  M: "col-span-2 sm:col-span-6 row-span-1",
  L: "col-span-2 sm:col-span-6 row-span-2",
  XL: "col-span-2 sm:col-span-12 row-span-2",
};

export async function BentoBlock({ data }: { data: unknown }) {
  const d = BentoData.parse(data);
  if (d.pieces.length === 0) return null;

  const productIds = d.pieces
    .filter((p) => p.kind === "product" && p.ref)
    .map((p) => p.ref);
  const categorySlugs = d.pieces
    .filter((p) => p.kind === "category" && p.ref)
    .map((p) => p.ref);

  const [settings, products, categories] = await Promise.all([
    getSiteSettings(),
    productIds.length
      ? queryCatalogList({
          categoryIds: null,
          productIds,
          filters: {},
          sort: "featured",
          page: 1,
          pageSize: 24,
          stockDisplay: "UMBRAL",
          lowStockThreshold: 5,
        }).then((r) => r.products)
      : Promise.resolve([] as ProductCardData[]),
    categorySlugs.length
      ? prisma.category.findMany({
          where: { slug: { in: categorySlugs } },
          select: { slug: true, name: true },
        })
      : Promise.resolve([] as { slug: string; name: string }[]),
  ]);

  const productBySlugId = new Map(products.map((p) => [p.id, p]));
  const catBySlug = new Map(categories.map((c) => [c.slug, c.name]));
  const preset = resolveCardPresetName(settings.cardPreset);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12">
      <StaggerGrid className="grid auto-rows-[minmax(120px,auto)] grid-cols-2 gap-3 sm:grid-cols-12">
        {d.pieces.map((piece, i) => {
          const cls = `${SPAN[piece.size] ?? SPAN.S} overflow-hidden rounded-xl`;
          if (piece.kind === "product") {
            const p = productBySlugId.get(piece.ref);
            return (
              <div key={i} className={cls}>
                {p ? <ProductCard product={p} preset={preset} /> : null}
              </div>
            );
          }
          if (piece.kind === "category") {
            return (
              <Link
                key={i}
                href={`/catalogo/${piece.ref}`}
                className={`${cls} flex items-end bg-[var(--brand)] p-4 text-[var(--on-brand)]`}
              >
                <span className="text-lg font-semibold">
                  {catBySlug.get(piece.ref) ?? piece.ref}
                </span>
              </Link>
            );
          }
          if (piece.kind === "image") {
            return (
              <div key={i} className={cls}>
                <BlockImage
                  path={piece.imagePath}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            );
          }
          if (piece.kind === "stat") {
            return (
              <div
                key={i}
                className={`${cls} flex flex-col justify-center border border-black/10 p-4`}
              >
                <span className="text-3xl font-bold tracking-tight">
                  {piece.stat?.value}
                </span>
                <span className="text-sm text-black/60">
                  {piece.stat?.label}
                </span>
              </div>
            );
          }
          return (
            <div
              key={i}
              className={`${cls} flex flex-col justify-center border border-black/10 p-4 text-black/75`}
            >
              <RichTextView value={sanitizeRichText(piece.text)} />
            </div>
          );
        })}
      </StaggerGrid>
    </section>
  );
}
