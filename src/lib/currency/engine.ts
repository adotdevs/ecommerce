import { currencies, getCurrencyRate } from "@/config/locales";

export interface ExchangeRateProvider {
  fetchRates(baseCurrency?: string): Promise<Record<string, number>>;
}

/** Default static rates — replace with live API (OpenExchangeRates, Fixer, etc.) */
export class StaticExchangeRateProvider implements ExchangeRateProvider {
  async fetchRates(): Promise<Record<string, number>> {
    return Object.fromEntries(currencies.map((c) => [c.code, c.rate]));
  }
}

export class CurrencyEngine {
  private rates: Record<string, number>;
  private baseCurrency: string;

  constructor(
    rates?: Record<string, number>,
    baseCurrency = "USD",
    private provider: ExchangeRateProvider = new StaticExchangeRateProvider()
  ) {
    this.rates =
      rates ??
      Object.fromEntries(currencies.map((c) => [c.code, c.rate]));
    this.baseCurrency = baseCurrency;
  }

  async refreshRates(): Promise<Record<string, number>> {
    this.rates = await this.provider.fetchRates(this.baseCurrency);
    return this.rates;
  }

  getRates(): Record<string, number> {
    return { ...this.rates };
  }

  convert(amount: number, from: string, to: string): number {
    if (from === to) return amount;
    const fromRate = getCurrencyRate(from, this.rates);
    const toRate = getCurrencyRate(to, this.rates);
    const inBase = amount / fromRate;
    return inBase * toRate;
  }

  convertFromBase(amountUsd: number, to: string): number {
    return amountUsd * getCurrencyRate(to, this.rates);
  }

  format(
    amountUsd: number,
    currency: string,
    locale = "en-US"
  ): string {
    const converted = this.convertFromBase(amountUsd, currency);
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(converted);
  }
}

export const currencyEngine = new CurrencyEngine();
