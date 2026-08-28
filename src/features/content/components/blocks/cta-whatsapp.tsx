import { getSiteSettings } from "@/db/settings";
import { CtaWhatsappData } from "../../blocks/schemas";

export async function CtaWhatsappBlock({ data }: { data: unknown }) {
  const d = CtaWhatsappData.parse(data);
  const settings = await getSiteSettings();
  const number = settings.whatsappNumbers[0]?.e164?.replace(/\D/g, "");
  const href = number
    ? `https://wa.me/${number}${
        d.prefilledMessage
          ? `?text=${encodeURIComponent(d.prefilledMessage)}`
          : ""
      }`
    : "#";

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-[var(--brand)] px-6 py-8 text-center text-[var(--on-brand)] sm:flex-row sm:text-left">
        <p className="text-lg font-semibold">{d.heading}</p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[var(--surface)] px-5 py-2.5 font-medium text-[var(--ink)]"
        >
          {d.buttonLabel}
        </a>
      </div>
    </section>
  );
}
