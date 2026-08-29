export interface CatalogPricing {
  price: number;
  compareAtPrice?: number;
  currency?: string;
}

export interface VariantPricingLike {
  price?: number | string | null;
  compareAtPrice?: number | string | null;
  /** When true, this variant drives product listing price / default selection */
  isMain?: boolean;
}

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

/** Storefront + save: main variant price when set, else lowest variant price. */
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

  const main = variants.find((v) => v.isMain);
  if (main) {
    const price = toNumber(main.price) ?? 0;
    const compare = toNumber(main.compareAtPrice);
    return {
      price,
      compareAtPrice:
        compare != null && compare > price ? compare : undefined,
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
  const compareAtPrice =
    maxCompare != null && maxCompare > minPrice ? maxCompare : undefined;

  return {
    price: minPrice,
    compareAtPrice,
    currency,
  };
}
