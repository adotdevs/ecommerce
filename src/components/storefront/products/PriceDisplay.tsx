"use client";

import { useFormattedPrice } from "@/hooks/use-formatted-price";

export function PriceDisplay({
  amountUsd,
  className,
}: {
  amountUsd: number;
  className?: string;
}) {
  const formatted = useFormattedPrice(amountUsd);
  return <span className={className}>{formatted}</span>;
}
