import {
  FREE_SHIPPING_THRESHOLD_USD,
  STANDARD_SHIPPING_USD,
  ESTIMATED_TAX_RATE,
} from "@/lib/cart/display";
import type { ShippingMethodId } from "@/lib/checkout/types";

const EXPRESS_SHIPPING_USD = 14.99;
const OVERNIGHT_SHIPPING_USD = 29.99;

export function calculateShippingUsd(
  subtotalUsd: number,
  method: ShippingMethodId = "standard"
): number {
  if (method === "standard") {
    return subtotalUsd >= FREE_SHIPPING_THRESHOLD_USD ? 0 : STANDARD_SHIPPING_USD;
  }
  if (method === "express") return EXPRESS_SHIPPING_USD;
  return OVERNIGHT_SHIPPING_USD;
}

export function calculateCheckoutTotals(
  subtotalUsd: number,
  method: ShippingMethodId = "standard",
  discountUsd = 0
) {
  const shippingUsd = calculateShippingUsd(subtotalUsd, method);
  const taxUsd = subtotalUsd * ESTIMATED_TAX_RATE;
  const totalUsd = subtotalUsd + shippingUsd + taxUsd - discountUsd;

  return { shippingUsd, taxUsd, totalUsd, discountUsd };
}
