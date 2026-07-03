import { cn } from "@/components/ds/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-sm)] bg-secondary",
        className
      )}
      {...props}
    />
  );
}
