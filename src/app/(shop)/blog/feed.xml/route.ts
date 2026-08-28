// Glass — canal RSS del blog (§11.2).
import { getSiteSettings } from "@/db/settings";
import { listPublishedPosts } from "@/features/content/queries";

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

function xmlEsc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  const [settings, { posts }] = await Promise.all([
    getSiteSettings(),
    listPublishedPosts(1),
  ]);

  const items = posts
    .map((p) => {
      const url = `${SITE_URL}/blog/${p.slug}`;
      return `    <item>
      <title>${xmlEsc(p.title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      ${p.publishedAt ? `<pubDate>${p.publishedAt.toUTCString()}</pubDate>` : ""}
      ${p.excerpt ? `<description>${xmlEsc(p.excerpt)}</description>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xmlEsc(settings.name)} · Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Novedades de ${xmlEsc(settings.name)}</description>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=600, s-maxage=600",
    },
  });
}
