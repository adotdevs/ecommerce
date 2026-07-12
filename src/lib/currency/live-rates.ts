import { currencies as staticCurrencies } from "@/config/locales";
import {
  buildStaticFallback,
  loadPersistedExchangeRates,
  savePersistedExchangeRates,
} from "@/lib/currency/persisted-rates";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cachedRates: Record<string, number> | null = null;
let cachedAt = 0;
let lastRateSource: "live" | "memory" | "persisted" | "static" = "static";

const staticFallback = buildStaticFallback();

/**
 * Fetch live USD-base exchange rates.
 * Uses open.er-api.com (free, no API key).
 * On success, rates are cached in memory and persisted to the database.
 * On failure, uses memory cache, then last persisted rates, then static config.
 */
export async function fetchLiveExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && now - cachedAt < CACHE_TTL_MS) {
    lastRateSource = "memory";
    return cachedRates;
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("Rate API failed");
    const data = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    if (data.result !== "success" || !data.rates) throw new Error("Invalid rate data");

    const rates: Record<string, number> = { USD: 1 };
    for (const [code, rate] of Object.entries(data.rates)) {
      if (typeof rate === "number" && rate > 0) {
        rates[code] = rate;
      }
    }

    for (const c of staticCurrencies) {
      if (!rates[c.code]) rates[c.code] = c.rate;
    }

    cachedRates = rates;
    cachedAt = now;
    lastRateSource = "live";
    void savePersistedExchangeRates(rates);
    return rates;
  } catch {
    if (cachedRates) {
      lastRateSource = "memory";
      return { ...cachedRates };
    }

    const persisted = await loadPersistedExchangeRates();
    if (persisted) {
      cachedRates = persisted;
      cachedAt = now;
      lastRateSource = "persisted";
      return persisted;
    }

    lastRateSource = "static";
    return { ...staticFallback };
  }
}

export function getLastExchangeRateSource() {
  return lastRateSource;
}

export function getCachedRates(): Record<string, number> {
  return cachedRates ?? { ...staticFallback };
}
