import { TestimonialsData } from "../../blocks/schemas";
import { StaggerGrid } from "../animated";
import { BlockImage } from "../block-image";

export function TestimonialsBlock({ data }: { data: unknown }) {
  const d = TestimonialsData.parse(data);
  if (d.items.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12">
      <StaggerGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {d.items.map((t, i) => (
          <figure
            key={t.name + i}
            className="flex flex-col gap-3 rounded-xl border border-black/10 p-5"
          >
            <blockquote className="text-black/75">“{t.quote}”</blockquote>
            <figcaption className="flex items-center gap-2 text-sm font-medium">
              {t.photoPath && (
                <BlockImage
                  path={t.photoPath}
                  alt={t.name}
                  className="size-8 rounded-full object-cover"
                />
              )}
              {t.name}
            </figcaption>
          </figure>
        ))}
      </StaggerGrid>
    </section>
  );
}
