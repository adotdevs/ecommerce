import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import type { IHomepageSection } from "@/models/HomepageSection";
import {
  resolveProductsByLinks,
  resolveCategoriesByLinks,
  lookupProductByLink,
} from "@/lib/cms/resolve-links";
import { toProductCardData } from "@/lib/catalog/product-card";

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
  productIds: string[]
): Promise<ReturnType<typeof toProductCardData>[]> {
  if (!productIds.length) return [];
  const products = await Product.find({
    _id: { $in: productIds },
    status: "published",
  }).lean();
  return products.map((p) => toProductCardData(p as unknown as Record<string, unknown>));
}

export async function resolveFeaturedProducts(limit = 8) {
  const products = await Product.find({ status: "published", featured: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return products.map((p) => toProductCardData(p as unknown as Record<string, unknown>));
}

export async function resolveHomepageProducts(config: Record<string, unknown>) {
  const mode = (config.selectionMode as string) ?? "auto";
  const links = (config.productLinks as string[]) ?? [];

  if (mode === "manual" && links.length > 0) {
    const products = await resolveProductsByLinks(links);
    if (products.length > 0) {
      return products.map((p) => toProductCardData(p as unknown as Record<string, unknown>));
    }
  }

  return resolveFeaturedProducts((config.limit as number) ?? 8);
}

export async function resolveHomepageCategories(config: Record<string, unknown>) {
  const mode = (config.selectionMode as string) ?? "auto";
  const links = (config.categoryLinks as string[]) ?? [];

  if (mode === "manual" && links.length > 0) {
    const categories = await resolveCategoriesByLinks(links);
    if (categories.length > 0) return categories;
  }

  return Category.find().sort({ sortOrder: 1 }).limit(8).lean();
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
