import type { ShippingMethodId } from "@/lib/checkout/types";
import {
  calculateShippingUsd,
  type ShippingCalculationOptions,
  type ShippingSettings,
} from "@/lib/shipping/settings";
import {
  DEFAULT_TAX_RATE_PERCENT,
  taxRateFraction,
} from "@/lib/tax/settings";

export {
  calculateShippingUsd,
  DEFAULT_SHIPPING_SETTINGS,
  normalizeShippingSettings,
  resolveFreeShippingThresholdUsd,
  resolveShippingRates,
  isStandardShippingAlwaysFree,
  cartAllItemsHaveFreeShipping,
  type ShippingCalculationOptions,
  type ShippingCountryRule,
  type ShippingSettings,
} from "@/lib/shipping/settings";

export type CheckoutTotalsOptions = ShippingCalculationOptions & {
  taxRatePercent?: number;
};

export function calculateCheckoutTotals(
  subtotalUsd: number,
  method: ShippingMethodId = "standard",
  discountUsd = 0,
  options?: CheckoutTotalsOptions
) {
  const shippingUsd = calculateShippingUsd(subtotalUsd, method, options);
  const taxableUsd = Math.max(0, subtotalUsd - discountUsd);
  const rate = taxRateFraction(
    options?.taxRatePercent ?? DEFAULT_TAX_RATE_PERCENT
  );
  const taxUsd = taxableUsd * rate;
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
