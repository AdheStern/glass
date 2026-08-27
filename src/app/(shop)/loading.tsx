import { GridSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 h-8 w-40 animate-pulse rounded bg-black/10" />
      <GridSkeleton />
    </div>
  );
}
