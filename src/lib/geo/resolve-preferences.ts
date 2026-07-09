import type { NextRequest } from "next/server";
import { defaultLocale } from "@/config/locales";
import { resolveStoreLocale } from "@/lib/i18n/enabled-locales";
import { fetchGeoByIp, getClientIp } from "./ip-api";
import {
  currencyFromCountry,
  currencyFromLocale,
  localeFromCountry,
  normalizeLocale,
} from "./country-preferences";
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

function finalizePreferences(
  country: string,
  idealLocale: string,
  currency: string
): GeoPreferences {
  return {
    country,
    currency,
    locale: resolveStoreLocale(idealLocale),
  };
}

async function detectCountryFromIp(
  request: NextRequest
): Promise<{ countryCode: string; ipCurrency?: string } | null> {
  const ip = getClientIp(request);
  if (!ip) return null;

  const geo = await fetchGeoByIp(ip);
  if (!geo?.countryCode) return null;

  return {
    countryCode: geo.countryCode.toUpperCase(),
    ipCurrency: geo.currency?.toUpperCase(),
  };
}

/**
 * Resolve storefront preferences from IP / CDN headers.
 * Country is auto-detected; locale falls back to English if unavailable.
 */
export async function resolveGeoPreferences(
  request: NextRequest
): Promise<GeoPreferences> {
  const acceptLang = request.headers.get("accept-language");
  const devCountry = process.env.DEV_GEO_COUNTRY?.toUpperCase();

  if (devCountry) {
    const idealLocale = localeFromCountry(devCountry);
    const currency = currencyFromCountry(devCountry);
    return finalizePreferences(devCountry, idealLocale, currency);
  }

  let countryCode =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    null;

  let ipCurrency: string | undefined;

  if (!countryCode) {
    const ipGeo = await detectCountryFromIp(request);
    if (ipGeo) {
      countryCode = ipGeo.countryCode;
      ipCurrency = ipGeo.ipCurrency;
    }
  }

  if (countryCode) {
    countryCode = countryCode.toUpperCase();
    const idealLocale = localeFromCountry(countryCode);
    const currency = currencyFromCountry(countryCode, ipCurrency);
    return finalizePreferences(countryCode, idealLocale, currency);
  }

  const langLocale = localeFromAcceptLanguage(acceptLang);
  if (langLocale) {
    return finalizePreferences(
      "US",
      langLocale,
      currencyFromLocale(langLocale)
    );
  }

  return finalizePreferences("US", defaultLocale, "USD");
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

export function isGeoReady(request: NextRequest): boolean {
  return (
    request.cookies.get("geo-preferences-set")?.value === "1" &&
    request.cookies.get("geo-version")?.value === GEO_COOKIE_VERSION
  );
}

export function buildPreferencesFromCookies(
  request: NextRequest,
  manualLocale: boolean,
  manualCurrency: boolean
): GeoPreferences {
  const country =
    request.cookies.get("preferred-country")?.value ??
    request.cookies.get("country-detected")?.value ??
    "US";

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
