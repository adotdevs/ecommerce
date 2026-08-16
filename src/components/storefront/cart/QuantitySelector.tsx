"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@heroui/react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("cart");
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
        size="sm"
        isIconOnly
        onPress={onDecrease}
        isDisabled={quantity <= min}
        aria-label={t("decreaseQuantity")}
      >
        <Minus />
      </Button>
      <span className="min-w-10 text-center text-sm font-semibold tabular-nums text-foreground">
        {quantity}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        isIconOnly
        onPress={onIncrease}
        isDisabled={atMax}
        aria-label={t("increaseQuantity")}
      >
        <Plus />
      </Button>
    </div>
  );
}
