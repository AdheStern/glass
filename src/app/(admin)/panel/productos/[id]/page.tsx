import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePanel } from "@/features/auth/roles";
import { ImageManager } from "@/features/media/components/image-manager";
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
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Fotos</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageManager
            productId={product.id}
            productName={product.name}
            initial={product.images}
          />
        </CardContent>
      </Card>
      <ProductForm categories={categories} initial={product} />
    </div>
  );
}
