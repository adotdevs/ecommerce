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

/**
 * Marketing amounts (free-shipping thresholds, promo copy).
 * Convert then round up to a whole unit so FX never produces £22.17-style prices.
 * Rounding up keeps the advertised threshold at or above the real USD cutoff.
 */
export function formatPromoMoney(
  amountUsd: number,
  currency: CurrencyCode,
  locale: Locale,
  exchangeRates: Record<string, number>
): string {
  const converted = convertFromUsd(amountUsd, currency, exchangeRates);
  const whole = Number.isFinite(converted)
    ? Math.max(0, Math.ceil(converted - 1e-9))
    : 0;
  const dateLocale = localeConfig[locale]?.dateLocale ?? "en-US";
  return new Intl.NumberFormat(dateLocale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(whole);
}
