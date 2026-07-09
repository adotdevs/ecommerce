"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useLocaleStore } from "@/stores/locale-store";
import { localeConfig, type Locale, type CurrencyCode } from "@/config/locales";
import { detectGeoFromBrowser, setGeoCookies } from "@/lib/geo/client-detect";
import { GEO_COOKIE_VERSION } from "@/lib/geo/constants";

export interface ServerPreferences {
  country?: string;
  currency?: string;
  locale?: string;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match?.[2];
}

function isManualLocale(): boolean {
  return (
    readCookie("preferences-manual-locale") === "true" ||
    readCookie("preferences-manual") === "true"
  );
}

function isManualCurrency(): boolean {
  return readCookie("preferences-manual-currency") === "true";
}

function isGeoReady(): boolean {
  return (
    readCookie("geo-preferences-set") === "1" &&
    readCookie("geo-version") === GEO_COOKIE_VERSION
  );
}

export function LocaleInitializer({
  locale,
  serverPreferences,
}: {
  locale: Locale;
  serverPreferences?: ServerPreferences;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const applyPreferences = useLocaleStore((s) => s.applyPreferences);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const setExchangeRates = useLocaleStore((s) => s.setExchangeRates);
  const hasHydrated = useLocaleStore((s) => s.hasHydrated);

  useEffect(() => {
    const dir = localeConfig[locale]?.dir ?? "ltr";
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale]);

  useEffect(() => {
    if (serverPreferences?.country || serverPreferences?.currency) {
      applyPreferences({
        ...(serverPreferences.country ? { country: serverPreferences.country } : {}),
        ...(serverPreferences.currency
          ? { currency: serverPreferences.currency as CurrencyCode }
          : {}),
      });
    }
    setLocale(locale);
  }, [locale, serverPreferences, applyPreferences, setLocale]);

  useEffect(() => {
    if (!hasHydrated) return;

    const country = readCookie("preferred-country") ?? readCookie("country-detected");
    const currency = readCookie("preferred-currency") as CurrencyCode | undefined;

    if (country || currency) {
      applyPreferences({
        ...(country ? { country } : {}),
        ...(currency ? { currency } : {}),
      });
    }
    setLocale(locale);
  }, [locale, hasHydrated, applyPreferences, setLocale]);

  // Client-side geo fallback when middleware could not detect (localhost, stale cookies)
  useEffect(() => {
    if (isGeoReady()) return;

    async function runGeoDetect() {
      let prefs = null;

      try {
        const res = await fetch("/api/v1/geo/detect");
        const data = await res.json();
        if (data.success && data.data?.country) {
          prefs = data.data as {
            country: string;
            currency: string;
            locale: string;
          };
        }
      } catch {
        /* try browser fallback */
      }

      if (!prefs) {
        prefs = await detectGeoFromBrowser();
      }

      if (!prefs) return;

      setGeoCookies(prefs);

      const patch: { country: string; currency?: CurrencyCode } = {
        country: prefs.country,
      };
      if (!isManualCurrency()) {
        patch.currency = prefs.currency as CurrencyCode;
      }
      applyPreferences(patch);

      if (!isManualLocale() && prefs.locale !== locale) {
        router.replace(pathname, { locale: prefs.locale as Locale });
      }
    }

    runGeoDetect();
  }, [locale, pathname, router, applyPreferences]);

  useEffect(() => {
    fetch("/api/v1/currency/rates")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.rates) {
          setExchangeRates(d.data.rates);
        }
      })
      .catch(() => {});
  }, [setExchangeRates]);

  return null;
}
