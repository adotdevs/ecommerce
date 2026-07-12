export interface CatalogPricing {
  price: number;
  compareAtPrice?: number;
  currency?: string;
}

export interface VariantPricingLike {
  price?: number | string | null;
  compareAtPrice?: number | string | null;
}

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

/** Storefront + save: use lowest variant price when variants exist. */
export function resolveCatalogPricing(
  pricing: CatalogPricing,
  variants?: VariantPricingLike[]
): CatalogPricing {
  const currency = pricing.currency ?? "USD";

  if (!variants?.length) {
    return {
      price: toNumber(pricing.price) ?? 0,
      compareAtPrice: toNumber(pricing.compareAtPrice) ?? undefined,
      currency,
    };
  }

  const prices = variants
    .map((v) => toNumber(v.price))
    .filter((n): n is number => n != null && n >= 0);

  const comparePrices = variants
    .map((v) => toNumber(v.compareAtPrice))
    .filter((n): n is number => n != null && n > 0);

  const minPrice = prices.length
    ? Math.min(...prices)
    : toNumber(pricing.price) ?? 0;

  const maxCompare = comparePrices.length ? Math.max(...comparePrices) : null;
  const formCompare = toNumber(pricing.compareAtPrice);
  const compareAtPrice =
    maxCompare != null && maxCompare > minPrice
      ? maxCompare
      : formCompare != null && formCompare > minPrice
        ? formCompare
        : undefined;

  return {
    price: minPrice,
    compareAtPrice,
    currency,
  };
}
