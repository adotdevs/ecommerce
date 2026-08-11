"use client";

import { useTranslations } from "next-intl";
import { useFormattedPrice } from "@/hooks/use-formatted-price";
import { useDisplayPreferences } from "@/components/providers/DisplayPreferencesContext";
import { useShippingSettings } from "@/components/providers/ShippingSettingsContext";
import { buildShippingOptions } from "@/lib/checkout/shipping";
import { resolveFreeShippingThresholdUsd } from "@/lib/shipping/settings";
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
  const { country } = useDisplayPreferences();
  const shippingSettings = useShippingSettings();
  const shippingOptions = buildShippingOptions(country, shippingSettings);
  const thresholdUsd = resolveFreeShippingThresholdUsd(shippingOptions);
  const formattedCurrent = useFormattedPrice(subtotalUsd);
  const formattedGoal = useFormattedPrice(thresholdUsd);
  const remainingUsd = Math.max(0, thresholdUsd - subtotalUsd);
  const formattedRemaining = useFormattedPrice(remainingUsd);
  const progress =
    thresholdUsd > 0 ? Math.min(100, (subtotalUsd / thresholdUsd) * 100) : 100;
  const unlocked = thresholdUsd <= 0 || subtotalUsd >= thresholdUsd;

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
