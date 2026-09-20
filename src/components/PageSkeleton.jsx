import { Skeleton } from "@/components/ui/skeleton";

// Layout-matched loading skeleton for full-page data loads. Mirrors the
// standard page anatomy (title block, hero row, content grid) so the
// transition into real content feels continuous. Subtle dark contrast only —
// no bright flashing, and prefers-reduced-motion is honored globally in CSS.
export default function PageSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-6 md:py-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-14 w-full max-w-2xl rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
        <Skeleton className="h-56 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[104px] rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}