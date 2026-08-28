import type { Metadata } from "next";
import { requirePanel } from "@/features/auth/roles";
import { PostEditor } from "@/features/content/components/panel/post-editor";

export const metadata: Metadata = { title: "Nueva entrada" };
export const instant = false;

export default async function NuevaEntradaPage() {
  await requirePanel("PROPIETARIO", "ADMINISTRADOR");
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Nueva entrada</h1>
      <PostEditor post={null} />
    </div>
  );
}
