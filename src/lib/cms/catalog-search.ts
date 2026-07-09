import { Product } from "@/models/Product";
import { Category } from "@/models/Category";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface CatalogSuggestion {
  name: string;
  slug: string;
  image?: string;
  path: string;
}

export async function searchCatalogSuggestions(
  type: "product" | "category",
  query: string,
  limit = 8
): Promise<CatalogSuggestion[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const regex = new RegExp(escapeRegex(q), "i");

  if (type === "category") {
    const categories = await Category.find({
      $or: [{ name: regex }, { slug: regex }],
    })
      .select("name slug image")
      .sort({ sortOrder: 1, name: 1 })
      .limit(limit)
      .lean();

    return categories.map((c) => ({
      name: c.name,
      slug: c.slug,
      image: c.image,
      path: `/categories/${c.slug}`,
    }));
  }

  const products = await Product.find({
    status: "published",
    $or: [{ name: regex }, { slug: regex }],
  })
    .select("name slug media")
    .sort({ name: 1 })
    .limit(limit)
    .lean();

  return products.map((p) => ({
    name: p.name,
    slug: p.slug,
    image: p.media?.[0]?.url,
    path: `/products/${p.slug}`,
  }));
}
