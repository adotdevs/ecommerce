import type { CartItem } from "@/types";

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

export const FREE_SHIPPING_THRESHOLD_USD = 100;
export const STANDARD_SHIPPING_USD = 9.99;
export const ESTIMATED_TAX_RATE = 0.08;

export function calculateCartTotals(subtotalUsd: number, discountUsd = 0) {
  const shippingUsd =
    subtotalUsd >= FREE_SHIPPING_THRESHOLD_USD ? 0 : STANDARD_SHIPPING_USD;
  const taxableUsd = Math.max(0, subtotalUsd - discountUsd);
  const taxUsd = taxableUsd * ESTIMATED_TAX_RATE;
  const totalUsd = subtotalUsd + shippingUsd + taxUsd - discountUsd;

  return { shippingUsd, taxUsd, totalUsd, discountUsd };
}
