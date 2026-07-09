import mongoose from "mongoose";
import { Category, Brand } from "@/models";

export interface ProductMediaInput {
  url: string;
  alt?: string;
  type?: "image" | "video";
  sortOrder: number;
}

export async function resolveCategoryFields(categoryIds: string[]) {
  if (!categoryIds.length) {
    return { categoryIds: [], categoryNames: [] };
  }
  const objectIds = categoryIds.map((id) => new mongoose.Types.ObjectId(id));
  const categories = await Category.find({ _id: { $in: objectIds } })
    .select("name")
    .lean();
  const nameById = new Map(categories.map((c) => [String(c._id), c.name]));
  const categoryNames = categoryIds
    .map((id) => nameById.get(id))
    .filter((n): n is string => Boolean(n));
  return { categoryIds: objectIds, categoryNames };
}

export async function resolveBrandFields(brandId?: string) {
  if (!brandId) return { brandId: undefined, brandName: undefined };
  const brand = await Brand.findById(brandId).select("name").lean();
  if (!brand) return { brandId: undefined, brandName: undefined };
  return {
    brandId: new mongoose.Types.ObjectId(brandId),
    brandName: brand.name,
  };
}

export async function syncProductCategoryNames(categoryId: string) {
  const { Product } = await import("@/models");
  const products = await Product.find({ categoryIds: categoryId })
    .select("categoryIds")
    .lean();
  if (!products.length) return;

  const allCatIds = [
    ...new Set(products.flatMap((p) => p.categoryIds.map(String))),
  ];
  const categories = await Category.find({ _id: { $in: allCatIds } })
    .select("name")
    .lean();
  const nameById = new Map(categories.map((c) => [String(c._id), c.name]));

  await Promise.all(
    products.map((p) => {
      const categoryNames = p.categoryIds
        .map((id) => nameById.get(String(id)))
        .filter((n): n is string => Boolean(n));
      return Product.updateOne({ _id: p._id }, { $set: { categoryNames } });
    })
  );
}

export function normalizeMedia(
  media: ProductMediaInput[] | undefined
): ProductMediaInput[] {
  if (!media?.length) return [];
  return media
    .filter((m) => m.url?.trim())
    .map((m, i) => ({
      url: m.url.trim(),
      alt: m.alt?.trim() || undefined,
      type: m.type ?? "image",
      sortOrder: m.sortOrder ?? i,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m, i) => ({ ...m, sortOrder: i }));
}

export function isOnSale(pricing: {
  price: number;
  compareAtPrice?: number;
}): boolean {
  return (
    pricing.compareAtPrice != null &&
    pricing.compareAtPrice > 0 &&
    pricing.compareAtPrice > pricing.price
  );
}
