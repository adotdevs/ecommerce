import { ESTIMATED_TAX_RATE } from "@/lib/cart/display";
import type { ShippingMethodId } from "@/lib/checkout/types";
import {
  calculateShippingUsd,
  type ShippingCalculationOptions,
  type ShippingSettings,
} from "@/lib/shipping/settings";

export {
  calculateShippingUsd,
  DEFAULT_SHIPPING_SETTINGS,
  normalizeShippingSettings,
  resolveFreeShippingThresholdUsd,
  resolveShippingRates,
  type ShippingCalculationOptions,
  type ShippingCountryRule,
  type ShippingSettings,
} from "@/lib/shipping/settings";

export function calculateCheckoutTotals(
  subtotalUsd: number,
  method: ShippingMethodId = "standard",
  discountUsd = 0,
  options?: ShippingCalculationOptions
) {
  const shippingUsd = calculateShippingUsd(subtotalUsd, method, options);
  const taxableUsd = Math.max(0, subtotalUsd - discountUsd);
  const taxUsd = taxableUsd * ESTIMATED_TAX_RATE;
  const totalUsd = subtotalUsd + shippingUsd + taxUsd - discountUsd;

  return { shippingUsd, taxUsd, totalUsd, discountUsd };
}

export function buildShippingOptions(
  countryCode: string | undefined,
  config: ShippingSettings
): ShippingCalculationOptions {
  return {
    countryCode: countryCode?.trim() || undefined,
    config,
  };
}
