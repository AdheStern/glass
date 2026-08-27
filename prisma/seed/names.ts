// Glass — nombres de producto en español para una ferretería boliviana ficticia.
// Determinista: depende solo del Rng sembrado.
import type { Rng } from "./lib";

export const NOUNS_BY_PARENT: Record<string, string[]> = {
  Herramientas: [
    "Taladro percutor",
    "Amoladora angular",
    "Sierra circular",
    "Martillo de carpintero",
    "Alicate universal",
    "Llave inglesa",
    "Juego de destornilladores",
    "Cinta métrica",
    "Nivel de burbuja",
    "Escuadra metálica",
    "Serrucho",
    "Prensa de banco",
  ],
  Electricidad: [
    "Cable THW",
    "Interruptor simple",
    "Tomacorriente doble",
    "Foco LED",
    "Reflector LED",
    "Portalámparas",
    "Cinta aislante",
    "Llave térmica",
    "Canaleta",
    "Timbre inalámbrico",
    "Rollo de alambre",
    "Multitoma con protección",
  ],
  Plomería: [
    "Tubo PVC",
    "Codo PVC",
    "Llave de paso",
    "Grifería de lavamanos",
    "Sifón flexible",
    "Manguera flexible",
    "Cinta teflón",
    "Válvula de pie",
    "Abrazadera metálica",
    "Flotador de tanque",
    "Pegamento para PVC",
    "Trampa de grasa",
  ],
  Pinturas: [
    "Látex interior",
    "Esmalte sintético",
    "Barniz marino",
    "Thinner acrílico",
    "Rodillo de lana",
    "Brocha de cerda",
    "Lija al agua",
    "Masilla plástica",
    "Sellador acrílico",
    "Imprimante anticorrosivo",
    "Cinta de enmascarar",
    "Espátula",
  ],
  "Ferretería general": [
    "Caja de tornillos",
    "Caja de clavos",
    "Tarugos plásticos",
    "Bisagra de acero",
    "Candado de bronce",
    "Cadena galvanizada",
    "Pegamento de contacto",
    "Silicona neutra",
    "Precintos plásticos",
    "Guante de trabajo",
    "Cerradura de pomo",
    "Escalera de tijera",
  ],
  Jardín: [
    "Manguera de jardín",
    "Regadera plástica",
    "Tijera de podar",
    "Pala de punta",
    "Rastrillo metálico",
    "Carretilla",
    "Maceta de barro",
    "Sustrato para plantas",
    "Aspersor giratorio",
    "Guante de jardinería",
    "Machete",
    "Fumigadora manual",
  ],
  Construcción: [
    "Bolsa de cemento",
    "Bolsa de cal",
    "Yeso de construcción",
    "Millar de ladrillos",
    "Bloque de hormigón",
    "Malla electrosoldada",
    "Rollo de alambre de amarre",
    "Fierro de construcción",
    "Clavos de acero",
    "Plancha OSB",
    "Carretilla reforzada",
    "Balde de construcción",
  ],
  Seguridad: [
    "Casco de obra",
    "Lentes de protección",
    "Guante de nitrilo",
    "Barbijo N95",
    "Chaleco reflectivo",
    "Botín de seguridad",
    "Arnés de seguridad",
    "Protector auditivo",
    "Extintor ABC",
    "Botiquín de primeros auxilios",
    "Conos de señalización",
    "Faja lumbar",
  ],
};

const BRANDS = [
  "Bosch",
  "Stanley",
  "Truper",
  "Makita",
  "Tramontina",
  "Genérico",
  "Irwin",
  "Sika",
  "DeWalt",
  "Fanaloza",
];
const SPECS = [
  '1/2"',
  '3/4"',
  "5 m",
  "10 m",
  "x 100",
  "750 W",
  "20 V",
  "industrial",
  "reforzado",
  "profesional",
  "",
  "",
  "",
];

export function productName(rng: Rng, parentName: string): string {
  const nouns = NOUNS_BY_PARENT[parentName] ?? NOUNS_BY_PARENT.Herramientas;
  const noun = rng.pick(nouns);
  const brand = rng.pick(BRANDS);
  const spec = rng.pick(SPECS);
  return [brand, noun, spec].filter(Boolean).join(" ");
}

export function productDescription(rng: Rng, name: string): string {
  const openers = [
    "Ideal para trabajos de mantenimiento y obra fina.",
    "Resistente, de uso frecuente en taller y hogar.",
    "Calidad profesional a precio de barrio.",
    "Herramienta básica que no puede faltar en la caja.",
    "Material de primera para acabados parejos.",
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
  {
    name: "Taladro percutor Bosch GSB 550 W",
    slug: "taladro-percutor-bosch-gsb-550",
    parent: "Herramientas",
    priceBob: 45000,
  },
  {
    name: "Juego de destornilladores Stanley 12 piezas",
    slug: "juego-destornilladores-stanley-12",
    parent: "Herramientas",
    priceBob: 12500,
  },
  {
    name: 'Amoladora angular Makita 4 1/2"',
    slug: "amoladora-angular-makita-4-1-2",
    parent: "Herramientas",
    priceBob: 38000,
  },
  {
    name: "Cinta métrica Stanley 5 m",
    slug: "cinta-metrica-stanley-5m",
    parent: "Herramientas",
    priceBob: 3500,
  },
  {
    name: "Foco LED 9 W luz fría",
    slug: "foco-led-9w-luz-fria",
    parent: "Electricidad",
    priceBob: 1800,
  },
  {
    name: "Rollo de cable THW 12 AWG 100 m",
    slug: "cable-thw-12-awg-100m",
    parent: "Electricidad",
    priceBob: 32000,
  },
  {
    name: "Látex interior blanco 1 galón",
    slug: "latex-interior-blanco-galon",
    parent: "Pinturas",
    priceBob: 9500,
  },
  {
    name: "Brocha de cerda 3 pulgadas",
    slug: "brocha-cerda-3-pulgadas",
    parent: "Pinturas",
    priceBob: 1500,
  },
  {
    name: "Bolsa de cemento Portland 50 kg",
    slug: "cemento-portland-50kg",
    parent: "Construcción",
    priceBob: 6800,
  },
  {
    name: "Manguera de jardín reforzada 15 m",
    slug: "manguera-jardin-reforzada-15m",
    parent: "Jardín",
    priceBob: 8500,
  },
  {
    name: "Casco de obra amarillo",
    slug: "casco-obra-amarillo",
    parent: "Seguridad",
    priceBob: 4200,
  },
  {
    name: "Guantes de nitrilo caja x 100",
    slug: "guantes-nitrilo-caja-100",
    parent: "Seguridad",
    priceBob: 5500,
  },
  {
    name: "Llave de paso 1/2 pulgada",
    slug: "llave-paso-media-pulgada",
    parent: "Plomería",
    priceBob: 2800,
  },
  {
    name: "Caja de tornillos autorroscantes x 200",
    slug: "caja-tornillos-autorroscantes-200",
    parent: "Ferretería general",
    priceBob: 3200,
  },
];
