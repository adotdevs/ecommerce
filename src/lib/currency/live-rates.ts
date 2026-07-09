import { currencies as staticCurrencies } from "@/config/locales";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cachedRates: Record<string, number> | null = null;
let cachedAt = 0;

const staticFallback = Object.fromEntries(
  staticCurrencies.map((c) => [c.code, c.rate])
) as Record<string, number>;

/**
 * Fetch live USD-base exchange rates.
 * Uses open.er-api.com (free, no API key). Falls back to static config rates.
 */
export async function fetchLiveExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && now - cachedAt < CACHE_TTL_MS) {
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

    // Ensure configured currencies always have a rate
    for (const c of staticCurrencies) {
      if (!rates[c.code]) rates[c.code] = c.rate;
    }

    cachedRates = rates;
    cachedAt = now;
    return rates;
  } catch {
    return { ...staticFallback };
  }
}

export function getCachedRates(): Record<string, number> {
  return cachedRates ?? { ...staticFallback };
}
