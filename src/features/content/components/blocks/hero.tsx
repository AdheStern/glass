import Link from "next/link";
import { safeUrl } from "@/domain/rich-text";
import { HeroData } from "../../blocks/schemas";
import { Aurora, Reveal, StaggerGrid } from "../animated";
import { BlockImage } from "../block-image";

export function HeroBlock({ data }: { data: unknown }) {
  const d = HeroData.parse(data);
  const buttons = d.buttons
    .map((b) => ({ label: b.label, href: safeUrl(b.href) ?? "/" }))
    .slice(0, 2);

  const media = d.mediaPath ? (
    d.mediaKind === "video" ? (
      <video
        src={d.mediaPath}
        autoPlay
        muted
        loop
        playsInline
        className="h-full w-full rounded-2xl object-cover"
      />
    ) : (
      <BlockImage
        path={d.mediaPath}
        alt={d.title}
        priority
        className="h-full w-full rounded-2xl object-cover"
      />
    )
  ) : null;

  const cta = buttons.length > 0 && (
    <div className="mt-2 flex flex-wrap gap-3">
      {buttons.map((b, i) => (
        <Link
          key={b.href + i}
          href={b.href}
          className={
            i === 0
              ? "rounded-lg bg-[var(--brand)] px-5 py-2.5 font-medium text-[var(--on-brand)] transition-transform hover:-translate-y-0.5"
              : "rounded-lg border border-black/15 px-5 py-2.5 font-medium hover:border-black/40"
          }
        >
          {b.label}
        </Link>
      ))}
    </div>
  );

  const text = (
    <StaggerGrid className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">
        {d.title}
      </h1>
      {d.subtitle && (
        <p className="max-w-xl text-lg text-black/60">{d.subtitle}</p>
      )}
      {cta}
    </StaggerGrid>
  );

  if (d.variant === "minimal") {
    return (
      <section className="relative mx-auto w-full max-w-4xl px-4 py-20 text-center">
        <Aurora />
        <div className="mx-auto flex max-w-2xl flex-col items-center">
          {text}
        </div>
      </section>
    );
  }
  if (d.variant === "split") {
    return (
      <section className="relative mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-2">
        <Aurora />
        {text}
        {media && (
          <Reveal delay={0.15} className="aspect-4/3 md:aspect-square">
            {media}
          </Reveal>
        )}
      </section>
    );
  }
  // center
  return (
    <section className="relative mx-auto w-full max-w-6xl px-4 py-20">
      <Aurora />
      {media && (
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl opacity-20">
          {media}
        </div>
      )}
      <div className="mx-auto max-w-2xl text-center">{text}</div>
    </section>
  );
}
