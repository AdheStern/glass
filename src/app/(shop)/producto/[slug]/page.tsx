import type { Metadata } from "next";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getDisplayPrice } from "@/catalog/pricing-view";
import {
  getProductBySlug,
  getStaticProductSlugs,
  resolveSlugRedirect,
} from "@/catalog/queries";
import { getStockView } from "@/catalog/stock-view";
import type { ProductDetail } from "@/catalog/types";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { PriceTag } from "@/components/price-tag";
import { BadgeSkeleton, PriceSkeleton } from "@/components/skeletons";
import { StockBadge } from "@/components/stock-badge";
import { getSiteSettings } from "@/db/settings";
import { formatBob } from "@/domain/money";

type Params = { slug: string };

export async function generateStaticParams() {
  const slugs = await getStaticProductSlugs(100);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return {};
  const description =
    p.description ?? `${p.name} disponible en nuestro catálogo.`;
  return {
    title: p.name,
    description: description.slice(0, 160),
    openGraph: { title: p.name, description: description.slice(0, 160) },
  };
}

async function ProductJsonLd({ product }: { product: ProductDetail }) {
  await connection();
  const [price, stock, settings] = await Promise.all([
    getDisplayPrice(product.id),
    getStockView(product.id),
    getSiteSettings(),
  ]);
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.images.map((i) => i.url),
    offers: {
      "@type": "Offer",
      priceCurrency: settings.currency,
      price: (
        (price?.effectiveFromPriceBob ?? price?.fromPriceBob ?? 0) / 100
      ).toFixed(2),
      availability: stock.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
  return <JsonLd data={data} />;
}

async function AddToCart({ productId }: { productId: string }) {
  await connection();
  const stock = await getStockView(productId);
  if (!stock.available) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled
          className="rounded-lg bg-black/10 px-5 py-3 font-medium text-black/40"
        >
          Agotado
        </button>
        <a href="#avisame" className="text-sm text-[var(--brand)] underline">
          Avísame cuando vuelva
        </a>
      </div>
    );
  }
  return (
    <button
      type="button"
      className="rounded-lg bg-[var(--brand)] px-5 py-3 font-medium text-[var(--on-brand)]"
    >
      Agregar al pedido
    </button>
  );
}

export default async function ProductoPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    const target = await resolveSlugRedirect(slug);
    if (target) permanentRedirect(`/producto/${target}`);
    notFound();
  }

  const primary = product.categories[0];
  const crumbs = [
    { label: "Inicio", href: "/" },
    { label: "Catálogo", href: "/catalogo" },
    ...(primary?.parentSlug
      ? [
          {
            label: primary.parentName ?? "",
            href: `/catalogo/${primary.parentSlug}`,
          },
        ]
      : []),
    ...(primary
      ? [{ label: primary.name, href: `/catalogo/${primary.slug}` }]
      : []),
    { label: product.name },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <Suspense fallback={null}>
        <ProductJsonLd product={product} />
      </Suspense>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.label,
          })),
        }}
      />

      <Breadcrumbs items={crumbs} />

      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div className="grid gap-3">
          {product.images.length > 0 ? (
            product.images.map((img, i) => (
              <div
                key={img.url}
                className="relative overflow-hidden rounded-[var(--radius-card)] bg-black/5"
                style={{ aspectRatio: "1 / 1" }}
              >
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  unoptimized
                  priority={i === 0}
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover"
                  placeholder={img.blurDataUrl ? "blur" : "empty"}
                  blurDataURL={img.blurDataUrl ?? undefined}
                />
              </div>
            ))
          ) : (
            <div
              className="rounded-[var(--radius-card)] bg-black/5"
              style={{ aspectRatio: "1 / 1" }}
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>

          <Suspense fallback={<PriceSkeleton />}>
            <PriceTag productId={product.id} size="lg" />
          </Suspense>
          <Suspense fallback={<BadgeSkeleton />}>
            <StockBadge productId={product.id} />
          </Suspense>

          {product.description && (
            <p className="whitespace-pre-line text-black/70">
              {product.description}
            </p>
          )}

          {product.variants.length > 1 && (
            <ul className="flex flex-col gap-1 text-sm text-black/60">
              {product.variants.map((v) => (
                <li key={v.id}>
                  {v.attributes
                    ? Object.entries(v.attributes)
                        .map(([k, val]) => `${k}: ${val}`)
                        .join(" · ")
                    : (v.sku ?? "Variante")}{" "}
                  — {formatBob(v.basePriceBob)}
                </li>
              ))}
            </ul>
          )}

          <Suspense
            fallback={
              <div className="h-12 w-40 animate-pulse rounded-lg bg-black/10" />
            }
          >
            <AddToCart productId={product.id} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
