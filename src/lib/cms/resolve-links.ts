import { Product } from "@/models/Product";
import { Category } from "@/models/Category";

/** Extract product slug from a storefront path or full URL */
export function parseProductSlug(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      const match = url.pathname.match(/\/products\/([^/?#]+)/i);
      return match?.[1] ?? null;
    }
  } catch {
    /* not a URL */
  }

  const pathMatch = trimmed.match(/(?:^|\/)products\/([^/?#]+)/i);
  if (pathMatch?.[1]) return pathMatch[1];

  if (!trimmed.includes("/") && !trimmed.includes(" ")) {
    return trimmed.replace(/^\/+/, "");
  }

  return null;
}

/** Extract category slug from path or URL */
export function parseCategorySlug(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      const match = url.pathname.match(/\/categories\/([^/?#]+)/i);
      return match?.[1] ?? null;
    }
  } catch {
    /* not a URL */
  }

  const pathMatch = trimmed.match(/(?:^|\/)categories\/([^/?#]+)/i);
  if (pathMatch?.[1]) return pathMatch[1];

  if (!trimmed.includes("/") && !trimmed.includes(" ")) {
    return trimmed.replace(/^\/+/, "");
  }

  return null;
}

export async function resolveProductsByLinks(links: string[]) {
  const slugs = links
    .map(parseProductSlug)
    .filter((s): s is string => Boolean(s));

  if (slugs.length === 0) return [];

  const products = await Product.find({
    slug: { $in: slugs },
    status: "published",
  }).lean();

  const bySlug = new Map(products.map((p) => [p.slug, p]));
  return slugs.map((slug) => bySlug.get(slug)).filter(Boolean);
}

export async function resolveCategoriesByLinks(links: string[]) {
  const slugs = links
    .map(parseCategorySlug)
    .filter((s): s is string => Boolean(s));

  if (slugs.length === 0) return [];

  const categories = await Category.find({ slug: { $in: slugs } }).lean();
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  return slugs.map((slug) => bySlug.get(slug)).filter(Boolean);
}

export async function lookupProductByLink(input: string) {
  const slug = parseProductSlug(input);
  if (!slug) return null;
  return Product.findOne({ slug, status: "published" })
    .select("name slug media pricing featured")
    .lean();
}

export async function lookupCategoryByLink(input: string) {
  const slug = parseCategorySlug(input);
  if (!slug) return null;
  return Category.findOne({ slug }).select("name slug image").lean();
}
