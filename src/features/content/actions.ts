"use server";
// Glass — edición del CMS (§11). Rol PROPIETARIO/ADMINISTRADOR. Los bloques se
// validan contra su esquema y el texto enriquecido se sanea al guardar.
import type { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { prisma } from "@/db/client";
import { requireRole } from "@/features/auth/roles";
import { parseBlockData } from "./blocks/registry";
import type { BlockType } from "./blocks/schemas";
import {
  type PageInput,
  PageInputSchema,
  type PostInput,
  PostInputSchema,
} from "./schemas";
import { recordSlugChange, uniquePageSlug, uniquePostSlug } from "./slug";

export interface ContentResult {
  ok: boolean;
  error?: string;
  id?: string;
  draftToken?: string;
}

const CONTENT = ["PROPIETARIO", "ADMINISTRADOR"] as const;

async function audit(
  action: string,
  entity: string,
  entityId: string,
  actorId: string | null,
  after?: Prisma.InputJsonValue,
) {
  await prisma.auditLog.create({
    data: { action, entity, entityId, actorType: "user", actorId, after },
  });
}

function buildBlocks(
  blocks: { type: BlockType; data?: unknown }[],
): { type: BlockType; position: number; data: Prisma.InputJsonValue }[] {
  return blocks.map((b, i) => ({
    type: b.type,
    position: i,
    data: parseBlockData(b.type, b.data) as Prisma.InputJsonValue,
  }));
}

// ---------------------------------------------------------------------------
// Páginas
// ---------------------------------------------------------------------------

export async function savePageAction(raw: PageInput): Promise<ContentResult> {
  const actor = await requireRole(...CONTENT);
  const parsed = PageInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const d = parsed.data;

  let blocks: ReturnType<typeof buildBlocks>;
  try {
    blocks = buildBlocks(d.blocks);
  } catch {
    return { ok: false, error: "Un bloque tiene datos inválidos" };
  }

  const current = d.id
    ? await prisma.page.findUnique({
        where: { id: d.id },
        select: { slug: true, draftToken: true },
      })
    : null;
  const slug = await uniquePageSlug(d.slug || d.title, d.id);
  const draftToken = current?.draftToken ?? crypto.randomUUID();

  const id = await prisma.$transaction(async (tx) => {
    if (d.isHome) {
      await tx.page.updateMany({
        where: { isHome: true, ...(d.id ? { NOT: { id: d.id } } : {}) },
        data: { isHome: false },
      });
    }
    const page = d.id
      ? await tx.page.update({
          where: { id: d.id },
          data: {
            title: d.title,
            slug,
            isHome: d.isHome,
            metaTitle: d.metaTitle || null,
            metaDesc: d.metaDesc || null,
            draftToken,
          },
        })
      : await tx.page.create({
          data: {
            title: d.title,
            slug,
            isHome: d.isHome,
            metaTitle: d.metaTitle || null,
            metaDesc: d.metaDesc || null,
            draftToken,
          },
        });
    await tx.pageBlock.deleteMany({ where: { pageId: page.id } });
    if (blocks.length) {
      await tx.pageBlock.createMany({
        data: blocks.map((b) => ({ ...b, pageId: page.id })),
      });
    }
    return page.id;
  });

  if (current && current.slug !== slug) {
    await recordSlugChange("page", current.slug, slug);
  }
  await audit("page.save", "page", id, actor.id, { slug, isHome: d.isHome });
  revalidateTag("content", "max");
  return { ok: true, id, draftToken };
}

export async function publishPageAction(id: string): Promise<ContentResult> {
  const actor = await requireRole(...CONTENT);
  await prisma.page.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  await audit("page.publish", "page", id, actor.id);
  revalidateTag("content", "max");
  return { ok: true, id };
}

export async function unpublishPageAction(id: string): Promise<ContentResult> {
  const actor = await requireRole(...CONTENT);
  await prisma.page.update({ where: { id }, data: { status: "DRAFT" } });
  await audit("page.unpublish", "page", id, actor.id);
  revalidateTag("content", "max");
  return { ok: true, id };
}

export async function deletePageAction(id: string): Promise<ContentResult> {
  const actor = await requireRole(...CONTENT);
  await prisma.$transaction([
    prisma.pageBlock.deleteMany({ where: { pageId: id } }),
    prisma.page.delete({ where: { id } }),
  ]);
  await audit("page.delete", "page", id, actor.id);
  revalidateTag("content", "max");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

export async function savePostAction(raw: PostInput): Promise<ContentResult> {
  const actor = await requireRole(...CONTENT);
  const parsed = PostInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const d = parsed.data;

  let blocks: ReturnType<typeof buildBlocks>;
  try {
    blocks = buildBlocks(d.blocks);
  } catch {
    return { ok: false, error: "Un bloque tiene datos inválidos" };
  }

  const current = d.id
    ? await prisma.post.findUnique({
        where: { id: d.id },
        select: { slug: true, draftToken: true },
      })
    : null;
  const slug = await uniquePostSlug(d.slug || d.title, d.id);
  const draftToken = current?.draftToken ?? crypto.randomUUID();

  const common = {
    title: d.title,
    slug,
    excerpt: d.excerpt || null,
    coverPath: d.coverPath || null,
    authorName: d.authorName || null,
    tags: d.tags,
    draftToken,
  };

  const id = await prisma.$transaction(async (tx) => {
    const post = d.id
      ? await tx.post.update({ where: { id: d.id }, data: common })
      : await tx.post.create({ data: common });
    await tx.pageBlock.deleteMany({ where: { postId: post.id } });
    if (blocks.length) {
      await tx.pageBlock.createMany({
        data: blocks.map((b) => ({ ...b, postId: post.id })),
      });
    }
    return post.id;
  });

  if (current && current.slug !== slug) {
    await recordSlugChange("post", current.slug, slug);
  }
  await audit("post.save", "post", id, actor.id, { slug });
  revalidateTag("content", "max");
  return { ok: true, id, draftToken };
}

export async function publishPostAction(id: string): Promise<ContentResult> {
  const actor = await requireRole(...CONTENT);
  const post = await prisma.post.findUnique({
    where: { id },
    select: { publishedAt: true },
  });
  await prisma.post.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedAt: post?.publishedAt ?? new Date(),
    },
  });
  await audit("post.publish", "post", id, actor.id);
  revalidateTag("content", "max");
  return { ok: true, id };
}

export async function unpublishPostAction(id: string): Promise<ContentResult> {
  const actor = await requireRole(...CONTENT);
  await prisma.post.update({ where: { id }, data: { status: "DRAFT" } });
  await audit("post.unpublish", "post", id, actor.id);
  revalidateTag("content", "max");
  return { ok: true, id };
}

export async function deletePostAction(id: string): Promise<ContentResult> {
  const actor = await requireRole(...CONTENT);
  await prisma.$transaction([
    prisma.pageBlock.deleteMany({ where: { postId: id } }),
    prisma.post.delete({ where: { id } }),
  ]);
  await audit("post.delete", "post", id, actor.id);
  revalidateTag("content", "max");
  return { ok: true };
}

export async function rotateDraftTokenAction(
  kind: "page" | "post",
  id: string,
): Promise<ContentResult & { token?: string }> {
  await requireRole(...CONTENT);
  const token = crypto.randomUUID();
  if (kind === "page") {
    await prisma.page.update({ where: { id }, data: { draftToken: token } });
  } else {
    await prisma.post.update({ where: { id }, data: { draftToken: token } });
  }
  return { ok: true, id, token };
}
