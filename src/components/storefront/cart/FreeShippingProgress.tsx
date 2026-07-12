"use client";

import { useTranslations } from "next-intl";
import { useFormattedPrice } from "@/hooks/use-formatted-price";
import {
  FREE_SHIPPING_THRESHOLD_USD,
} from "@/lib/cart/display";
import { cn } from "@/components/ds/utils";

interface FreeShippingProgressProps {
  subtotalUsd: number;
  className?: string;
}

export function FreeShippingProgress({
  subtotalUsd,
  className,
}: FreeShippingProgressProps) {
  const t = useTranslations("cart");
  const formattedCurrent = useFormattedPrice(subtotalUsd);
  const formattedGoal = useFormattedPrice(FREE_SHIPPING_THRESHOLD_USD);
  const remainingUsd = Math.max(0, FREE_SHIPPING_THRESHOLD_USD - subtotalUsd);
  const formattedRemaining = useFormattedPrice(remainingUsd);
  const progress = Math.min(100, (subtotalUsd / FREE_SHIPPING_THRESHOLD_USD) * 100);
  const unlocked = subtotalUsd >= FREE_SHIPPING_THRESHOLD_USD;

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border bg-card px-4 py-4 shadow-[var(--shadow-subtle)] md:px-5",
        className
      )}
    >
      <p className="text-small font-medium text-foreground">
        {unlocked
          ? t("freeShippingUnlocked")
          : t("freeShippingAway", { amount: formattedRemaining })}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[12px] text-muted-foreground">
        <span>{formattedCurrent}</span>
        <span>{formattedGoal}</span>
      </div>
    </div>
  );
}
