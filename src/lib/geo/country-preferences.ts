import {
  defaultLocale,
  routingLocales,
  type Locale,
} from "@/config/locales";

/** ISO 3166-1 alpha-2 → storefront locale (Pakistan always English per business rule). */
export const countryLocaleMap: Record<string, Locale> = {
  US: "en",
  GB: "en",
  AU: "en",
  CA: "en",
  NZ: "en",
  IE: "en",
  PK: "en",
  IN: "en",
  SG: "en",
  PH: "en",
  ZA: "en",
  NG: "en",
  KE: "en",
  FR: "fr",
  BE: "fr",
  CH: "fr",
  LU: "fr",
  MC: "fr",
  DE: "de",
  AT: "de",
  ES: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  CL: "es",
  PE: "es",
  AE: "ar",
  SA: "ar",
  EG: "ar",
  QA: "ar",
  KW: "ar",
  BH: "ar",
  OM: "ar",
  JO: "ar",
  LB: "ar",
  MA: "ar",
  DZ: "ar",
  IQ: "ar",
  IT: "it",
  PT: "pt",
  BR: "pt",
  TR: "tr",
  JP: "ja",
  CN: "zh",
  TW: "zh",
  HK: "zh",
  KR: "ko",
  NL: "nl",
  PL: "pl",
  RU: "ru",
  UA: "ru",
  ID: "id",
  BD: "bn",
};

/** ISO country → default currency when ip-api currency is unavailable. */
export const countryCurrencyMap: Record<string, string> = {
  US: "USD",
  GB: "GBP",
  AU: "AUD",
  CA: "CAD",
  NZ: "NZD",
  IE: "EUR",
  PK: "PKR",
  IN: "INR",
  FR: "EUR",
  DE: "EUR",
  ES: "EUR",
  IT: "EUR",
  PT: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
  KW: "KWD",
  BH: "BHD",
  OM: "OMR",
  JO: "JOD",
  EG: "EGP",
  MA: "MAD",
  TR: "TRY",
  JP: "JPY",
  CN: "CNY",
  KR: "KRW",
  SG: "SGD",
  HK: "HKD",
  MX: "MXN",
  BR: "BRL",
  ZA: "ZAR",
  CH: "CHF",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  PL: "PLN",
  RU: "RUB",
  ID: "IDR",
  BD: "BDT",
  PH: "PHP",
  NG: "NGN",
  KE: "KES",
};

/** Locale → likely currency when only language is known (no country). */
export const localeCurrencyMap: Record<string, string> = {
  en: "USD",
  ar: "AED",
  ur: "PKR",
  fr: "EUR",
  de: "EUR",
  es: "EUR",
  hi: "INR",
  pt: "EUR",
  it: "EUR",
  tr: "TRY",
  zh: "CNY",
  ja: "JPY",
  ko: "KRW",
  nl: "EUR",
  pl: "PLN",
  ru: "RUB",
  id: "IDR",
  bn: "BDT",
};

export function localeFromCountry(countryCode: string): Locale {
  if (countryCode === "PK") return "en";
  const mapped = countryLocaleMap[countryCode];
  if (mapped && routingLocales.includes(mapped)) return mapped;
  return defaultLocale;
}

export function currencyFromCountry(countryCode: string, ipCurrency?: string): string {
  if (countryCode === "PK") return "PKR";
  if (ipCurrency && isSupportedCurrency(ipCurrency)) return ipCurrency;
  return countryCurrencyMap[countryCode] ?? "USD";
}

export function currencyFromLocale(locale: string): string {
  return localeCurrencyMap[locale] ?? "USD";
}

const SUPPORTED_CURRENCIES = new Set([
  "USD", "EUR", "GBP", "AUD", "CAD", "AED", "SAR", "PKR", "INR", "JPY",
  "CNY", "KRW", "SGD", "HKD", "CHF", "SEK", "NOK", "DKK", "PLN", "RUB",
  "TRY", "BRL", "MXN", "ZAR", "IDR", "BDT", "PHP", "NGN", "KES", "QAR",
  "KWD", "BHD", "OMR", "JOD", "EGP", "MAD", "NZD",
]);

export function isSupportedCurrency(code: string): boolean {
  return SUPPORTED_CURRENCIES.has(code.toUpperCase());
}

export function normalizeLocale(code: string | null | undefined): Locale | null {
  if (!code) return null;
  const base = code.toLowerCase().split("-")[0];
  return routingLocales.includes(base) ? base : null;
}
