// Glass — navegación por categorías (§7). Server Component, sin JS.
import Link from "next/link";
import type { CategoryNode } from "@/catalog/types";

export function CategoryNav({
  tree,
  activeSlug,
}: {
  tree: CategoryNode[];
  activeSlug?: string;
}) {
  const chip =
    "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors";
  const on = "border-[var(--brand)] bg-[var(--brand)] text-[var(--on-brand)]";
  const off = "border-black/15 text-black/70 hover:border-black/40";

  return (
    <nav
      aria-label="Categorías"
      className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1"
    >
      <Link href="/catalogo" className={`${chip} ${!activeSlug ? on : off}`}>
        Todo
      </Link>
      {tree.map((cat) => (
        <Link
          key={cat.id}
          href={`/catalogo/${cat.slug}`}
          className={`${chip} ${activeSlug === cat.slug ? on : off}`}
        >
          {cat.name}
        </Link>
      ))}
    </nav>
  );
}
