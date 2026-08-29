// Glass — rehace los agregados diarios (§18.3) desde la venta más antigua hasta
// hoy. Se corre a mano tras un import grande o si el trabajo nocturno falló
// varios días. Uso: pnpm db:rollup
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

async function main() {
  const [first] = await prisma.$queryRawUnsafe<{ d: Date | null }[]>(
    "SELECT min(glass_sale_day(occurred_at_device)) d FROM sale WHERE voided_at IS NULL",
  );
  const from = first?.d
    ? first.d.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const rows = await prisma.$queryRawUnsafe<{ glass_refresh_rollup: number }[]>(
    `SELECT glass_refresh_rollup('${from}'::date, current_date)`,
  );
  console.log(
    `glass/rollup: refrescados ${rows[0]?.glass_refresh_rollup ?? 0} días-operador-canal desde ${from}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
