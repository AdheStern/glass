// Glass — siembra de configuración: ajustes del sitio, métodos de pago,
// operadores (con PIN) y dispositivos de caja.
import { hash } from "@node-rs/argon2";
import type { PrismaClient } from "@prisma/client";

export interface SeededConfig {
  operatorIds: string[];
  deviceIds: string[];
  cashMethodId: string;
  nonCashMethodIds: string[];
}

// PIN fijo para la demo (documentado). El identifica, no autoriza (§6.2).
const DEMO_PIN = "2468";

export async function seedConfig(prisma: PrismaClient): Promise<SeededConfig> {
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      name: "Ferretería Demo",
      currency: process.env.DEFAULT_CURRENCY ?? "BOB",
      locale: process.env.DEFAULT_LOCALE ?? "es-BO",
      themePreset: "MERCADO",
      brandColor: "oklch(0.62 0.17 25)",
      cardPreset: "ESTANTE",
      density: "COMODA",
      homeLayout: "HERO",
      whatsappNumbers: [{ label: "Ventas", e164: "+59170000000" }],
      socials: { instagram: "ferreteria.demo" },
      hours: { mon: "08:00-18:30", sat: "08:00-13:00" },
      stockDisplay: "UMBRAL",
      lowStockThreshold: 5,
      roundingMode: "NEAREST_10",
      minOrderBob: 5000,
    },
  });

  const pinHash = await hash(DEMO_PIN);

  const operators = await Promise.all(
    ["María", "José", "Rosa"].map((name, i) =>
      prisma.operator.upsert({
        where: { id: `op_${i}` },
        update: {},
        create: { id: `op_${i}`, name, pinHash, role: i === 0 ? "ADMINISTRADOR" : "CAJERO" },
      }),
    ),
  );

  const devices = await Promise.all(
    ["Caja mostrador", "Caja depósito"].map((name, i) =>
      prisma.device.upsert({
        where: { id: `dev_${i}` },
        update: {},
        create: { id: `dev_${i}`, name, token: `seed-device-token-${i}` },
      }),
    ),
  );

  const methodDefs = [
    { id: "pm_efectivo", label: "Efectivo", countsInDrawer: true, position: 0 },
    { id: "pm_qr", label: "QR", countsInDrawer: false, position: 1 },
    { id: "pm_transf", label: "Transferencia", countsInDrawer: false, position: 2 },
    { id: "pm_tarjeta", label: "Tarjeta", countsInDrawer: false, position: 3 },
  ];
  for (const m of methodDefs) {
    await prisma.paymentMethod.upsert({ where: { id: m.id }, update: {}, create: m });
  }

  return {
    operatorIds: operators.map((o) => o.id),
    deviceIds: devices.map((d) => d.id),
    cashMethodId: "pm_efectivo",
    nonCashMethodIds: ["pm_qr", "pm_transf", "pm_tarjeta"],
  };
}
