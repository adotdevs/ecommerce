/** Built-in locale metadata — admin can add more via Site Settings */
export const builtInLocaleCodes = [
  "en",
  "ar",
  "ur",
  "fr",
  "de",
  "es",
  "hi",
  "pt",
  "it",
  "tr",
  "zh",
  "ja",
  "ko",
  "nl",
  "pl",
  "ru",
  "id",
  "bn",
] as const;

/** All codes next-intl routing accepts (built-in + custom from admin) */
export const routingLocales: string[] = [...builtInLocaleCodes];

export const locales = builtInLocaleCodes;
export type Locale = string;

export const defaultLocale = "en";

export interface LanguageEntry {
  code: string;
  label: string;
  nativeLabel: string;
  dir: "ltr" | "rtl";
  enabled: boolean;
}

export const localeConfig: Record<
  string,
  {
    label: string;
    nativeLabel: string;
    dir: "ltr" | "rtl";
    dateLocale: string;
  }
> = {
  en: { label: "English", nativeLabel: "English", dir: "ltr", dateLocale: "en-US" },
  ar: { label: "Arabic", nativeLabel: "العربية", dir: "rtl", dateLocale: "ar-SA" },
  ur: { label: "Urdu", nativeLabel: "اردو", dir: "rtl", dateLocale: "ur-PK" },
  fr: { label: "French", nativeLabel: "Français", dir: "ltr", dateLocale: "fr-FR" },
  de: { label: "German", nativeLabel: "Deutsch", dir: "ltr", dateLocale: "de-DE" },
  es: { label: "Spanish", nativeLabel: "Español", dir: "ltr", dateLocale: "es-ES" },
  hi: { label: "Hindi", nativeLabel: "हिन्दी", dir: "ltr", dateLocale: "hi-IN" },
  pt: { label: "Portuguese", nativeLabel: "Português", dir: "ltr", dateLocale: "pt-BR" },
  it: { label: "Italian", nativeLabel: "Italiano", dir: "ltr", dateLocale: "it-IT" },
  tr: { label: "Turkish", nativeLabel: "Türkçe", dir: "ltr", dateLocale: "tr-TR" },
  zh: { label: "Chinese", nativeLabel: "中文", dir: "ltr", dateLocale: "zh-CN" },
  ja: { label: "Japanese", nativeLabel: "日本語", dir: "ltr", dateLocale: "ja-JP" },
  ko: { label: "Korean", nativeLabel: "한국어", dir: "ltr", dateLocale: "ko-KR" },
  nl: { label: "Dutch", nativeLabel: "Nederlands", dir: "ltr", dateLocale: "nl-NL" },
  pl: { label: "Polish", nativeLabel: "Polski", dir: "ltr", dateLocale: "pl-PL" },
  ru: { label: "Russian", nativeLabel: "Русский", dir: "ltr", dateLocale: "ru-RU" },
  id: { label: "Indonesian", nativeLabel: "Bahasa Indonesia", dir: "ltr", dateLocale: "id-ID" },
  bn: { label: "Bengali", nativeLabel: "বাংলা", dir: "ltr", dateLocale: "bn-BD" },
};

export const defaultLanguages: LanguageEntry[] = [
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr", enabled: true },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl", enabled: true },
  { code: "ur", label: "Urdu", nativeLabel: "اردو", dir: "rtl", enabled: true },
  { code: "fr", label: "French", nativeLabel: "Français", dir: "ltr", enabled: true },
  { code: "de", label: "German", nativeLabel: "Deutsch", dir: "ltr", enabled: true },
  { code: "es", label: "Spanish", nativeLabel: "Español", dir: "ltr", enabled: true },
];

export interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  currency: string;
  defaultLocale: Locale;
}

export const countries: CountryConfig[] = [
  { code: "US", name: "United States", flag: "🇺🇸", currency: "USD", defaultLocale: "en" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "GBP", defaultLocale: "en" },
  { code: "AU", name: "Australia", flag: "🇦🇺", currency: "AUD", defaultLocale: "en" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", currency: "AED", defaultLocale: "ar" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", currency: "SAR", defaultLocale: "ar" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", currency: "PKR", defaultLocale: "ur" },
  { code: "FR", name: "France", flag: "🇫🇷", currency: "EUR", defaultLocale: "fr" },
  { code: "DE", name: "Germany", flag: "🇩🇪", currency: "EUR", defaultLocale: "de" },
  { code: "ES", name: "Spain", flag: "🇪🇸", currency: "EUR", defaultLocale: "es" },
];

export const currencies = [
  { code: "USD", symbol: "$", rate: 1 },
  { code: "EUR", symbol: "€", rate: 0.92 },
  { code: "GBP", symbol: "£", rate: 0.79 },
  { code: "AUD", symbol: "A$", rate: 1.52 },
  { code: "AED", symbol: "د.إ", rate: 3.67 },
  { code: "SAR", symbol: "﷼", rate: 3.75 },
  { code: "PKR", symbol: "₨", rate: 278.5 },
] as const;

export type CurrencyCode = (typeof currencies)[number]["code"];

export function getCountryByCode(code: string): CountryConfig | undefined {
  return countries.find((c) => c.code === code);
}

export function getCurrencyRate(code: string, rates?: Record<string, number>): number {
  if (rates?.[code]) return rates[code];
  return currencies.find((c) => c.code === code)?.rate ?? 1;
}

export function detectLocaleFromCountry(countryCode: string): Locale {
  return getCountryByCode(countryCode)?.defaultLocale ?? defaultLocale;
}

export function detectLocaleFromAcceptLanguage(header: string | null): Locale {
  if (!header) return defaultLocale;
  const preferred = header.split(",")[0]?.split("-")[0]?.toLowerCase();
  if (preferred && routingLocales.includes(preferred)) {
    return preferred;
  }
  return defaultLocale;
}

export function isKnownRoutingLocale(code: string): boolean {
  return routingLocales.includes(code);
}
