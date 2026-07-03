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
  rating = 4.5,
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
      {count !== undefined && (
        <span className="text-small text-muted-foreground">({count})</span>
      )}
    </div>
  );
}

function hashRating(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % 100;
  return 3.8 + (hash % 12) / 10;
}

export function getProductRating(productId: string) {
  const rating = hashRating(productId);
  const count = 12 + (hashRating(productId + "c") * 100) % 200;
  return { rating: Math.round(rating * 10) / 10, count: Math.floor(count) };
}
