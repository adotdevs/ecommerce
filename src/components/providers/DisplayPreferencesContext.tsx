"use client";

import { createContext, useContext } from "react";
import type { Locale, CurrencyCode } from "@/config/locales";

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
  return (
    <DisplayPreferencesContext.Provider value={value}>
      {children}
    </DisplayPreferencesContext.Provider>
  );
}

export function useDisplayPreferences() {
  return useContext(DisplayPreferencesContext);
}
