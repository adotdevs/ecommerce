import type { IPromoCode } from "@/models/PromoCode";

export function normalizePromoCode(code: string) {
  return code.trim().toUpperCase();
}

export function calculatePromoDiscountUsd(subtotalUsd: number, percentOff: number) {
  const raw = subtotalUsd * (percentOff / 100);
  return Math.round(raw * 100) / 100;
}

export function validatePromoForOrder(
  promo: Pick<
    IPromoCode,
    "code" | "percentOff" | "active" | "minOrderUsd" | "maxUses" | "usedCount" | "expiresAt"
  > | null,
  subtotalUsd: number
): { valid: true; percentOff: number; code: string } | { valid: false; error: string } {
  if (!promo) return { valid: false, error: "Invalid promo code" };
  if (!promo.active) return { valid: false, error: "This promo code is no longer active" };

  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
    return { valid: false, error: "This promo code has expired" };
  }

  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
    return { valid: false, error: "This promo code has reached its usage limit" };
  }

  if (promo.minOrderUsd != null && subtotalUsd < promo.minOrderUsd) {
    return {
      valid: false,
      error: `Minimum order of $${promo.minOrderUsd.toFixed(2)} required for this code`,
    };
  }

  return { valid: true, percentOff: promo.percentOff, code: promo.code };
}
