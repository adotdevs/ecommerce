import {
  fetchLiveExchangeRates,
  getLastExchangeRateSource,
} from "@/lib/currency/live-rates";
import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  const rates = await fetchLiveExchangeRates();
  const source = getLastExchangeRateSource();

  return apiSuccess({
    base: "USD",
    rates,
    updatedAt: new Date().toISOString(),
    live: source === "live",
    source,
  });
}
