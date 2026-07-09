/** Plain product shape safe to pass into Client Components (no ObjectIds). */
export interface ProductCardData {
  _id: string;
  name: string;
  slug: string;
  pricing: { price: number; compareAtPrice?: number; currency?: string };
  media?: { url: string; alt?: string }[];
  brandName?: string;
  featured?: boolean;
  inventory?: { stock: number };
}

/** Pick only card fields and coerce Mongo ObjectIds / Dates to plain values. */
export function toProductCardData(product: Record<string, unknown> | null | undefined): ProductCardData {
  const p = product ?? {};
  const pricing = (p.pricing as Record<string, unknown> | undefined) ?? {};
  const inventory = (p.inventory as Record<string, unknown> | undefined) ?? {};
  const media = Array.isArray(p.media) ? p.media : [];

  return {
    _id: String(p._id ?? ""),
    name: String(p.name ?? ""),
    slug: String(p.slug ?? ""),
    pricing: {
      price: Number(pricing.price ?? 0),
      compareAtPrice:
        pricing.compareAtPrice != null ? Number(pricing.compareAtPrice) : undefined,
      currency: pricing.currency != null ? String(pricing.currency) : undefined,
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
    inventory: {
      stock: Number(inventory.stock ?? 0),
    },
  };
}
