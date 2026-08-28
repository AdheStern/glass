import { JsonLd } from "@/components/json-ld";
import { richTextToPlain } from "@/domain/rich-text";
import { FaqData } from "../../blocks/schemas";
import { RichTextView } from "../rich-text-view";

export function FaqBlock({ data }: { data: unknown }) {
  const d = FaqData.parse(data);
  if (d.items.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: d.items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: richTextToPlain(it.a) },
    })),
  };

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12">
      <JsonLd data={jsonLd} />
      <h2 className="mb-4 text-2xl font-bold tracking-tight">
        Preguntas frecuentes
      </h2>
      <div className="flex flex-col divide-y divide-black/10">
        {d.items.map((it, i) => (
          <details key={it.q + i} className="group py-3">
            <summary className="cursor-pointer list-none font-medium marker:content-none">
              {it.q}
            </summary>
            <div className="pt-2 text-black/70">
              <RichTextView value={it.a} />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
