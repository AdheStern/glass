// Glass — ajustes del sitio. Fila única `singleton`, cacheada con la etiqueta
// `settings` (§10.2). Se invalida con `revalidateTag("settings")` desde el panel.
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { RoundingMode as DomainRoundingMode } from "@/domain/sale";
import type { StockDisplay } from "@/features/catalog/stock-label";
import { prisma } from "./client";

export type { StockDisplay };

export interface WhatsappNumber {
  label: string;
  e164: string;
}

export interface SiteSettingsView {
  name: string;
  logoPath: string | null;
  currency: string;
  locale: string;
  themePreset: string;
  brandColor: string;
  cardPreset: string;
  density: "COMODA" | "COMPACTA";
  homeLayout: string;
  whatsappNumbers: WhatsappNumber[];
  socials: Record<string, string>;
  address: Record<string, unknown> | null;
  hours: Record<string, string>;
  stockDisplay: StockDisplay;
  lowStockThreshold: number;
  showSoldOut: boolean;
  roundingMode: DomainRoundingMode;
  minOrderBob: number | null;
  orderMessageTemplate: string | null;
}

const DEFAULTS: SiteSettingsView = {
  name: "Glass",
  logoPath: null,
  currency: "BOB",
  locale: "es-BO",
  themePreset: "MERCADO",
  brandColor: "oklch(0.62 0.17 25)",
  cardPreset: "SUAVE",
  density: "COMODA",
  homeLayout: "HERO",
  whatsappNumbers: [],
  socials: {},
  address: null,
  hours: {},
  stockDisplay: "UMBRAL",
  lowStockThreshold: 5,
  showSoldOut: true,
  roundingMode: "NONE",
  minOrderBob: null,
  orderMessageTemplate: null,
};

export async function getSiteSettings(): Promise<SiteSettingsView> {
  "use cache";
  cacheTag("settings");
  cacheLife("hours");

  const row = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
  });
  if (!row) return DEFAULTS;

  return {
    name: row.name,
    logoPath: row.logoPath,
    currency: row.currency,
    locale: row.locale,
    themePreset: row.themePreset,
    brandColor: row.brandColor,
    cardPreset: row.cardPreset,
    density: row.density === "COMPACTA" ? "COMPACTA" : "COMODA",
    homeLayout: row.homeLayout,
    whatsappNumbers: (row.whatsappNumbers as WhatsappNumber[] | null) ?? [],
    socials: (row.socials as Record<string, string> | null) ?? {},
    address: (row.address as Record<string, unknown> | null) ?? null,
    hours: (row.hours as Record<string, string> | null) ?? {},
    stockDisplay: row.stockDisplay as StockDisplay,
    lowStockThreshold: row.lowStockThreshold,
    showSoldOut: row.showSoldOut,
    roundingMode: row.roundingMode as DomainRoundingMode,
    minOrderBob: row.minOrderBob,
    orderMessageTemplate: row.orderMessageTemplate,
  };
}
