/** Storefront / checkout estimated tax (percent of taxable subtotal). */

export const DEFAULT_TAX_RATE_PERCENT = 8;

export function normalizeTaxRatePercent(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_TAX_RATE_PERCENT;
  return Math.min(100, Math.round(n * 100) / 100);
}

/** Convert admin percent (e.g. 8) to a fraction used in totals (0.08). */
export function taxRateFraction(percent: unknown): number {
  return normalizeTaxRatePercent(percent) / 100;
}
