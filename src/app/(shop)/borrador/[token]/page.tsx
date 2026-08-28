import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BlockImage } from "@/features/content/components/block-image";
import { BlockRenderer } from "@/features/content/components/block-renderer";
import { getDraftByToken } from "@/features/content/queries";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DraftPreview({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;
  const draft = await getDraftByToken(token);
  if (!draft) notFound();

  const doc = draft.kind === "page" ? draft.page : draft.post;

  return (
    <div className="flex flex-col">
      <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
        Vista previa de un borrador · no está publicado
      </div>
      {draft.kind === "post" && (
        <header className="mx-auto w-full max-w-3xl px-4 pt-10">
          <h1 className="text-3xl font-bold tracking-tight">{doc.title}</h1>
          {draft.post.coverPath && (
            <BlockImage
              path={draft.post.coverPath}
              alt={doc.title}
              className="mt-6 h-auto w-full rounded-xl object-cover"
            />
          )}
        </header>
      )}
      <BlockRenderer blocks={doc.blocks} />
    </div>
  );
}
