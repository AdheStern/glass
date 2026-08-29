import type { Metadata } from "next";
import { prisma } from "@/db/client";
import { UsersManager } from "@/features/auth/components/users-manager";
import { requirePanel } from "@/features/auth/roles";

export const metadata: Metadata = { title: "Usuarios" };
export const instant = false;

export default async function UsuariosPage() {
  const me = await requirePanel("PROPIETARIO", "ADMINISTRADOR");
  const users = await prisma.user.findMany({
    orderBy: [{ archivedAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      archivedAt: true,
    },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Usuarios del panel</h1>
      <p className="text-sm text-muted-foreground">
        El registro público está cerrado (§6.3). Solo el propietario y los
        administradores dan de alta cuentas.
      </p>
      <UsersManager
        meId={me.id}
        users={users.map((u) => ({ ...u, role: u.role ?? "CAJERO" }))}
      />
    </div>
  );
}
