"use client";

import type { GeoPreferences } from "@/lib/geo/types";
import {
  currencyFromCountry,
  localeFromCountry,
} from "@/lib/geo/country-preferences";
import { resolveStoreLocale } from "@/lib/i18n/enabled-locales";
import { resolveGeoFromBrowser } from "@/lib/geo/multi-provider";
import { GEO_COOKIE_VERSION } from "./constants";

function strictPreferencesFromCountry(
  countryCode: string,
  ipCurrency?: string
): GeoPreferences {
  const country = countryCode.toUpperCase();
  return {
    country,
    currency: currencyFromCountry(country, ipCurrency),
    locale: resolveStoreLocale(localeFromCountry(country)),
  };
}

/** Browser-side geo using multiple IP services in parallel. */
export async function detectGeoFromBrowser(): Promise<GeoPreferences | null> {
  const consensus = await resolveGeoFromBrowser();
  if (!consensus) return null;
  return strictPreferencesFromCountry(consensus.countryCode, consensus.currency);
}

export function setGeoCookies(prefs: GeoPreferences) {
  const maxAge = 60 * 60 * 24 * 365;
  const set = (name: string, value: string) => {
    document.cookie = `${name}=${value};path=/;max-age=${maxAge}`;
  };

  set("geo-preferences-set", "1");
  set("geo-version", GEO_COOKIE_VERSION);
  set("country-detected", prefs.country);

  if (!document.cookie.includes("preferences-manual-country=true")) {
    set("preferred-country", prefs.country);
  }
  if (!document.cookie.includes("preferences-manual-currency=true")) {
    set("preferred-currency", prefs.currency);
  }
  if (!document.cookie.includes("preferences-manual-locale=true")) {
    set("preferred-locale", prefs.locale);
    set("NEXT_LOCALE", prefs.locale);
  }
}
