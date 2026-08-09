"use client";

import { createContext, useContext, useMemo } from "react";
import { useLocale } from "next-intl";
import type { Locale, CurrencyCode } from "@/config/locales";
import {
  useExchangeRates,
  useLocaleHydrated,
} from "@/stores/locale-store";

export interface DisplayPreferences {
  currency: CurrencyCode;
  locale: Locale;
  country: string;
  exchangeRates: Record<string, number>;
}

const defaultRates = Object.fromEntries(
  ["USD", "EUR", "GBP"].map((c) => [c, 1])
) as Record<string, number>;

const DisplayPreferencesContext = createContext<DisplayPreferences>({
  currency: "USD",
  locale: "en",
  country: "US",
  exchangeRates: defaultRates,
});

export function DisplayPreferencesProvider({
  value,
  children,
}: {
  value: DisplayPreferences;
  children: React.ReactNode;
}) {
  const hydrated = useLocaleHydrated();
  const storeRates = useExchangeRates();
  const routeLocale = useLocale() as Locale;

  const liveValue = useMemo(
    () => ({
      ...value,
      locale: routeLocale,
      exchangeRates: hydrated ? storeRates : value.exchangeRates,
    }),
    [value, routeLocale, hydrated, storeRates]
  );

  return (
    <DisplayPreferencesContext.Provider value={liveValue}>
      {children}
    </DisplayPreferencesContext.Provider>
  );
}

export function useDisplayPreferences() {
  return useContext(DisplayPreferencesContext);
}
