"use client";

import { useEffect } from "react";
import { useLocaleStore } from "@/stores/locale-store";
import { localeConfig, type Locale, type CurrencyCode } from "@/config/locales";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match?.[2];
}

export function LocaleInitializer({ locale }: { locale: Locale }) {
  const applyPreferences = useLocaleStore((s) => s.applyPreferences);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const hasHydrated = useLocaleStore((s) => s.hasHydrated);

  useEffect(() => {
    const dir = localeConfig[locale]?.dir ?? "ltr";
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale]);

  useEffect(() => {
    if (!hasHydrated) return;

    const country = getCookie("preferred-country") ?? getCookie("country-detected");
    const currency = getCookie("preferred-currency") as CurrencyCode | undefined;

    applyPreferences({
      ...(country ? { country } : {}),
      ...(currency ? { currency } : {}),
    });
    setLocale(locale);
  }, [locale, hasHydrated, applyPreferences, setLocale]);

  useEffect(() => {
    fetch("/api/v1/currency/rates")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.rates) {
          useLocaleStore.getState().setExchangeRates(d.data.rates);
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
