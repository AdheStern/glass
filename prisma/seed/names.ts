// Glass — nombres de producto para una tienda de celulares boliviana ficticia.
// Determinista: depende solo del Rng sembrado. La marca es la categoría padre.
import type { Rng } from "./lib";

export const NOUNS_BY_PARENT: Record<string, string[]> = {
  Xiaomi: [
    "Redmi Note 13",
    "Redmi Note 13 Pro",
    "Redmi Note 13 Pro+",
    "Redmi Note 12",
    "Redmi 13C",
    "Redmi 12",
    "Redmi A3",
    "POCO X6 Pro",
    "POCO X6",
    "POCO M6 Pro",
    "POCO C65",
    "POCO F6",
    "Xiaomi 14",
    "Xiaomi 13T Pro",
    "Xiaomi 13T",
    "Redmi Note 13 5G",
  ],
  Samsung: [
    "Galaxy S24 Ultra",
    "Galaxy S24+",
    "Galaxy S24",
    "Galaxy S23 FE",
    "Galaxy A55",
    "Galaxy A35",
    "Galaxy A25",
    "Galaxy A15",
    "Galaxy A05s",
    "Galaxy A05",
    "Galaxy M14",
    "Galaxy M34",
    "Galaxy Z Flip5",
    "Galaxy Z Fold5",
    "Galaxy S23",
  ],
  Honor: [
    "Magic6 Pro",
    "Magic6 Lite",
    "Magic5 Lite",
    "X9b",
    "X8b",
    "X7b",
    "X6a",
    "X5",
    "Honor 90",
    "Honor 90 Lite",
    "Honor 200",
    "Honor 200 Lite",
  ],
  Apple: [
    "iPhone 15 Pro Max",
    "iPhone 15 Pro",
    "iPhone 15 Plus",
    "iPhone 15",
    "iPhone 14 Pro Max",
    "iPhone 14 Plus",
    "iPhone 14",
    "iPhone 13",
    "iPhone 13 mini",
    "iPhone SE (3.ª gen)",
    "iPhone 12",
    "iPhone 11",
  ],
  Accesorios: [
    "Funda de silicona",
    "Funda antishock",
    "Funda transparente",
    "Vidrio templado",
    "Mica de hidrogel",
    "Cargador rápido 33 W",
    "Cargador rápido 67 W",
    "Cargador MagSafe",
    "Cable USB-C a USB-C",
    "Cable Lightning",
    "Audífonos Bluetooth",
    "Audífonos in-ear con cable",
    "Power bank 10 000 mAh",
    "Power bank 20 000 mAh",
    "Soporte para auto",
    "Pop socket",
  ],
};

/** Almacenamiento / RAM para los celulares. */
const PHONE_SPECS = [
  "128 GB",
  "256 GB",
  "256 GB",
  "512 GB",
  "8/256",
  "12/512",
  "128 GB",
];

/** Colores para accesorios (una parte sin color). */
const ACCESSORY_SPECS = ["negro", "azul", "transparente", "", "", ""];

const PHONE_BRANDS = new Set(["Xiaomi", "Samsung", "Honor", "Apple"]);

export function productName(rng: Rng, parentName: string): string {
  const nouns = NOUNS_BY_PARENT[parentName] ?? NOUNS_BY_PARENT.Xiaomi;
  const noun = rng.pick(nouns);
  if (!PHONE_BRANDS.has(parentName)) {
    const spec = rng.pick(ACCESSORY_SPECS);
    return [noun, spec].filter(Boolean).join(" ");
  }
  const prefix = parentName === "Apple" ? "" : `${parentName} `;
  return `${prefix}${noun} ${rng.pick(PHONE_SPECS)}`;
}

export function productDescription(rng: Rng, name: string): string {
  const openers = [
    "Equipo nuevo, sellado, con garantía de la tienda.",
    "Liberado de fábrica, compatible con todas las operadoras del país.",
    "Incluye cargador, cable y funda de regalo.",
    "Financiamiento disponible; consultá las cuotas por WhatsApp.",
    "Stock limitado. Retiro en tienda o envío a todo el país.",
  ];
  return `${name}. ${rng.pick(openers)} Consultá disponibilidad por WhatsApp.`;
}

// Productos fijos: slugs estables para la demo y objetivos de búsqueda predecibles.
export const HERO_PRODUCTS: {
  name: string;
  slug: string;
  parent: string;
  priceBob: number;
}[] = [
  // Los dos primeros son anclas de las pruebas e2e: barcodes fijos
  // 7501000000000 / 7501000000001 y precio conocido (Bs 125,00 el segundo).
  {
    name: "Vidrio templado (pack x2)",
    slug: "vidrio-templado-pack-2",
    parent: "Accesorios",
    priceBob: 3_500,
  },
  {
    name: "Cargador rápido 33 W",
    slug: "cargador-rapido-33w",
    parent: "Accesorios",
    priceBob: 12_500,
  },
  {
    name: "iPhone 15 Pro Max 256 GB",
    slug: "iphone-15-pro-max-256",
    parent: "Apple",
    priceBob: 1_350_000,
  },
  {
    name: "iPhone 15 128 GB",
    slug: "iphone-15-128",
    parent: "Apple",
    priceBob: 850_000,
  },
  {
    name: "iPhone 13 128 GB",
    slug: "iphone-13-128",
    parent: "Apple",
    priceBob: 590_000,
  },
  {
    name: "Samsung Galaxy S24 Ultra 512 GB",
    slug: "samsung-galaxy-s24-ultra-512",
    parent: "Samsung",
    priceBob: 1_290_000,
  },
  {
    name: "Samsung Galaxy A55 256 GB",
    slug: "samsung-galaxy-a55-256",
    parent: "Samsung",
    priceBob: 275_000,
  },
  {
    name: "Samsung Galaxy A15 128 GB",
    slug: "samsung-galaxy-a15-128",
    parent: "Samsung",
    priceBob: 145_000,
  },
  {
    name: "Xiaomi Redmi Note 13 Pro 256 GB",
    slug: "xiaomi-redmi-note-13-pro-256",
    parent: "Xiaomi",
    priceBob: 235_000,
  },
  {
    name: "Xiaomi POCO X6 Pro 12/512",
    slug: "xiaomi-poco-x6-pro-12-512",
    parent: "Xiaomi",
    priceBob: 265_000,
  },
  {
    name: "Xiaomi Redmi 13C 128 GB",
    slug: "xiaomi-redmi-13c-128",
    parent: "Xiaomi",
    priceBob: 98_000,
  },
  {
    name: "Honor Magic6 Pro 512 GB",
    slug: "honor-magic6-pro-512",
    parent: "Honor",
    priceBob: 820_000,
  },
  {
    name: "Honor X8b 256 GB",
    slug: "honor-x8b-256",
    parent: "Honor",
    priceBob: 185_000,
  },
  {
    name: "Audífonos Bluetooth",
    slug: "audifonos-bluetooth",
    parent: "Accesorios",
    priceBob: 18_000,
  },
];
