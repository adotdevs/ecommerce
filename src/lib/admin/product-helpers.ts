import mongoose from "mongoose";
import { Category, Brand } from "@/models";
import { slugify } from "@/lib/utils";

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

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export async function productSlugTaken(
  slug: string,
  excludeProductId?: string
): Promise<boolean> {
  const { Product } = await import("@/models");
  const filter: Record<string, unknown> = { slug: normalizeSlug(slug) };
  if (excludeProductId) {
    filter._id = { $ne: new mongoose.Types.ObjectId(excludeProductId) };
  }
  const existing = await Product.findOne(filter).select("_id").lean();
  return Boolean(existing);
}

export async function productSkuTaken(
  sku: string,
  excludeProductId?: string
): Promise<boolean> {
  const { Product } = await import("@/models");
  const filter: Record<string, unknown> = { sku: sku.trim() };
  if (excludeProductId) {
    filter._id = { $ne: new mongoose.Types.ObjectId(excludeProductId) };
  }
  const existing = await Product.findOne(filter).select("_id").lean();
  return Boolean(existing);
}

export async function ensureUniqueProductSlug(
  baseSlug: string,
  excludeProductId?: string
): Promise<string> {
  const root = normalizeSlug(baseSlug) || "product";
  let candidate = root;
  let attempt = 0;

  while (await productSlugTaken(candidate, excludeProductId)) {
    attempt += 1;
    const suffix =
      attempt < 20
        ? `-${attempt}`
        : `-${Math.random().toString(36).slice(2, 6)}`;
    candidate = `${root}${suffix}`.slice(0, 120);
  }

  return candidate;
}

export async function ensureUniqueProductSku(
  baseSku: string,
  excludeProductId?: string
): Promise<string> {
  const root = baseSku.trim() || "PRD";
  let candidate = root;
  let attempt = 0;

  while (await productSkuTaken(candidate, excludeProductId)) {
    attempt += 1;
    const suffix =
      attempt < 20
        ? `-${attempt}`
        : `-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    candidate = `${root}${suffix}`.slice(0, 24);
  }

  return candidate;
}

export async function resolveProductSlug(input: {
  name: string;
  requestedSlug?: string;
  excludeProductId?: string;
}): Promise<{ slug: string; autoAdjusted: boolean }> {
  const nameSlug = normalizeSlug(slugify(input.name));
  const candidate = normalizeSlug(
    input.requestedSlug?.trim() ? input.requestedSlug : nameSlug
  );
  const explicitCustom =
    Boolean(input.requestedSlug?.trim()) && candidate !== nameSlug;

  if (explicitCustom && (await productSlugTaken(candidate, input.excludeProductId))) {
    throw new ProductFieldConflictError("slug", candidate);
  }

  const slug = await ensureUniqueProductSlug(candidate, input.excludeProductId);
  return {
    slug,
    autoAdjusted: slug !== candidate,
  };
}

export async function resolveProductSku(input: {
  sku: string;
  excludeProductId?: string;
}): Promise<{ sku: string; autoAdjusted: boolean }> {
  const normalized = input.sku.trim();
  if (!normalized) {
    throw new ProductFieldConflictError("sku", "");
  }

  if (!(await productSkuTaken(normalized, input.excludeProductId))) {
    return { sku: normalized, autoAdjusted: false };
  }

  if (input.excludeProductId) {
    throw new ProductFieldConflictError("sku", normalized);
  }

  const sku = await ensureUniqueProductSku(normalized, input.excludeProductId);
  return { sku, autoAdjusted: sku !== normalized };
}

export class ProductFieldConflictError extends Error {
  constructor(
    public readonly field: "slug" | "sku",
    public readonly value: string
  ) {
    super(
      field === "slug"
        ? `URL slug "${value}" is already used by another product`
        : `SKU "${value}" is already used by another product`
    );
    this.name = "ProductFieldConflictError";
  }
}

export function duplicateProductFieldMessage(err: unknown): string | null {
  if (err instanceof ProductFieldConflictError) {
    return err.message;
  }
  if (err && typeof err === "object" && "code" in err && err.code === 11000) {
    const keyValue =
      "keyValue" in err && err.keyValue && typeof err.keyValue === "object"
        ? (err.keyValue as Record<string, string>)
        : null;
    if (keyValue?.slug) {
      return `URL slug "${keyValue.slug}" is already used by another product`;
    }
    if (keyValue?.sku) {
      return `SKU "${keyValue.sku}" is already used by another product`;
    }
  }
  return null;
}
