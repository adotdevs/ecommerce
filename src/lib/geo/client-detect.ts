"use client";

import type { GeoPreferences } from "@/lib/geo/types";
import { localeFromCountry, currencyFromCountry } from "@/lib/geo/country-preferences";
import { resolveStoreLocale } from "@/lib/i18n/enabled-locales";
import { GEO_COOKIE_VERSION } from "./constants";

interface IpapiCoResponse {
  country_code?: string;
  currency?: string;
  error?: boolean;
}

/** Browser-side geo fallback for localhost / when middleware cannot resolve IP. */
export async function detectGeoFromBrowser(): Promise<GeoPreferences | null> {
  try {
    const res = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as IpapiCoResponse;
    if (data.error || !data.country_code) return null;

    const country = data.country_code.toUpperCase();
    const idealLocale = localeFromCountry(country);
    const currency = currencyFromCountry(country, data.currency?.toUpperCase());

    return {
      country,
      currency,
      locale: resolveStoreLocale(idealLocale),
    };
  } catch {
    return null;
  }
}

export function setGeoCookies(prefs: GeoPreferences) {
  const maxAge = 60 * 60 * 24 * 365;
  const set = (name: string, value: string) => {
    document.cookie = `${name}=${value};path=/;max-age=${maxAge}`;
  };
  set("geo-preferences-set", "1");
  set("geo-version", GEO_COOKIE_VERSION);
  set("country-detected", prefs.country);
  set("preferred-country", prefs.country);
  if (!document.cookie.includes("preferences-manual-currency=true")) {
    set("preferred-currency", prefs.currency);
  }
  if (!document.cookie.includes("preferences-manual-locale=true")) {
    set("preferred-locale", prefs.locale);
    set("NEXT_LOCALE", prefs.locale);
  }
}
