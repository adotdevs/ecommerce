import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  type Locale,
  type CurrencyCode,
  defaultLocale,
  currencies,
  getCountryByCode,
} from "@/config/locales";

export interface LocalePreferences {
  locale: Locale;
  country: string;
  currency: CurrencyCode;
  exchangeRates: Record<string, number>;
}

interface LocaleState extends LocalePreferences {
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  setLocale: (locale: Locale) => void;
  setCountry: (code: string) => void;
  setCurrency: (code: CurrencyCode) => void;
  setExchangeRates: (rates: Record<string, number>) => void;
  applyPreferences: (prefs: Partial<LocalePreferences>) => void;
}

const defaultRates = Object.fromEntries(
  currencies.map((c) => [c.code, c.rate])
) as Record<string, number>;

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: defaultLocale,
      country: "US",
      currency: "USD",
      exchangeRates: defaultRates,
      hasHydrated: false,

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      setLocale: (locale) => set({ locale }),

      setCountry: (code) => {
        const country = getCountryByCode(code);
        if (!country) return;
        set({
          country: code,
          currency: country.currency as CurrencyCode,
          locale: country.defaultLocale,
        });
      },

      setCurrency: (currency) => set({ currency }),

      setExchangeRates: (rates) =>
        set((s) => ({ exchangeRates: { ...s.exchangeRates, ...rates } })),

      applyPreferences: (prefs) => set((s) => ({ ...s, ...prefs })),
    }),
    {
      name: "locale-preferences",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        locale: s.locale,
        country: s.country,
        currency: s.currency,
        exchangeRates: s.exchangeRates,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export const useCountry = () => useLocaleStore((s) => s.country);
export const useCurrency = () => useLocaleStore((s) => s.currency);
export const useStoreLocale = () => useLocaleStore((s) => s.locale);
export const useExchangeRates = () => useLocaleStore((s) => s.exchangeRates);
export const useLocaleHydrated = () => useLocaleStore((s) => s.hasHydrated);
