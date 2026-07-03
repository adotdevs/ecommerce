import {
  type Locale,
  type CurrencyCode,
  localeConfig,
  getCurrencyRate,
} from "@/config/locales";

export function convertFromUsd(
  amountUsd: number,
  currency: CurrencyCode,
  exchangeRates: Record<string, number>
): number {
  return amountUsd * getCurrencyRate(currency, exchangeRates);
}

export function formatMoney(
  amountUsd: number,
  currency: CurrencyCode,
  locale: Locale,
  exchangeRates: Record<string, number>
): string {
  const converted = convertFromUsd(amountUsd, currency, exchangeRates);
  const dateLocale = localeConfig[locale]?.dateLocale ?? "en-US";
  return new Intl.NumberFormat(dateLocale, {
    style: "currency",
    currency,
  }).format(converted);
}
