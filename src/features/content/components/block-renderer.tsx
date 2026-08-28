// Glass — render de un documento por bloques (§11.1). Un `switch` sobre el tipo.
import type { ContentBlock } from "../types";
import { BentoBlock } from "./blocks/bento";
import { CtaWhatsappBlock } from "./blocks/cta-whatsapp";
import { FaqBlock } from "./blocks/faq";
import { GalleryBlock } from "./blocks/gallery";
import { HeroBlock } from "./blocks/hero";
import { MapContactBlock } from "./blocks/map-contact";
import { PostsBlock } from "./blocks/posts";
import { ProductGridBlock } from "./blocks/product-grid";
import { TestimonialsBlock } from "./blocks/testimonials";
import { TextMediaBlock } from "./blocks/text-media";

function One({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "HERO":
      return <HeroBlock data={block.data} />;
    case "BENTO":
      return <BentoBlock data={block.data} />;
    case "PRODUCT_GRID":
      return <ProductGridBlock data={block.data} />;
    case "TEXT_MEDIA":
      return <TextMediaBlock data={block.data} />;
    case "GALLERY":
      return <GalleryBlock data={block.data} />;
    case "TESTIMONIALS":
      return <TestimonialsBlock data={block.data} />;
    case "FAQ":
      return <FaqBlock data={block.data} />;
    case "MAP_CONTACT":
      return <MapContactBlock data={block.data} />;
    case "CTA_WHATSAPP":
      return <CtaWhatsappBlock data={block.data} />;
    case "POSTS":
      return <PostsBlock data={block.data} />;
    default:
      return null;
  }
}

export function BlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <>
      {blocks.map((b) => (
        <One key={b.id} block={b} />
      ))}
    </>
  );
}
