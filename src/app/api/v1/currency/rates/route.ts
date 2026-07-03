import { currencyEngine } from "@/lib/currency/engine";
import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  const rates = currencyEngine.getRates();
  return apiSuccess({ base: "USD", rates, updatedAt: new Date().toISOString() });
}
