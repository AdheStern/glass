import { getSiteSettings } from "@/db/settings";
import { safeUrl } from "@/domain/rich-text";
import { MapContactData } from "../../blocks/schemas";
import { LazyMap } from "./lazy-map";

export async function MapContactBlock({ data }: { data: unknown }) {
  const d = MapContactData.parse(data);
  const settings = await getSiteSettings();
  const address =
    d.address ||
    (settings.address
      ? Object.values(settings.address).filter(Boolean).join(", ")
      : "");
  const wa = settings.whatsappNumbers[0]?.e164;
  const embed = d.mapEmbedUrl && safeUrl(d.mapEmbedUrl) ? d.mapEmbedUrl : null;

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-12 md:grid-cols-2">
      <div className="flex flex-col gap-3 text-sm">
        <h2 className="text-2xl font-bold tracking-tight">Dónde estamos</h2>
        {address && <p className="text-black/70">{address}</p>}
        {d.showHours && Object.keys(settings.hours).length > 0 && (
          <ul className="text-black/70">
            {Object.entries(settings.hours).map(([day, h]) => (
              <li key={day}>
                <span className="font-medium">{day}:</span> {h}
              </li>
            ))}
          </ul>
        )}
        {d.showWhatsapp && wa && (
          <a
            href={`https://wa.me/${wa.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            WhatsApp {wa}
          </a>
        )}
      </div>
      {embed && <LazyMap src={embed} />}
    </section>
  );
}
