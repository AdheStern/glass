// Glass — tipos de la superficie compradora (§7).

export type CatalogSort = "featured" | "price_asc" | "price_desc" | "new";
export type Availability = "all" | "in" | "out";

export interface CatalogFilters {
  minPriceBob?: number;
  maxPriceBob?: number;
  availability?: Availability;
  discounted?: boolean;
}

export interface CatalogImage {
  url: string;
  alt: string;
  blurDataUrl: string | null;
}

/** Datos de la grilla del catálogo. Cacheados con `catalog` + TTL de minutos
 *  (§7.1): el precio/existencia exactos por producto viven en la ficha, no aquí. */
export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  image: CatalogImage | null;
  /** Precio base más bajo entre variantes. */
  fromPriceBob: number;
  /** Precio efectivo tras el mejor descuento vigente (= fromPriceBob si no hay). */
  effectiveFromPriceBob: number;
  discountLabel: string | null;
  variantCount: number;
  stock: {
    kind: "in" | "low" | "available" | "out";
    text: string;
    available: boolean;
  };
}

export interface CatalogPage {
  products: ProductCardData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CategoryNode {
  id: string;
  slug: string;
  name: string;
  children: { id: string; slug: string; name: string }[];
}

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  images: CatalogImage[];
  categories: {
    slug: string;
    name: string;
    parentSlug: string | null;
    parentName: string | null;
  }[];
  variants: {
    id: string;
    sku: string | null;
    barcode: string | null;
    attributes: Record<string, string> | null;
    basePriceBob: number;
  }[];
}
