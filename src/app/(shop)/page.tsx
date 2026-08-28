import type { Metadata } from "next";
import { getSiteSettings } from "@/db/settings";
import { BlockRenderer } from "@/features/content/components/block-renderer";
import { DefaultHome } from "@/features/content/components/default-home";
import { getHomePage } from "@/features/content/queries";

export async function generateMetadata(): Promise<Metadata> {
  const [home, settings] = await Promise.all([
    getHomePage(),
    getSiteSettings(),
  ]);
  return {
    title: home?.metaTitle || settings.name,
    description: home?.metaDesc || undefined,
  };
}

export default async function HomePage() {
  const home = await getHomePage();
  if (!home) return <DefaultHome />;
  return (
    <div className="flex flex-col">
      <BlockRenderer blocks={home.blocks} />
    </div>
  );
}
