import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { PromoCode } from "@/models";
import { apiSuccess, apiError } from "@/lib/api/response";
import {
  calculatePromoDiscountUsd,
  normalizePromoCode,
  validatePromoForOrder,
} from "@/lib/promo/validate";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const code = normalizePromoCode(String(body.code ?? ""));
    const subtotalUsd = Number(body.subtotalUsd ?? 0);

    if (!code) return apiError("Enter a promo code");
    if (!Number.isFinite(subtotalUsd) || subtotalUsd <= 0) {
      return apiError("Cart subtotal is required");
    }

    const promo = await PromoCode.findOne({ code }).lean();
    const result = validatePromoForOrder(promo, subtotalUsd);
    if (!result.valid) return apiError(result.error, 400);

    const discountUsd = calculatePromoDiscountUsd(subtotalUsd, result.percentOff);

    return apiSuccess({
      code: result.code,
      percentOff: result.percentOff,
      discountUsd,
    });
  } catch {
    return apiError("Failed to validate promo code", 500);
  }
}
