// Glass — navegación del panel. `roles` vacío = cualquier rol de panel.
import type { Role } from "@prisma/client";

export interface NavItem {
  href: string;
  label: string;
  icon:
    | "gauge"
    | "package"
    | "folder-tree"
    | "tag"
    | "upload"
    | "inbox"
    | "settings";
  roles?: Role[];
  exact?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/panel", label: "Resumen", icon: "gauge", exact: true },
  {
    href: "/panel/pedidos",
    label: "Pedidos",
    icon: "inbox",
    roles: ["PROPIETARIO", "ADMINISTRADOR", "CAJERO"],
  },
  {
    href: "/panel/productos",
    label: "Productos",
    icon: "package",
    roles: ["PROPIETARIO", "ADMINISTRADOR"],
  },
  {
    href: "/panel/categorias",
    label: "Categorías",
    icon: "folder-tree",
    roles: ["PROPIETARIO", "ADMINISTRADOR"],
  },
  {
    href: "/panel/descuentos",
    label: "Descuentos",
    icon: "tag",
    roles: ["PROPIETARIO", "ADMINISTRADOR"],
  },
  {
    href: "/panel/importar",
    label: "Importar",
    icon: "upload",
    roles: ["PROPIETARIO", "ADMINISTRADOR"],
  },
  {
    href: "/panel/ajustes",
    label: "Ajustes",
    icon: "settings",
    roles: ["PROPIETARIO", "ADMINISTRADOR"],
  },
];

export function visibleNav(role: Role): NavItem[] {
  return NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(role));
}
