"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import type { Locale } from "@/config/locales";
import { useCurrency, useExchangeRates, useLocaleHydrated } from "@/stores/locale-store";
import { useDisplayPreferences } from "@/components/providers/DisplayPreferencesContext";
import { formatMoney } from "@/lib/currency/format";

export function useFormattedPrice(amountUsd: number): string {
  const storeCurrency = useCurrency();
  const routeLocale = useLocale() as Locale;
  const exchangeRates = useExchangeRates();
  const hydrated = useLocaleHydrated();
  const serverPrefs = useDisplayPreferences();

  return useMemo(() => {
    const currency = hydrated ? storeCurrency : serverPrefs.currency;
    const locale = hydrated ? routeLocale : serverPrefs.locale;
    const rates = hydrated ? exchangeRates : serverPrefs.exchangeRates;
    return formatMoney(amountUsd, currency, locale, rates);
  }, [
    amountUsd,
    storeCurrency,
    routeLocale,
    exchangeRates,
    hydrated,
    serverPrefs.currency,
    serverPrefs.locale,
    serverPrefs.exchangeRates,
  ]);
}
