// Glass — ¿el comercio está abierto ahora? (§9.3). Puro, hora local del navegador.
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** `hours` = { mon: "08:00-18:30", ... } o rangos múltiples "08:00-12:00,14:00-18:00". */
export function isOpenNow(
  hours: Record<string, string>,
  now = new Date(),
): boolean {
  if (!hours || Object.keys(hours).length === 0) return true; // sin horario → siempre
  const key = DAY_KEYS[now.getDay()];
  const spec = hours[key];
  if (!spec) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return spec.split(",").some((range) => {
    const [a, b] = range.split("-").map((s) => {
      const [h, m] = s.trim().split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    });
    return a != null && b != null && minutes >= a && minutes <= b;
  });
}
