"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import {
  archiveUserAction,
  createUserAction,
  restoreUserAction,
  setUserRoleAction,
} from "../user-actions";

const ROLES = [
  "PROPIETARIO",
  "ADMINISTRADOR",
  "EDITOR",
  "CAJERO",
  "ALMACEN",
] as const;

export interface PanelUser {
  id: string;
  email: string;
  name: string;
  role: string;
  archivedAt: Date | null;
}

export function UsersManager({
  users,
  meId,
}: {
  users: PanelUser[];
  meId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    email: "",
    name: "",
    role: "CAJERO",
    password: "",
  });
  const [confirm, setConfirm] = useState<PanelUser | null>(null);
  const [pw, setPw] = useState({ current: "", next: "" });

  function create() {
    start(async () => {
      const r = await createUserAction(form);
      if (r.ok) {
        toast.success("Usuario creado");
        setCreating(false);
        setForm({ email: "", name: "", role: "CAJERO", password: "" });
        router.refresh();
      } else toast.error(r.error ?? "No se pudo");
    });
  }

  function changeRole(id: string, role: string) {
    start(async () => {
      const r = await setUserRoleAction(id, role);
      if (r.ok) {
        toast.success("Rol actualizado");
        router.refresh();
      } else toast.error(r.error ?? "No se pudo");
    });
  }

  function toggleArchive(u: PanelUser) {
    start(async () => {
      const r = u.archivedAt
        ? await restoreUserAction(u.id)
        : await archiveUserAction(u.id);
      if (r.ok) {
        toast.success(u.archivedAt ? "Reactivado" : "Archivado");
        setConfirm(null);
        router.refresh();
      } else toast.error(r.error ?? "No se pudo");
    });
  }

  function changeMyPassword() {
    start(async () => {
      const { error } = await authClient.changePassword({
        currentPassword: pw.current,
        newPassword: pw.next,
        revokeOtherSessions: true,
      });
      if (error) toast.error("No se pudo cambiar la contraseña");
      else {
        toast.success("Contraseña cambiada");
        setPw({ current: "", next: "" });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button size="sm" onClick={() => setCreating(true)}>
          Nuevo usuario
        </Button>
      </div>

      <ul className="flex flex-col divide-y">
        {users.map((u) => (
          <li key={u.id} className="flex items-center gap-3 py-3">
            <div className="flex-1">
              <span className="font-medium">{u.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {u.email}
                {u.id === meId ? " · vos" : ""}
                {u.archivedAt ? " · archivado" : ""}
              </span>
            </div>
            <Select
              value={u.role}
              onValueChange={(v) => changeRole(u.id, v)}
              disabled={pending || u.id === meId}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {u.id !== meId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirm(u)}
                disabled={pending}
              >
                {u.archivedAt ? "Reactivar" : "Archivar"}
              </Button>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Mi contraseña</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            type="password"
            placeholder="Contraseña actual"
            value={pw.current}
            onChange={(e) => setPw({ ...pw, current: e.target.value })}
          />
          <Input
            type="password"
            placeholder="Nueva contraseña"
            value={pw.next}
            onChange={(e) => setPw({ ...pw, next: e.target.value })}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          disabled={pending || pw.next.length < 8}
          onClick={changeMyPassword}
        >
          Cambiar
        </Button>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Correo</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Rol</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Contraseña temporal</Label>
              <Input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Pásasela por un canal seguro; que la cambie al entrar.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button
              onClick={create}
              disabled={pending || !form.email || form.password.length < 8}
            >
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.archivedAt ? "¿Reactivar" : "¿Archivar"} «
              {confirm?.name}
              »?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.archivedAt
                ? "Vuelve a poder entrar al panel."
                : "Se cierra su sesión y deja de entrar. No se borra nada."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirm && toggleArchive(confirm)}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
