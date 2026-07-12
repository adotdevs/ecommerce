"use client";

import { Flame } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ds/utils";
import { isLowStock } from "@/lib/inventory/stock";

interface LowStockHintProps {
  count: number;
  className?: string;
  /** Compact single-line style for inside buttons */
  compact?: boolean;
}

export function LowStockHint({ count, className, compact }: LowStockHintProps) {
  const t = useTranslations("products");

  if (!isLowStock(count)) return null;

  if (compact) {
    return (
      <span className={cn("text-[11px] font-semibold leading-tight", className)}>
        {t("lowStockShort", { count })}
      </span>
    );
  }

  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-800 dark:text-amber-200",
        className
      )}
    >
      <Flame className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-300" />
      {t("lowStock", { count })}
    </p>
  );
}
