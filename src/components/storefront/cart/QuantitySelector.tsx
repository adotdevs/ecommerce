"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ds/button";
import { cn } from "@/components/ds/utils";

interface QuantitySelectorProps {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  min?: number;
  max?: number;
  className?: string;
}

export function QuantitySelector({
  quantity,
  onDecrease,
  onIncrease,
  min = 1,
  max,
  className,
}: QuantitySelectorProps) {
  const atMax = max != null && quantity >= max;

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[var(--radius-sm)] border border-border bg-background p-1 shadow-[var(--shadow-subtle)]",
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="h-8 w-8 rounded-[6px] hover:bg-secondary"
        onClick={onDecrease}
        disabled={quantity <= min}
        aria-label="Decrease quantity"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <span className="min-w-10 text-center text-sm font-semibold tabular-nums text-foreground">
        {quantity}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="h-8 w-8 rounded-[6px] hover:bg-secondary"
        onClick={onIncrease}
        disabled={atMax}
        aria-label="Increase quantity"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
