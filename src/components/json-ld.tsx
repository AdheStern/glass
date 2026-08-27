// Glass — datos estructurados (§20.2). Escapa `<` para evitar inyección (json-ld guide).

// biome-ignore lint/suspicious/noExplicitAny: payload schema.org arbitrario
export function JsonLd({ data }: { data: Record<string, any> }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON serializado y escapado
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
