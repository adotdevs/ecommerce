import type { Locale } from "@/config/locales";
import { localizeProductDoc } from "@/lib/i18n/product";
import { resolveCatalogPricing } from "@/lib/catalog/product-pricing";
import type {
  VariantOptionGroup,
  ProductVariantInput,
} from "@/lib/catalog/variant-options";

/** Plain product shape safe to pass into Client Components (no ObjectIds). */
export interface ProductCardData {
  _id: string;
  name: string;
  slug: string;
  pricing: { price: number; compareAtPrice?: number; currency?: string };
  media?: { url: string; alt?: string }[];
  brandName?: string;
  featured?: boolean;
  onSale?: boolean;
  flashSale?: boolean;
  hasVariants?: boolean;
  variantOptions?: VariantOptionGroup[];
  variants?: ProductVariantInput[];
  inventory?: { stock: number };
  rating?: { average: number; count: number };
}

/** Pick only card fields and coerce Mongo ObjectIds / Dates to plain values. */
export function toProductCardData(
  product: Record<string, unknown> | null | undefined,
  locale?: Locale
): ProductCardData {
  const p = locale ? localizeProductDoc(product ?? {}, locale) : (product ?? {});
  const pricing = (p.pricing as Record<string, unknown> | undefined) ?? {};
  const variants = Array.isArray(p.variants) ? p.variants : [];
  const resolvedPricing = resolveCatalogPricing(
    {
      price: Number(pricing.price ?? 0),
      compareAtPrice:
        pricing.compareAtPrice != null ? Number(pricing.compareAtPrice) : undefined,
      currency: pricing.currency != null ? String(pricing.currency) : undefined,
    },
    variants as { price?: number; compareAtPrice?: number }[]
  );
  const inventory = (p.inventory as Record<string, unknown> | undefined) ?? {};
  const media = Array.isArray(p.media) ? p.media : [];
  const rating = p.rating as Record<string, unknown> | undefined;

  return {
    _id: String(p._id ?? ""),
    name: String(p.name ?? ""),
    slug: String(p.slug ?? ""),
    pricing: {
      price: resolvedPricing.price,
      compareAtPrice: resolvedPricing.compareAtPrice,
      currency: resolvedPricing.currency,
    },
    media: media
      .map((m) => {
        const item = m as Record<string, unknown>;
        if (!item?.url) return null;
        return {
          url: String(item.url),
          alt: item.alt != null ? String(item.alt) : undefined,
        };
      })
      .filter(Boolean) as { url: string; alt?: string }[],
    brandName: p.brandName != null ? String(p.brandName) : undefined,
    featured: Boolean(p.featured),
    onSale: Boolean(p.onSale),
    flashSale: Boolean(p.flashSale),
    hasVariants: variants.length > 0,
    variantOptions: variants.length
      ? ((p.variantOptions as unknown[]) ?? []).map((g) => {
          const group = g as Record<string, unknown>;
          return {
            id: String(group.id),
            name: String(group.name),
            type: group.type as VariantOptionGroup["type"],
            attributeKey:
              group.attributeKey != null ? String(group.attributeKey) : undefined,
            values: ((group.values as unknown[]) ?? []).map((v) => {
              const val = v as Record<string, unknown>;
              return {
                value: String(val.value),
                label: String(val.label ?? val.value),
                hex: val.hex != null ? String(val.hex) : undefined,
              };
            }),
          };
        })
      : undefined,
    variants: variants.length
      ? variants.map((v) => {
          const variant = v as Record<string, unknown>;
          return {
            id: String(variant.id),
            name: String(variant.name),
            sku: String(variant.sku),
            price: Number(variant.price),
            compareAtPrice:
              variant.compareAtPrice != null
                ? Number(variant.compareAtPrice)
                : undefined,
            stock: Number(variant.stock),
            attributes: Object.fromEntries(
              Object.entries(
                (variant.attributes as Record<string, unknown>) ?? {}
              ).map(([k, val]) => [k, String(val)])
            ),
          };
        })
      : undefined,
    inventory: {
      stock: Number(inventory.stock ?? 0),
    },
    rating: {
      average: Number(rating?.average ?? 0),
      count: Number(rating?.count ?? 0),
    },
  };
}

/** In-stock for cards: sum variant stock when options exist, else parent inventory. */
export function isProductCardInStock(product: ProductCardData): boolean {
  if (product.hasVariants && product.variants?.length) {
    return product.variants.some((v) => (Number(v.stock) || 0) > 0);
  }
  return (product.inventory?.stock ?? 0) > 0;
}
