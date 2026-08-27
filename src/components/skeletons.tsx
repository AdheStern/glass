// Glass — placeholders para loading.tsx y los fallbacks de <Suspense>.

export function PriceSkeleton() {
  return (
    <span
      className="inline-block h-5 w-20 animate-pulse rounded bg-black/10"
      aria-hidden
    />
  );
}

export function BadgeSkeleton() {
  return (
    <span
      className="inline-block h-4 w-16 animate-pulse rounded-full bg-black/10"
      aria-hidden
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="w-full animate-pulse rounded-[var(--radius-card)] bg-black/10"
        style={{ aspectRatio: "var(--ratio-media)" }}
        aria-hidden
      />
      <div
        className="h-4 w-3/4 animate-pulse rounded bg-black/10"
        aria-hidden
      />
      <div
        className="h-5 w-1/3 animate-pulse rounded bg-black/10"
        aria-hidden
      />
    </div>
  );
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => `sk-${i}`).map((k) => (
        <CardSkeleton key={k} />
      ))}
    </div>
  );
}
