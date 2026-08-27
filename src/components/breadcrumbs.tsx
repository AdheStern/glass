// Glass — migas de pan. Server Component.
import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Ruta"
      className="flex flex-wrap items-center gap-1 text-sm text-black/50"
    >
      {items.map((c, i) => (
        <span key={`${c.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden>/</span>}
          {c.href && i < items.length - 1 ? (
            <Link href={c.href} className="hover:text-black/80">
              {c.label}
            </Link>
          ) : (
            <span className={i === items.length - 1 ? "text-black/70" : ""}>
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
