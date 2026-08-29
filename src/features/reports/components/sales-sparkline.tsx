// Glass — curva de ventas del tablero (§18.1). SVG puro, sin librería de charts.
import { formatBob } from "@/domain/money";
import { sparklinePoints } from "@/domain/reports";

export function SalesSparkline({
  data,
}: {
  data: { day: string; netBob: number }[];
}) {
  const W = 640;
  const H = 120;
  const values = data.map((d) => d.netBob);
  const line = sparklinePoints(values, W, H);
  const area = line ? `0,${H} ${line} ${W},${H}` : "";
  const max = Math.max(1, ...values);

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-32 w-full"
        role="img"
        aria-label={`Ventas de los últimos ${data.length} días`}
        preserveAspectRatio="none"
      >
        <polygon points={area} fill="var(--brand)" fillOpacity={0.12} />
        <polyline
          points={line}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <figcaption className="flex justify-between text-xs text-muted-foreground">
        <span>{data[0]?.day}</span>
        <span>máx {formatBob(max)}</span>
        <span>{data.at(-1)?.day}</span>
      </figcaption>
    </figure>
  );
}
