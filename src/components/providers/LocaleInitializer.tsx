"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
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
  const raw = match?.[2];
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
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

function isManualCountry(): boolean {
  return readCookie("preferences-manual-country") === "true";
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
  const didSeedFromServer = useRef(false);

  // Apply SSR cookie values before first paint so zustand never flashes defaults.
  useLayoutEffect(() => {
    if (!serverPreferences?.country && !serverPreferences?.currency) return;
    applyPreferences({
      ...(serverPreferences.country ? { country: serverPreferences.country } : {}),
      ...(serverPreferences.currency
        ? { currency: serverPreferences.currency as CurrencyCode }
        : {}),
    });
  }, [serverPreferences, applyPreferences]);

  useEffect(() => {
    const dir = localeConfig[locale]?.dir ?? "ltr";
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    setLocale(locale);
  }, [locale, setLocale]);

  // Seed store from SSR cookies once, before localStorage hydrates.
  useEffect(() => {
    if (didSeedFromServer.current || hasHydrated) return;
    if (serverPreferences?.country || serverPreferences?.currency) {
      applyPreferences({
        ...(serverPreferences.country ? { country: serverPreferences.country } : {}),
        ...(serverPreferences.currency
          ? { currency: serverPreferences.currency as CurrencyCode }
          : {}),
      });
    }
    didSeedFromServer.current = true;
  }, [hasHydrated, serverPreferences, applyPreferences]);

  // After localStorage hydrates, cookies always win over stale persisted state.
  useEffect(() => {
    if (!hasHydrated) return;

    const country =
      readCookie("preferred-country") ?? readCookie("country-detected");
    const currency = readCookie("preferred-currency");

    applyPreferences({
      ...(country ? { country } : {}),
      ...(currency ? { currency: currency as CurrencyCode } : {}),
    });
  }, [hasHydrated, applyPreferences]);

  // Multi-provider geo detect when cookies are stale or missing (localhost, first visit)
  useEffect(() => {
    if (isGeoReady()) return;

    async function runGeoDetect() {
      let prefs: { country: string; currency: string; locale: string } | null =
        null;

      try {
        const res = await fetch("/api/v1/geo/detect", { cache: "no-store" });
        const data = await res.json();
        if (data.success && data.data?.country) {
          prefs = data.data;
        }
      } catch {
        /* try browser fallback */
      }

      if (!prefs) {
        prefs = await detectGeoFromBrowser();
      }

      if (!prefs) return;

      setGeoCookies(prefs);

      const patch: {
        country?: string;
        currency?: CurrencyCode;
      } = {};

      if (!isManualCountry()) patch.country = prefs.country;
      if (!isManualCurrency()) patch.currency = prefs.currency as CurrencyCode;

      if (Object.keys(patch).length > 0) {
        applyPreferences(patch);
      }

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
