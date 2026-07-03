import { Product } from "@/models/Product";

export interface SearchFilters {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
}

export async function searchProducts(
  query: string,
  filters: SearchFilters = {},
  page = 1,
  limit = 20
) {
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = { status: "published" };

  if (filters.category) {
    filter.categoryNames = filters.category;
  }
  if (filters.brand) {
    filter.brandName = filters.brand;
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    filter["pricing.price"] = {};
    if (filters.minPrice !== undefined) {
      (filter["pricing.price"] as Record<string, number>).$gte = filters.minPrice;
    }
    if (filters.maxPrice !== undefined) {
      (filter["pricing.price"] as Record<string, number>).$lte = filters.maxPrice;
    }
  }

  if (query.trim()) {
    filter.$text = { $search: query };
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(query.trim() ? { score: { $meta: "textScore" } } : { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  return { products, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function searchSuggestions(query: string, limit = 8) {
  if (!query.trim()) return [];

  const products = await Product.find(
    {
      status: "published",
      $text: { $search: query },
    },
    { score: { $meta: "textScore" }, name: 1, slug: 1, "pricing.price": 1, media: 1 }
  )
    .sort({ score: { $meta: "textScore" } })
    .limit(limit)
    .lean();

  return products.map((p) => ({
    id: p._id,
    name: p.name,
    slug: p.slug,
    price: p.pricing?.price,
    image: p.media?.[0]?.url,
  }));
}

// Atlas Search aggregation pipeline (when Atlas Search index is configured)
export function buildAtlasSearchPipeline(
  query: string,
  filters: SearchFilters = {},
  page = 1,
  limit = 20
) {
  const must: Record<string, unknown>[] = [];

  if (query.trim()) {
    must.push({
      text: {
        query,
        path: ["name", "description", "tags", "brandName", "categoryNames"],
        fuzzy: { maxEdits: 1 },
      },
    });
  }

  const filter: Record<string, unknown>[] = [
    { equals: { path: "status", value: "published" } },
  ];

  if (filters.category) {
    filter.push({ text: { query: filters.category, path: "categoryNames" } });
  }
  if (filters.brand) {
    filter.push({ text: { query: filters.brand, path: "brandName" } });
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const range: Record<string, number> = {};
    if (filters.minPrice !== undefined) range.gte = filters.minPrice;
    if (filters.maxPrice !== undefined) range.lte = filters.maxPrice;
    filter.push({ range: { path: "pricing.price", ...range } });
  }

  const skip = (page - 1) * limit;

  return [
    {
      $search: {
        index: "products_search",
        compound: {
          must: must.length ? must : [{ exists: { path: "name" } }],
          filter,
        },
      },
    },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        name: 1,
        slug: 1,
        pricing: 1,
        media: 1,
        brandName: 1,
        categoryNames: 1,
        score: { $meta: "searchScore" },
      },
    },
  ];
}

export async function atlasSearchProducts(
  query: string,
  filters: SearchFilters = {},
  page = 1,
  limit = 20
) {
  try {
    const pipeline = buildAtlasSearchPipeline(query, filters, page, limit);
    const products = await Product.aggregate(pipeline);
    return { products, total: products.length, page, limit, source: "atlas" as const };
  } catch {
    return searchProducts(query, filters, page, limit);
  }
}
