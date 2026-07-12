import { connectDB } from "@/lib/db/mongoose";
import { SiteSettings } from "@/models";
import { currencies as staticCurrencies } from "@/config/locales";

const SETTINGS_KEY = "global";

export function buildStaticFallback(): Record<string, number> {
  return Object.fromEntries(staticCurrencies.map((c) => [c.code, c.rate])) as Record<
    string,
    number
  >;
}

function mergeWithStatic(rates: Record<string, number>): Record<string, number> {
  const merged: Record<string, number> = { ...buildStaticFallback(), USD: 1 };
  for (const [code, rate] of Object.entries(rates)) {
    if (typeof rate === "number" && rate > 0) {
      merged[code] = rate;
    }
  }
  return merged;
}

export async function loadPersistedExchangeRates(): Promise<Record<string, number> | null> {
  try {
    await connectDB();
    const settings = await SiteSettings.findOne({ key: SETTINGS_KEY })
      .select("exchangeRatesCache currencies")
      .lean();

    if (settings?.exchangeRatesCache?.rates) {
      return mergeWithStatic(
        settings.exchangeRatesCache.rates as Record<string, number>
      );
    }

    if (settings?.currencies?.length) {
      const fromSettings = Object.fromEntries(
        settings.currencies.map((c) => [c.code, c.rate])
      ) as Record<string, number>;
      return mergeWithStatic(fromSettings);
    }
  } catch (error) {
    console.error("[exchange-rates] load persisted failed:", error);
  }

  return null;
}

export async function savePersistedExchangeRates(
  rates: Record<string, number>
): Promise<void> {
  try {
    await connectDB();

    await SiteSettings.updateOne(
      { key: SETTINGS_KEY },
      {
        $set: {
          exchangeRatesCache: {
            rates,
            updatedAt: new Date(),
          },
        },
      }
    );

    const settings = await SiteSettings.findOne({ key: SETTINGS_KEY });
    if (!settings?.currencies?.length) return;

    let changed = false;
    for (const currency of settings.currencies) {
      const nextRate = rates[currency.code];
      if (typeof nextRate === "number" && nextRate > 0 && currency.rate !== nextRate) {
        currency.rate = nextRate;
        changed = true;
      }
    }

    if (changed) {
      await settings.save();
    }
  } catch (error) {
    console.error("[exchange-rates] persist failed:", error);
  }
}
