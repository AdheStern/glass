import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePanel } from "@/features/auth/roles";
import { ProductForm } from "@/features/products/components/product-form";
import {
  getProductForEdit,
  listAllCategories,
} from "@/features/products/queries";

export const metadata: Metadata = { title: "Editar producto" };

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePanel("PROPIETARIO", "ADMINISTRADOR");
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductForEdit(id),
    listAllCategories(),
  ]);
  if (!product) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
      <ProductForm categories={categories} initial={product} />
    </div>
  );
}
