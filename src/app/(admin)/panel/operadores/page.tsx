import type { Metadata } from "next";
import { prisma } from "@/db/client";
import { requirePanel } from "@/features/auth/roles";
import { OperatorsManager } from "@/features/pos/components/operators-manager";

export const metadata: Metadata = { title: "Operadores" };
export const instant = false;

export default async function OperadoresPage() {
  await requirePanel("PROPIETARIO", "ADMINISTRADOR");
  const operators = await prisma.operator.findMany({
    where: { archivedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Operadores de caja</h1>
      <p className="text-sm text-muted-foreground">
        El PIN identifica quién cobró, no protege secretos (§6.2). 4 dígitos,
        bloqueo progresivo tras 5 errores.
      </p>
      <OperatorsManager operators={operators} />
    </div>
  );
}
