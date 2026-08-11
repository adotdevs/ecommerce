import type { CartItem } from "@/types";
import { calculateCheckoutTotals } from "@/lib/checkout/shipping";
import type { ShippingCalculationOptions } from "@/lib/shipping/settings";

const VARIANT_SEPARATOR = " — ";

export function splitCartItemName(name: string): {
  title: string;
  variant?: string;
} {
  const index = name.indexOf(VARIANT_SEPARATOR);
  if (index === -1) {
    return { title: name };
  }

  return {
    title: name.slice(0, index).trim(),
    variant: name.slice(index + VARIANT_SEPARATOR.length).trim() || undefined,
  };
}

export function getCartItemKey(item: CartItem): string {
  return `${item.productId}-${item.variantId ?? "default"}`;
}

/** @deprecated Use resolveFreeShippingThresholdUsd with shipping settings instead. */
export const FREE_SHIPPING_THRESHOLD_USD = 100;
/** @deprecated Use shipping settings instead. */
export const STANDARD_SHIPPING_USD = 9.99;
export const ESTIMATED_TAX_RATE = 0.08;

export function calculateCartTotals(
  subtotalUsd: number,
  discountUsd = 0,
  options?: ShippingCalculationOptions
) {
  return calculateCheckoutTotals(subtotalUsd, "standard", discountUsd, options);
}
