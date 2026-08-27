// Glass — consulta de la grilla del catálogo. SQL crudo: un LATERAL por producto
// para el precio mínimo, el mejor descuento vigente, la primera imagen y la
// existencia. Una sola consulta (+ conteo): la grilla no hace 48 viajes a la BD.
import { Prisma } from "@prisma/client";
import { prisma } from "@/db/client";
import type { StockDisplay } from "@/db/settings";
import { publicImageUrl } from "./image";
import { labelFor } from "./stock-label";
import type {
  CatalogFilters,
  CatalogPage,
  CatalogSort,
  ProductCardData,
} from "./types";

interface Row {
  id: string;
  slug: string;
  name: string;
  image_path: string | null;
  image_alt: string | null;
  blur_data_url: string | null;
  from_price_bob: number | null;
  effective_price_bob: number | null;
  discount_label: string | null;
  variant_count: number | null;
  stock_qty: number;
}

const SORT_SQL: Record<CatalogSort, Prisma.Sql> = {
  featured: Prisma.sql`p.created_at asc, p.id asc`,
  new: Prisma.sql`p.created_at desc, p.id desc`,
  price_asc: Prisma.sql`fp.from_price_bob asc nulls last, p.id asc`,
  price_desc: Prisma.sql`fp.from_price_bob desc nulls last, p.id asc`,
};

export async function queryCatalogList(opts: {
  categoryIds: string[] | null;
  filters: CatalogFilters;
  sort: CatalogSort;
  page: number;
  pageSize: number;
  search?: string;
  stockDisplay: StockDisplay;
  lowStockThreshold: number;
}): Promise<CatalogPage> {
  const { categoryIds, filters, sort, page, pageSize, search } = opts;
  const offset = (page - 1) * pageSize;
  const q = search?.trim();

  const conds: Prisma.Sql[] = [
    Prisma.sql`p.is_active = true`,
    Prisma.sql`p.archived_at is null`,
    Prisma.sql`fp.from_price_bob is not null`,
  ];

  if (q) {
    conds.push(Prisma.sql`(
      p.search_tsv @@ websearch_to_tsquery('spanish', glass_immutable_unaccent(${q}))
      or glass_immutable_unaccent(lower(p.name)) % glass_immutable_unaccent(lower(${q}))
    )`);
  }
  if (categoryIds && categoryIds.length > 0) {
    conds.push(
      Prisma.sql`exists (select 1 from product_category pc where pc.product_id = p.id and pc.category_id in (${Prisma.join(categoryIds)}))`,
    );
  }
  if (filters.minPriceBob != null)
    conds.push(Prisma.sql`fp.from_price_bob >= ${filters.minPriceBob}`);
  if (filters.maxPriceBob != null)
    conds.push(Prisma.sql`fp.from_price_bob <= ${filters.maxPriceBob}`);
  if (filters.availability === "in")
    conds.push(Prisma.sql`coalesce(sk.qty, 0) > 0`);
  if (filters.availability === "out")
    conds.push(Prisma.sql`coalesce(sk.qty, 0) <= 0`);
  if (filters.discounted)
    conds.push(Prisma.sql`dsc.effective_price_bob is not null`);

  const from = Prisma.sql`
    from product p
    left join lateral (
      select v.base_price_bob as from_price_bob, v.id as vid, count(*) over () as variant_count
      from variant v
      where v.product_id = p.id and v.archived_at is null
      order by v.base_price_bob asc
      limit 1
    ) fp on true
    left join lateral (
      select path, alt, blur_data_url from product_image
      where product_id = p.id order by position asc limit 1
    ) img on true
    left join variant_stock sk on sk.variant_id = fp.vid
    left join lateral (
      select min(x.effective) as effective_price_bob,
             (array_agg(x.label order by x.effective asc))[1] as discount_label
      from (
        select
          case when d.percent is not null
               then greatest(0, fp.from_price_bob - round(fp.from_price_bob * d.percent / 100.0))::int
               else greatest(0, fp.from_price_bob - coalesce(d.amount_bob, 0)) end as effective,
          case when d.percent is not null then '−' || d.percent || '%' else 'Oferta' end as label
        from discount d
        where d.is_active = true and d.archived_at is null
          and (d.starts_at is null or d.starts_at <= now())
          and (d.ends_at is null or d.ends_at >= now())
          and (
            d.scope = 'GLOBAL'
            or (d.scope = 'PRODUCT' and exists (
              select 1 from "_DiscountToProduct" dp where dp."A" = d.id and dp."B" = p.id))
            or (d.scope = 'CATEGORY' and d.category_id is not null and exists (
              select 1 from product_category pc where pc.product_id = p.id and pc.category_id = d.category_id))
          )
      ) x
      where x.effective < fp.from_price_bob
    ) dsc on true
    where ${Prisma.join(conds, " and ")}
  `;

  const orderBy = q
    ? Prisma.sql`ts_rank(p.search_tsv, websearch_to_tsquery('spanish', glass_immutable_unaccent(${q}))) desc,
                 similarity(glass_immutable_unaccent(lower(p.name)), glass_immutable_unaccent(lower(${q}))) desc,
                 p.id asc`
    : SORT_SQL[sort];

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<Row[]>(Prisma.sql`
      select p.id, p.slug, p.name,
             img.path as image_path, img.alt as image_alt, img.blur_data_url,
             fp.from_price_bob, fp.variant_count::int as variant_count,
             dsc.effective_price_bob, dsc.discount_label,
             coalesce(sk.qty, 0)::int as stock_qty
      ${from}
      order by ${orderBy}
      limit ${pageSize} offset ${offset}
    `),
    prisma.$queryRaw<{ n: number }[]>(
      Prisma.sql`select count(*)::int as n from (select p.id ${from}) t`,
    ),
  ]);

  const total = countRows[0]?.n ?? 0;
  const products: ProductCardData[] = rows.map((r) => {
    const basePrice = r.from_price_bob ?? 0;
    const effective = r.effective_price_bob ?? basePrice;
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      image: r.image_path
        ? {
            url: publicImageUrl(r.image_path),
            alt: r.image_alt ?? r.name,
            blurDataUrl: r.blur_data_url,
          }
        : null,
      fromPriceBob: basePrice,
      effectiveFromPriceBob: effective,
      discountLabel: effective < basePrice ? r.discount_label : null,
      variantCount: r.variant_count ?? 1,
      stock: labelFor(r.stock_qty, opts.stockDisplay, opts.lowStockThreshold),
    };
  });

  return {
    products,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
