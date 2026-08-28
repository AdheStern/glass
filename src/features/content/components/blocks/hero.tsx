import Link from "next/link";
import { safeUrl } from "@/domain/rich-text";
import { HeroData } from "../../blocks/schemas";
import { Reveal } from "../animated";
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

  const text = (
    <Reveal className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
        {d.title}
      </h1>
      {d.subtitle && (
        <p className="max-w-xl text-lg text-black/60">{d.subtitle}</p>
      )}
      {buttons.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-3">
          {buttons.map((b, i) => (
            <Link
              key={b.href + i}
              href={b.href}
              className={
                i === 0
                  ? "rounded-lg bg-[var(--brand)] px-5 py-2.5 font-medium text-[var(--on-brand)]"
                  : "rounded-lg border border-black/15 px-5 py-2.5 font-medium"
              }
            >
              {b.label}
            </Link>
          ))}
        </div>
      )}
    </Reveal>
  );

  if (d.variant === "minimal") {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-16 text-center">
        <div className="mx-auto flex max-w-2xl flex-col items-center">
          {text}
        </div>
      </section>
    );
  }
  if (d.variant === "split") {
    return (
      <section className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-2">
        {text}
        {media && <div className="aspect-4/3 md:aspect-square">{media}</div>}
      </section>
    );
  }
  // center
  return (
    <section className="relative mx-auto w-full max-w-6xl px-4 py-16">
      {media && (
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl opacity-25">
          {media}
        </div>
      )}
      <div className="mx-auto max-w-2xl text-center">{text}</div>
    </section>
  );
}
