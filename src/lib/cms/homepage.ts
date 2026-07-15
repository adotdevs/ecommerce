import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import type { IHomepageSection } from "@/models/HomepageSection";
import {
  resolveProductsByLinks,
  resolveCategoriesByLinks,
  lookupProductByLink,
} from "@/lib/cms/resolve-links";
import { toProductCardData } from "@/lib/catalog/product-card";
import { toCategoryShowcaseList } from "@/lib/catalog/category-showcase";
import type { Locale } from "@/config/locales";

export function isSectionVisible(section: IHomepageSection): boolean {
  if (!section.enabled) return false;
  const now = new Date();
  if (section.schedule?.start && new Date(section.schedule.start) > now) {
    return false;
  }
  if (section.schedule?.end && new Date(section.schedule.end) < now) {
    return false;
  }
  return true;
}

export async function resolveSectionProducts(
  productIds: string[],
  locale?: Locale
): Promise<ReturnType<typeof toProductCardData>[]> {
  if (!productIds.length) return [];
  const products = await Product.find({
    _id: { $in: productIds },
    status: "published",
  }).lean();
  return products.map((p) =>
    toProductCardData(p as unknown as Record<string, unknown>, locale)
  );
}

export async function resolveFeaturedProducts(limit = 8, locale?: Locale) {
  const products = await Product.find({ status: "published", featured: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return products.map((p) =>
    toProductCardData(p as unknown as Record<string, unknown>, locale)
  );
}

async function resolveManualProductCards(
  links: string[],
  limit: number,
  locale?: Locale
) {
  if (!links.length) return [];
  const products = await resolveProductsByLinks(links);
  return products
    .slice(0, limit)
    .map((p) =>
      toProductCardData(p as unknown as Record<string, unknown>, locale)
    );
}

export async function resolveFlashSaleProducts(
  config: Record<string, unknown>,
  locale?: Locale
) {
  const limit = (config.limit as number) ?? 4;

  // Admin "Flash sale on homepage" flag is the primary source
  const flagged = await Product.find({ status: "published", flashSale: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  if (flagged.length > 0) {
    return flagged.map((p) =>
      toProductCardData(p as unknown as Record<string, unknown>, locale)
    );
  }

  const mode = (config.selectionMode as string) ?? "auto";
  const links = (config.productLinks as string[]) ?? [];
  if (mode === "manual" && links.length > 0) {
    return resolveManualProductCards(links, limit, locale);
  }

  return [];
}

export async function resolveHomepageProducts(
  config: Record<string, unknown>,
  locale?: Locale
) {
  const limit = (config.limit as number) ?? 8;

  // Admin "Featured on homepage" flag is the primary source
  const flagged = await Product.find({ status: "published", featured: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  if (flagged.length > 0) {
    return flagged.map((p) =>
      toProductCardData(p as unknown as Record<string, unknown>, locale)
    );
  }

  const mode = (config.selectionMode as string) ?? "auto";
  const links = (config.productLinks as string[]) ?? [];
  if (mode === "manual" && links.length > 0) {
    return resolveManualProductCards(links, limit, locale);
  }

  return resolveFeaturedProducts(limit, locale);
}

export async function resolveProductSliderProducts(
  config: Record<string, unknown>,
  locale?: Locale
) {
  const limit = (config.limit as number) ?? 8;
  const preset = (config.preset as string) ?? "featured";
  const mode = (config.selectionMode as string) ?? "auto";
  const links = (config.productLinks as string[]) ?? [];

  if (mode === "manual" && links.length > 0) {
    return resolveManualProductCards(links, limit, locale);
  }

  if (preset === "bestsellers") {
    const products = await Product.find({ status: "published", featured: true })
      .sort({ featured: -1, "inventory.stock": -1, createdAt: -1 })
      .limit(limit)
      .lean();
    if (products.length > 0) {
      return products.map((p) =>
        toProductCardData(p as unknown as Record<string, unknown>, locale)
      );
    }
  }

  if (preset === "new_arrivals") {
    const products = await Product.find({ status: "published", isNewArrival: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    if (products.length > 0) {
      return products.map((p) =>
        toProductCardData(p as unknown as Record<string, unknown>, locale)
      );
    }
  }

  if (preset === "deals") {
    const products = await Product.find({ status: "published", onSale: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    if (products.length > 0) {
      return products.map((p) =>
        toProductCardData(p as unknown as Record<string, unknown>, locale)
      );
    }
  }

  return resolveHomepageProducts(config, locale);
}

export async function resolveHomepageCategories(config: Record<string, unknown>) {
  const mode = (config.selectionMode as string) ?? "auto";
  const links = (config.categoryLinks as string[]) ?? [];

  if (mode === "manual" && links.length > 0) {
    const categories = await resolveCategoriesByLinks(links);
    if (categories.length > 0) {
      return toCategoryShowcaseList(categories);
    }
  }

  const categories = await Category.find().sort({ sortOrder: 1 }).limit(8).lean();
  return toCategoryShowcaseList(categories);
}

/** Apply product link data to a hero slide or promo banner */
export async function enrichConfigFromProductLink(
  config: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const productLink = config.productLink as string | undefined;
  if (!productLink?.trim()) return config;

  const product = await lookupProductByLink(productLink);
  if (!product) return config;

  const image = product.media?.[0]?.url;
  const href = `/products/${product.slug}`;

  return {
    ...config,
    title: config.title || product.name,
    subtitle: config.subtitle || product.shortDescription || config.subtitle,
    image: config.image || image,
    cta: {
      label: (config.cta as { label?: string })?.label || "Shop Now",
      href: (config.cta as { href?: string })?.href || href,
    },
  };
}

export async function enrichHeroSlidesFromLinks(
  config: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const slides = (config.slides as Array<Record<string, unknown>>) ?? [];
  if (slides.length === 0) return config;

  const enriched = await Promise.all(
    slides.map(async (slide) => {
      const link = slide.productLink as string | undefined;
      if (!link?.trim()) return slide;

      const product = await lookupProductByLink(link);
      if (!product) return slide;

      const image = product.media?.[0]?.url;
      return {
        ...slide,
        title: slide.title || product.name,
        subtitle: slide.subtitle || product.shortDescription || slide.subtitle,
        image: slide.image || image,
        cta: {
          label: (slide.cta as { label?: string })?.label || "Shop Now",
          href: (slide.cta as { href?: string })?.href || `/products/${product.slug}`,
        },
      };
    })
  );

  return { ...config, slides: enriched };
}
