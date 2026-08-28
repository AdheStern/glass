import { GalleryData } from "../../blocks/schemas";
import { BlockImage } from "../block-image";

const COLS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
};

export function GalleryBlock({ data }: { data: unknown }) {
  const d = GalleryData.parse(data);
  if (d.images.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className={`grid gap-3 ${COLS[d.columns] ?? COLS[3]}`}>
        {d.images.map((img, i) => (
          <a
            key={img.path + i}
            href={img.path.startsWith("pool/") ? undefined : img.path}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-lg"
          >
            <BlockImage
              path={img.path}
              alt={img.alt || ""}
              className="aspect-square h-full w-full object-cover transition-transform hover:scale-105"
            />
          </a>
        ))}
      </div>
    </section>
  );
}
