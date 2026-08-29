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
    | "settings"
    | "boxes"
    | "tags"
    | "monitor"
    | "users"
    | "refresh-cw"
    | "file-text"
    | "newspaper"
    | "user-cog";
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
    href: "/panel/inventario",
    label: "Inventario",
    icon: "boxes",
    roles: ["PROPIETARIO", "ADMINISTRADOR", "ALMACEN"],
  },
  {
    href: "/panel/etiquetas",
    label: "Etiquetas",
    icon: "tags",
    roles: ["PROPIETARIO", "ADMINISTRADOR", "ALMACEN"],
  },
  {
    href: "/panel/importar",
    label: "Importar",
    icon: "upload",
    roles: ["PROPIETARIO", "ADMINISTRADOR"],
  },
  {
    href: "/panel/dispositivos",
    label: "Dispositivos",
    icon: "monitor",
    roles: ["PROPIETARIO", "ADMINISTRADOR"],
  },
  {
    href: "/panel/operadores",
    label: "Operadores",
    icon: "users",
    roles: ["PROPIETARIO", "ADMINISTRADOR"],
  },
  {
    href: "/panel/usuarios",
    label: "Usuarios",
    icon: "user-cog",
    roles: ["PROPIETARIO", "ADMINISTRADOR"],
  },
  {
    href: "/panel/sincronizacion",
    label: "Sincronización",
    icon: "refresh-cw",
    roles: ["PROPIETARIO", "ADMINISTRADOR"],
  },
  {
    href: "/panel/paginas",
    label: "Páginas",
    icon: "file-text",
    roles: ["PROPIETARIO", "ADMINISTRADOR"],
  },
  {
    href: "/panel/blog",
    label: "Blog",
    icon: "newspaper",
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
