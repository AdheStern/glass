// Glass — texto enriquecido de los bloques del CMS (§11.1). Puro. El editor
// produce este AST; el servidor lo **sanea al guardar** y el render es
// determinista: nunca se inyecta HTML del cliente.

export interface RichInline {
  text: string;
  bold?: boolean;
  italic?: boolean;
  href?: string;
}

export type RichNode =
  | { type: "p"; children: RichInline[] }
  | { type: "ul"; items: RichInline[][] }
  | { type: "ol"; items: RichInline[][] };

export type RichText = RichNode[];

// Solo enlaces de navegación normal: nada de `javascript:`, `data:`, etc.
const SAFE_URL = /^(https?:\/\/|\/|mailto:|tel:)/i;

export function safeUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const t = url.trim();
  return t && SAFE_URL.test(t) ? t : null;
}

function sanitizeInline(node: unknown): RichInline | null {
  if (!node || typeof node !== "object") return null;
  const o = node as Record<string, unknown>;
  const text = typeof o.text === "string" ? o.text : "";
  if (!text) return null;
  const out: RichInline = { text };
  if (o.bold === true) out.bold = true;
  if (o.italic === true) out.italic = true;
  const href = safeUrl(o.href);
  if (href) out.href = href;
  return out;
}

function sanitizeInlines(arr: unknown): RichInline[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(sanitizeInline).filter((x): x is RichInline => x !== null);
}

/** Descarta nodos y marcas fuera de lo permitido; sanea los `href` (§11.1). */
export function sanitizeRichText(input: unknown): RichText {
  if (!Array.isArray(input)) return [];
  const out: RichText = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    if (o.type === "p") {
      const children = sanitizeInlines(o.children);
      if (children.length) out.push({ type: "p", children });
    } else if (o.type === "ul" || o.type === "ol") {
      const items = Array.isArray(o.items)
        ? o.items.map(sanitizeInlines).filter((it) => it.length > 0)
        : [];
      if (items.length) out.push({ type: o.type, items });
    }
  }
  return out;
}

export function richTextToPlain(nodes: RichText): string {
  const parts: string[] = [];
  for (const n of nodes) {
    if (n.type === "p") {
      parts.push(n.children.map((c) => c.text).join(""));
    } else {
      for (const item of n.items) parts.push(item.map((c) => c.text).join(""));
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function isEmptyRichText(nodes: RichText): boolean {
  return richTextToPlain(nodes).length === 0;
}
