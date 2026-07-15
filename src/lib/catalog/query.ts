import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { Brand } from "@/models/Brand";
import type { CatalogPageSlug } from "@/models/CatalogPage";
import type { Locale } from "@/config/locales";
import { toProductCardData } from "@/lib/catalog/product-card";
import { deepSearchProducts } from "@/lib/search/products";

export type CatalogSort =
  | "newest"
  | "bestsellers"
  | "price-asc"
  | "price-desc"
  | "deals"
  | "featured";

export interface CatalogQueryInput {
  page?: number;
  limit?: number;
  q?: string;
  sort?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
  featured?: boolean;
  /** Minimum average rating (1–5) */
  minRating?: number;
  /** Stock filter */
  availability?: "in-stock" | "out-of-stock" | "all";
  locale?: Locale;
  /** Preset from dedicated catalog routes */
  preset?: CatalogPageSlug;
}

export function resolveCatalogSort(
  sort: string | undefined,
  preset?: CatalogPageSlug
): CatalogSort {
  if (sort === "price-asc") return "price-asc";
  if (sort === "price-desc") return "price-desc";
  if (sort === "bestsellers") return "bestsellers";
  if (sort === "deals") return "deals";
  if (sort === "featured") return "featured";
  if (sort === "new" || sort === "newest") return "newest";

  if (preset === "bestsellers") return "bestsellers";
  if (preset === "deals") return "deals";
  if (preset === "new-arrivals") return "newest";
  return "newest";
}

function buildCatalogFilter(
  input: CatalogQueryInput,
  sort: CatalogSort
): Record<string, unknown> {
  const filter: Record<string, unknown> = { status: "published" };

  if (input.category) {
    filter.categoryNames = input.category;
  }
  if (input.brand) {
    filter.brandName = input.brand;
  }
  if (input.featured || sort === "featured") {
    filter.featured = true;
  }
  if (input.preset === "bestsellers" || sort === "bestsellers") {
    filter.featured = true;
  }
  if (input.preset === "new-arrivals") {
    filter.isNewArrival = true;
  }

  const price: Record<string, number> = {};
  if (input.minPrice != null && !Number.isNaN(input.minPrice)) {
    price.$gte = input.minPrice;
  }
  if (input.maxPrice != null && !Number.isNaN(input.maxPrice)) {
    price.$lte = input.maxPrice;
  }
  if (Object.keys(price).length) {
    filter["pricing.price"] = price;
  }

  const onSale =
    input.onSale === true ||
    sort === "deals" ||
    input.preset === "deals" ||
    input.sort === "deals";
  if (onSale) {
    filter.onSale = true;
  }

  if (input.minRating != null && !Number.isNaN(input.minRating) && input.minRating > 0) {
    filter["rating.average"] = { $gte: input.minRating };
  }

  if (input.availability === "in-stock") {
    filter.$or = [
      { "inventory.stock": { $gt: 0 } },
      { "variants.stock": { $gt: 0 } },
    ];
  } else if (input.availability === "out-of-stock") {
    filter.$and = [
      {
        $or: [
          { "inventory.stock": { $lte: 0 } },
          { inventory: { $exists: false } },
        ],
      },
      {
        $or: [
          { variants: { $size: 0 } },
          { variants: { $exists: false } },
          { variants: { $not: { $elemMatch: { stock: { $gt: 0 } } } } },
        ],
      },
    ];
  }

  return filter;
}

export async function queryCatalogProducts(input: CatalogQueryInput) {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(48, Math.max(1, input.limit ?? 12));
  const skip = (page - 1) * limit;
  const sort = resolveCatalogSort(input.sort, input.preset);
  const filter = buildCatalogFilter(input, sort);
  const searchQuery = input.q?.trim() ?? "";

  if (searchQuery) {
    const deep = await deepSearchProducts(searchQuery, filter, page, limit);
    const [categories, brands, priceAgg] = await Promise.all([
      Category.find().sort({ sortOrder: 1, name: 1 }).select("name slug").lean(),
      Brand.find().sort({ name: 1 }).select("name slug").lean(),
      Product.aggregate([
        { $match: { status: "published" } },
        {
          $group: {
            _id: null,
            min: { $min: "$pricing.price" },
            max: { $max: "$pricing.price" },
          },
        },
      ]),
    ]);

    return {
      products: deep.products.map((p) => toProductCardData(p, input.locale)),
      total: deep.total,
      page: deep.page,
      limit: deep.limit,
      pages: deep.pages,
      sort,
      facets: {
        categories: categories.map((c) => ({
          name: String(c.name),
          slug: String(c.slug),
        })),
        brands: brands.map((b) => ({
          name: String(b.name),
          slug: String(b.slug),
        })),
        priceRange: {
          min: Math.floor(priceAgg[0]?.min ?? 0),
          max: Math.ceil(priceAgg[0]?.max ?? 1000),
        },
      },
    };
  }

  let sortQuery: Record<string, 1 | -1> = { createdAt: -1 };
  if (sort === "price-asc") sortQuery = { "pricing.price": 1 };
  if (sort === "price-desc") sortQuery = { "pricing.price": -1 };
  if (sort === "bestsellers") sortQuery = { featured: -1, "inventory.stock": -1 };
  if (sort === "featured") sortQuery = { featured: -1, createdAt: -1 };
  if (sort === "newest") sortQuery = { isNewArrival: -1, createdAt: -1 };
  if (sort === "deals") sortQuery = { "pricing.price": 1 };

  const [products, total, priceAgg] = await Promise.all([
    Product.find(filter).sort(sortQuery).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
    Product.aggregate([
      { $match: { status: "published" } },
      {
        $group: {
          _id: null,
          min: { $min: "$pricing.price" },
          max: { $max: "$pricing.price" },
        },
      },
    ]),
  ]);

  const [categories, brands] = await Promise.all([
    Category.find().sort({ sortOrder: 1, name: 1 }).select("name slug").lean(),
    Brand.find().sort({ name: 1 }).select("name slug").lean(),
  ]);

  return {
    products: products.map((p) =>
      toProductCardData(p as unknown as Record<string, unknown>, input.locale)
    ),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
    sort,
    facets: {
      categories: categories.map((c) => ({
        name: String(c.name),
        slug: String(c.slug),
      })),
      brands: brands.map((b) => ({
        name: String(b.name),
        slug: String(b.slug),
      })),
      priceRange: {
        min: Math.floor(priceAgg[0]?.min ?? 0),
        max: Math.ceil(priceAgg[0]?.max ?? 1000),
      },
    },
  };
}
