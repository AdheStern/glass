import "server-only";
import { prisma } from "@/db/client";
import { slugify } from "@/features/products/schemas";

async function unique(
  table: "page" | "post",
  base: string,
  exceptId: string | undefined,
): Promise<string> {
  const root = slugify(base) || table;
  const taken = async (slug: string): Promise<string | null> => {
    const hit =
      table === "page"
        ? await prisma.page.findUnique({
            where: { slug },
            select: { id: true },
          })
        : await prisma.post.findUnique({
            where: { slug },
            select: { id: true },
          });
    return hit?.id ?? null;
  };
  for (let n = 0; n < 50; n++) {
    const slug = n === 0 ? root : `${root}-${n}`;
    const owner = await taken(slug);
    if (!owner || owner === exceptId) return slug;
  }
  return `${root}-${Date.now()}`;
}

export const uniquePageSlug = (base: string, exceptId?: string) =>
  unique("page", base, exceptId);
export const uniquePostSlug = (base: string, exceptId?: string) =>
  unique("post", base, exceptId);

/** Redirección 301 al cambiar un slug publicado (§20.2). */
export async function recordSlugChange(
  entity: "page" | "post",
  oldSlug: string,
  newSlug: string,
): Promise<void> {
  if (oldSlug === newSlug) return;
  await prisma.slugHistory.upsert({
    where: { entity_oldSlug: { entity, oldSlug } },
    create: { entity, oldSlug, newSlug },
    update: { newSlug },
  });
}
