"use client";

import { useDisplayPreferences } from "@/components/providers/DisplayPreferencesContext";
import { useShippingSettings } from "@/components/providers/ShippingSettingsContext";
import { useCountry, useLocaleHydrated } from "@/stores/locale-store";
import { resolveFreeShippingThresholdUsd } from "@/lib/shipping/settings";

/** Free-shipping threshold for the current Deliver-to country. */
export function useFreeShippingThresholdUsd(): number {
  const { country: prefCountry } = useDisplayPreferences();
  const storeCountry = useCountry();
  const hydrated = useLocaleHydrated();
  const shippingSettings = useShippingSettings();
  const country = hydrated ? storeCountry : prefCountry;

  return resolveFreeShippingThresholdUsd({
    config: shippingSettings,
    countryCode: country,
  });
}
