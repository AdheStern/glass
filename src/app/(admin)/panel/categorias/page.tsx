import type { Metadata } from "next";
import { requirePanel } from "@/features/auth/roles";
import { CategoryManager } from "@/features/categories/components/category-manager";
import {
  listCategoryTree,
  listParentOptions,
} from "@/features/categories/queries";

export const metadata: Metadata = { title: "Categorías" };

export default async function CategoriasPage() {
  await requirePanel("PROPIETARIO", "ADMINISTRADOR");
  const [tree, parents] = await Promise.all([
    listCategoryTree(),
    listParentOptions(),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>
      <p className="text-sm text-muted-foreground">
        Árbol de dos niveles como máximo (§5.3). El número es la cantidad de
        productos.
      </p>
      <CategoryManager tree={tree} parents={parents} />
    </div>
  );
}
