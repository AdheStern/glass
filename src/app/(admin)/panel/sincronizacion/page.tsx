import type { Metadata } from "next";
import { prisma } from "@/db/client";
import { formatBob } from "@/domain/money";
import { requirePanel } from "@/features/auth/roles";
import { QuarantineRelease } from "@/features/pos/components/quarantine-release";

export const metadata: Metadata = { title: "Sincronización" };
export const instant = false;

export default async function SincronizacionPage() {
  await requirePanel("PROPIETARIO", "ADMINISTRADOR");

  const [negatives, quarantined, priceMismatch] = await Promise.all([
    prisma.variantStock.findMany({
      where: { qty: { lt: 0 } },
      select: {
        variantId: true,
        qty: true,
        variant: { select: { product: { select: { name: true } } } },
      },
      orderBy: { qty: "asc" },
    }),
    prisma.syncCommand.findMany({
      where: { status: "QUARANTINED" },
      select: {
        id: true,
        seq: true,
        kind: true,
        occurredAtDevice: true,
        device: { select: { id: true, name: true } },
      },
      orderBy: { seq: "asc" },
    }),
    prisma.$queryRaw<
      { folio: string; total_bob: number; occurred_at_device: Date }[]
    >`
      select s.folio, s.total_bob, s.occurred_at_device
      from sale s
      where s.voided_at is null
        and exists (
          select 1 from sale_item si
          join variant v on v.id = si.variant_id
          where si.sale_id = s.id and si.unit_price_bob <> v.base_price_bob
        )
      order by s.occurred_at_device desc
      limit 20
    `,
  ]);

  const byDevice = new Map<string, { name: string; count: number }>();
  for (const c of quarantined) {
    const cur = byDevice.get(c.device.id) ?? { name: c.device.name, count: 0 };
    cur.count++;
    byDevice.set(c.device.id, cur);
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold tracking-tight">Sincronización</h1>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Existencia negativa</h2>
        <p className="text-sm text-muted-foreground">
          Casi siempre viene de una venta sin conexión. Se corrige con un{" "}
          <strong>AJUSTE</strong> desde una toma de inventario, nunca a mano.
        </p>
        {negatives.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada por revisar.</p>
        ) : (
          <ul className="text-sm">
            {negatives.map((n) => (
              <li
                key={n.variantId}
                className="flex justify-between border-b py-1.5"
              >
                <span>{n.variant.product.name}</span>
                <span className="font-medium text-red-600 tabular-nums">
                  {n.qty}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Dispositivos en cuarentena</h2>
        <p className="text-sm text-muted-foreground">
          Un lote de un dispositivo revocado no se pierde: se conserva hasta que
          lo liberes (§17.5).
        </p>
        {byDevice.size === 0 ? (
          <p className="text-sm text-muted-foreground">Ninguno.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {[...byDevice.entries()].map(([id, d]) => (
              <li
                key={id}
                className="flex items-center justify-between border-b py-1.5 text-sm"
              >
                <span>
                  {d.name} · {d.count} {d.count === 1 ? "comando" : "comandos"}{" "}
                  en espera
                </span>
                <QuarantineRelease deviceId={id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Ventas con precio distinto al vigente</h2>
        <p className="text-sm text-muted-foreground">
          Manda el precio del ticket (§13). Se listan para el reporte.
        </p>
        {priceMismatch.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ninguna.</p>
        ) : (
          <ul className="text-sm">
            {priceMismatch.map((s) => (
              <li
                key={s.folio}
                className="flex justify-between border-b py-1.5"
              >
                <span>{s.folio}</span>
                <span className="tabular-nums">{formatBob(s.total_bob)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
