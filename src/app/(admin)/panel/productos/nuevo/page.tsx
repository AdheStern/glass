import type { Metadata } from "next";
import { requirePanel } from "@/features/auth/roles";
import { ProductForm } from "@/features/products/components/product-form";
import { listAllCategories } from "@/features/products/queries";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NuevoProductoPage() {
  await requirePanel("PROPIETARIO", "ADMINISTRADOR");
  const categories = await listAllCategories();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Nuevo producto</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
