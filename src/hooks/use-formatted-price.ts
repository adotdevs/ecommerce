"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import type { Locale } from "@/config/locales";
import { useCurrency, useExchangeRates } from "@/stores/locale-store";
import { formatMoney } from "@/lib/currency/format";

export function useFormattedPrice(amountUsd: number): string {
  const currency = useCurrency();
  const locale = useLocale() as Locale;
  const exchangeRates = useExchangeRates();

  return useMemo(
    () => formatMoney(amountUsd, currency, locale, exchangeRates),
    [amountUsd, currency, locale, exchangeRates]
  );
}
