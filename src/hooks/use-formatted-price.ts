"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import type { Locale } from "@/config/locales";
import { useExchangeRates, useLocaleHydrated } from "@/stores/locale-store";
import { useDisplayPreferences } from "@/components/providers/DisplayPreferencesContext";
import { formatMoney, formatPromoMoney } from "@/lib/currency/format";

export function useFormattedPrice(amountUsd: number): string {
  const { currency, exchangeRates: serverRates } = useDisplayPreferences();
  const routeLocale = useLocale() as Locale;
  const storeRates = useExchangeRates();
  const hydrated = useLocaleHydrated();

  return useMemo(() => {
    const rates = hydrated ? storeRates : serverRates;
    return formatMoney(amountUsd, currency, routeLocale, rates);
  }, [amountUsd, currency, routeLocale, storeRates, serverRates, hydrated]);
}

/** Whole-unit FX display for promo copy (thresholds), not product/cart totals. */
export function useFormattedPromoPrice(amountUsd: number): string {
  const { currency, exchangeRates: serverRates } = useDisplayPreferences();
  const routeLocale = useLocale() as Locale;
  const storeRates = useExchangeRates();
  const hydrated = useLocaleHydrated();

  return useMemo(() => {
    const rates = hydrated ? storeRates : serverRates;
    return formatPromoMoney(amountUsd, currency, routeLocale, rates);
  }, [amountUsd, currency, routeLocale, storeRates, serverRates, hydrated]);
}
