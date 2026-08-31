// Glass — contenido demo del CMS (§11): portada por bloques, página "nosotros" y
// tres entradas de blog (una en borrador con testigo fijo para el e2e).
import type { PrismaClient } from "@prisma/client";

type Rich = { type: "p"; children: { text: string }[] }[];
const p = (text: string): Rich => [{ type: "p", children: [{ text }] }];

const DRAFT_TOKEN = "demo-borrador-0000000000000000";

export async function seedContent(prisma: PrismaClient) {
  const [featuredCat, poolImages] = await Promise.all([
    prisma.category.findFirst({
      where: { parentId: null },
      orderBy: { position: "asc" },
      select: { slug: true },
    }),
    Promise.resolve([
      "pool/gradient-01",
      "pool/gradient-02",
      "pool/gradient-03",
    ]),
  ]);

  // --- Portada ---
  const home = await prisma.page.create({
    data: {
      slug: "inicio",
      title: "Inicio",
      status: "PUBLISHED",
      isHome: true,
      metaTitle: "Celulares nuevos con garantía, a un mensaje",
      metaDesc: "Xiaomi, Samsung, Honor y Apple. Pedí por WhatsApp.",
      publishedAt: new Date(),
      draftToken: "demo-portada-000000000000000000",
      blocks: {
        create: [
          {
            type: "HERO",
            position: 0,
            data: {
              title: "El celular que querés, a un mensaje",
              subtitle:
                "Elegí modelo, color y almacenamiento. Coordinás por WhatsApp.",
              variant: "center",
              mediaKind: "image",
              mediaPath: poolImages[0],
              buttons: [{ label: "Ver catálogo", href: "/catalogo" }],
            },
          },
          {
            type: "PRODUCT_GRID",
            position: 1,
            data: { mode: "featured", limit: 8, title: "Los más buscados" },
          },
          {
            type: "TEXT_MEDIA",
            position: 2,
            data: {
              layout: "media-right",
              imagePath: poolImages[1],
              body: p(
                "Trabajamos con equipos nuevos, sellados y con garantía. Lo que no está en vitrina, lo traemos.",
              ),
            },
          },
          {
            type: "FAQ",
            position: 3,
            data: {
              items: [
                {
                  q: "¿Los equipos son nuevos?",
                  a: p("Sí, todos sellados y con garantía de la tienda."),
                },
                {
                  q: "¿Puedo pagar en cuotas?",
                  a: p(
                    "Sí, financiamos con tarjeta o plan propio. Consultá por WhatsApp.",
                  ),
                },
              ],
            },
          },
          {
            type: "CTA_WHATSAPP",
            position: 4,
            data: {
              heading: "¿Buscás un modelo puntual?",
              buttonLabel: "Escribinos",
              prefilledMessage: "Hola! Estoy buscando el…",
            },
          },
        ],
      },
    },
  });

  // --- Página "nosotros" ---
  await prisma.page.create({
    data: {
      slug: "nosotros",
      title: "Nosotros",
      status: "PUBLISHED",
      publishedAt: new Date(),
      draftToken: "demo-nosotros-00000000000000000",
      blocks: {
        create: [
          {
            type: "TEXT_MEDIA",
            position: 0,
            data: {
              layout: "media-left",
              imagePath: poolImages[2],
              body: p(
                "Somos un negocio familiar. Nos conocés por nombre y te decimos sin vueltas qué equipo te conviene.",
              ),
            },
          },
          {
            type: "GALLERY",
            position: 1,
            data: {
              columns: 3,
              images: poolImages.map((path) => ({ path, alt: "El local" })),
            },
          },
          {
            type: "MAP_CONTACT",
            position: 2,
            data: { showHours: true, showWhatsapp: true },
          },
        ],
      },
    },
  });

  // --- Blog ---
  const published = [
    {
      slug: "como-elegir-tu-celular",
      title: "Cómo elegir tu próximo celular",
      excerpt: "Batería, cámara y almacenamiento: en qué fijarte primero.",
      author: "El equipo",
    },
    {
      slug: "novedades-de-la-tienda",
      title: "Novedades de la tienda",
      excerpt: "Llegaron los Galaxy S24 y ampliamos el horario del sábado.",
      author: "Rosa",
    },
  ];
  for (const [i, post] of published.entries()) {
    await prisma.post.create({
      data: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        authorName: post.author,
        tags: ["guía"],
        status: "PUBLISHED",
        publishedAt: new Date(Date.now() - (i + 1) * 86_400_000),
        draftToken: `demo-post-${i}-000000000000000000`,
        blocks: {
          create: [
            {
              type: "TEXT_MEDIA",
              position: 0,
              data: { layout: "media-right", body: p(post.excerpt) },
            },
          ],
        },
      },
    });
  }

  await prisma.post.create({
    data: {
      slug: "entrada-en-preparacion",
      title: "Una entrada que todavía no publicamos",
      excerpt: "Borrador para revisar desde el celular.",
      status: "DRAFT",
      draftToken: DRAFT_TOKEN,
      blocks: {
        create: [
          {
            type: "TEXT_MEDIA",
            position: 0,
            data: {
              layout: "media-right",
              body: p("Este texto solo se ve con el enlace de borrador."),
            },
          },
        ],
      },
    },
  });

  return {
    homeId: home.id,
    draftToken: DRAFT_TOKEN,
    publishedPosts: published.length,
    featuredCategory: featuredCat?.slug ?? null,
  };
}
