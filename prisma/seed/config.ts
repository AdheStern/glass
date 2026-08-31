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
// Código de emparejamiento de larga duración para probar el POS sin pasar por el
// panel (en producción lo genera el propietario, válido 10 min — §6.2).
const DEMO_PAIRING_CODE = "424242";

export async function seedConfig(prisma: PrismaClient): Promise<SeededConfig> {
  const settings = {
    name: "Celulares Demo",
    currency: process.env.DEFAULT_CURRENCY ?? "BOB",
    locale: process.env.DEFAULT_LOCALE ?? "es-BO",
    themePreset: "NOCTURNO",
    brandColor: "oklch(0.6 0.19 255)",
    cardPreset: "SUAVE",
    density: "COMODA",
    homeLayout: "HERO",
    whatsappNumbers: [
      { label: "Ventas", e164: "+59170000000" },
      { label: "Soporte", e164: "+59171111111" },
    ],
    socials: { instagram: "celulares.demo", tiktok: "celulares.demo" },
    hours: { mon: "09:00-19:00", sat: "09:00-13:00" },
    stockDisplay: "UMBRAL" as const,
    lowStockThreshold: 3,
    roundingMode: "NEAREST_10" as const,
    minOrderBob: 5000,
  };
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: settings,
    create: { id: "singleton", ...settings },
  });

  const pinHash = await hash(DEMO_PIN);

  const operators = await Promise.all(
    ["María", "José", "Rosa"].map((name, i) =>
      prisma.operator.upsert({
        where: { id: `op_${i}` },
        update: { pinHash, pinAttempts: 0, pinLockedUntil: null },
        create: {
          id: `op_${i}`,
          name,
          pinHash,
          role: i === 0 ? "ADMINISTRADOR" : "CAJERO",
        },
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

  await prisma.devicePairingCode.upsert({
    where: { code: DEMO_PAIRING_CODE },
    update: { expiresAt: new Date("2099-01-01"), usedAt: null },
    create: { code: DEMO_PAIRING_CODE, expiresAt: new Date("2099-01-01") },
  });

  const methodDefs = [
    { id: "pm_efectivo", label: "Efectivo", countsInDrawer: true, position: 0 },
    { id: "pm_qr", label: "QR", countsInDrawer: false, position: 1 },
    {
      id: "pm_transf",
      label: "Transferencia",
      countsInDrawer: false,
      position: 2,
    },
    { id: "pm_tarjeta", label: "Tarjeta", countsInDrawer: false, position: 3 },
  ];
  for (const m of methodDefs) {
    await prisma.paymentMethod.upsert({
      where: { id: m.id },
      update: {},
      create: m,
    });
  }

  return {
    operatorIds: operators.map((o) => o.id),
    deviceIds: devices.map((d) => d.id),
    cashMethodId: "pm_efectivo",
    nonCashMethodIds: ["pm_qr", "pm_transf", "pm_tarjeta"],
  };
}
