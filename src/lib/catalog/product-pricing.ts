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
  // When product-level compare-at is present, respect it (do not resurrect a
  // stale max variant compare like 21.99 after the admin clears/changes Pricing).
  const hasProductCompare = pricing.compareAtPrice != null;
  const compareAtPrice = hasProductCompare
    ? formCompare != null && formCompare > minPrice
      ? formCompare
      : undefined
    : maxCompare != null && maxCompare > minPrice
      ? maxCompare
      : undefined;

  return {
    price: minPrice,
    compareAtPrice,
    currency,
  };
}
