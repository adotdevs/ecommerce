import type { NextRequest } from "next/server";
import { defaultLocale } from "@/config/locales";
import { resolveStoreLocale } from "@/lib/i18n/enabled-locales";
import { getClientIp } from "./ip-api";
import {
  currencyFromCountry,
  currencyFromLocale,
  localeFromCountry,
  normalizeLocale,
} from "./country-preferences";
import { resolveGeoFromRequest } from "./multi-provider";
import type { GeoPreferences } from "./types";
import { GEO_COOKIE_VERSION } from "./constants";

export { GEO_COOKIE_VERSION };

function localeFromAcceptLanguage(header: string | null): string | null {
  if (!header) return null;
  const parts = header.split(",").map((p) => p.trim().split(";")[0]);
  for (const part of parts) {
    const locale = normalizeLocale(part);
    if (locale) return locale;
  }
  return null;
}

/** Strict: country drives both locale and currency together. */
function strictPreferencesFromCountry(
  countryCode: string,
  ipCurrency?: string
): GeoPreferences {
  const country = countryCode.toUpperCase();
  const idealLocale = localeFromCountry(country);
  const currency = currencyFromCountry(country, ipCurrency);
  return {
    country,
    currency,
    locale: resolveStoreLocale(idealLocale),
  };
}

/**
 * Resolve storefront preferences from CDN headers + multiple IP geolocation APIs.
 * Country, currency, and locale are always derived together from detected country.
 */
export async function resolveGeoPreferences(
  request: NextRequest
): Promise<GeoPreferences> {
  const acceptLang = request.headers.get("accept-language");
  const devCountry = process.env.DEV_GEO_COUNTRY?.toUpperCase();

  if (devCountry) {
    return strictPreferencesFromCountry(devCountry);
  }

  const ip = getClientIp(request);
  const consensus = await resolveGeoFromRequest(request, ip);

  if (consensus) {
    return strictPreferencesFromCountry(consensus.countryCode, consensus.currency);
  }

  const langLocale = localeFromAcceptLanguage(acceptLang);
  if (langLocale) {
    return {
      country: "US",
      locale: resolveStoreLocale(langLocale),
      currency: currencyFromLocale(langLocale),
    };
  }

  return strictPreferencesFromCountry("US");
}

export function isManualLocale(request: NextRequest): boolean {
  return (
    request.cookies.get("preferences-manual-locale")?.value === "true" ||
    request.cookies.get("preferences-manual")?.value === "true"
  );
}

export function isManualCurrency(request: NextRequest): boolean {
  return request.cookies.get("preferences-manual-currency")?.value === "true";
}

export function isManualCountry(request: NextRequest): boolean {
  return request.cookies.get("preferences-manual-country")?.value === "true";
}

export function isGeoReady(request: NextRequest): boolean {
  return (
    request.cookies.get("geo-preferences-set")?.value === "1" &&
    request.cookies.get("geo-version")?.value === GEO_COOKIE_VERSION
  );
}

export function buildPreferencesFromCookies(
  request: NextRequest,
  manualLocale: boolean,
  manualCurrency: boolean,
  manualCountry: boolean
): GeoPreferences {
  const detectedCountry =
    request.cookies.get("country-detected")?.value ?? "US";

  const country = manualCountry
    ? (request.cookies.get("preferred-country")?.value ?? detectedCountry)
    : detectedCountry;

  const currency = manualCurrency
    ? (request.cookies.get("preferred-currency")?.value ?? "USD")
    : currencyFromCountry(country);

  let locale: string;
  if (manualLocale) {
    const cookieLocale =
      request.cookies.get("preferred-locale")?.value ??
      request.cookies.get("NEXT_LOCALE")?.value ??
      defaultLocale;
    locale = resolveStoreLocale(cookieLocale);
  } else {
    locale = resolveStoreLocale(localeFromCountry(country));
  }

  return { country, currency, locale };
}
