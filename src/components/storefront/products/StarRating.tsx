"use client";

import { Star } from "lucide-react";
import { cn } from "@/components/ds/utils";

interface StarRatingProps {
  rating?: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}

export function StarRating({
  rating = 0,
  count,
  size = "sm",
  className,
}: StarRatingProps) {
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = rating >= i + 1;
          const partial = !filled && rating > i;
          return (
            <Star
              key={i}
              className={cn(
                iconSize,
                filled || partial
                  ? "fill-amber-400 text-amber-400"
                  : "fill-none text-muted-foreground/40"
              )}
            />
          );
        })}
      </div>
      {count !== undefined && count > 0 && (
        <span className="text-small text-muted-foreground">({count})</span>
      )}
    </div>
  );
}
