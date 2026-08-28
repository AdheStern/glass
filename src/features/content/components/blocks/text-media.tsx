import { TextMediaData } from "../../blocks/schemas";
import { Reveal } from "../animated";
import { BlockImage } from "../block-image";
import { RichTextView } from "../rich-text-view";

export function TextMediaBlock({ data }: { data: unknown }) {
  const d = TextMediaData.parse(data);
  const media = d.imagePath ? (
    <BlockImage
      path={d.imagePath}
      alt=""
      className="h-auto w-full rounded-xl"
    />
  ) : null;

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12">
      <Reveal
        className={`grid items-center gap-8 ${media ? "md:grid-cols-2" : ""}`}
      >
        {media && d.layout === "media-left" && media}
        <RichTextView
          value={d.body}
          className="flex flex-col gap-3 text-black/75"
        />
        {media && d.layout === "media-right" && media}
      </Reveal>
    </section>
  );
}
