import type { CartItem } from "@/types";
import {
  calculateCheckoutTotals,
  type CheckoutTotalsOptions,
} from "@/lib/checkout/shipping";
import { DEFAULT_TAX_RATE_PERCENT, taxRateFraction } from "@/lib/tax/settings";

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
/** @deprecated Prefer site settings taxRatePercent via useTaxRatePercent / normalizeTaxRatePercent. */
export const ESTIMATED_TAX_RATE = taxRateFraction(DEFAULT_TAX_RATE_PERCENT);

export function calculateCartTotals(
  subtotalUsd: number,
  discountUsd = 0,
  options?: CheckoutTotalsOptions
) {
  return calculateCheckoutTotals(subtotalUsd, "standard", discountUsd, options);
}
