import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePanel } from "@/features/auth/roles";
import { PostEditor } from "@/features/content/components/panel/post-editor";
import { getPostForPanel } from "@/features/content/panel-queries";

export const metadata: Metadata = { title: "Editar entrada" };
export const instant = false;

export default async function EditEntradaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePanel("PROPIETARIO", "ADMINISTRADOR");
  const { id } = await params;
  const post = await getPostForPanel(id);
  if (!post) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">{post.title}</h1>
      <PostEditor post={post} />
    </div>
  );
}
