import { Skeleton } from "@/components/ds/skeleton";

export function CartPageSkeleton() {
  return (
    <div className="container-store py-8 md:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <Skeleton className="mt-6 h-20 w-full rounded-[var(--radius-lg)]" />

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-5"
            >
              <Skeleton className="h-28 w-28 shrink-0 rounded-[var(--radius-md)]" />
              <div className="flex flex-1 flex-col gap-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-9 w-32" />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[var(--radius-lg)] border border-border bg-card p-6">
          <Skeleton className="h-6 w-40" />
          <div className="mt-6 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="mt-6 h-12 w-full rounded-[var(--radius-md)]" />
        </div>
      </div>
    </div>
  );
}
