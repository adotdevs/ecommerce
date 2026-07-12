import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { productUpdateSchema } from "@/lib/validators";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api/response";
import {
  normalizeMedia,
  resolveBrandFields,
  resolveCategoryFields,
  resolveProductSlug,
  resolveProductSku,
  duplicateProductFieldMessage,
  ProductFieldConflictError,
} from "@/lib/admin/product-helpers";
import { resolveCatalogPricing } from "@/lib/catalog/product-pricing";
import { deleteProductsByIds } from "@/lib/admin/delete-products";

export const GET = withAuth(async (_request, { params }) => {
  await connectDB();
  const product = await Product.findById(params?.id).lean();
  if (!product) return apiNotFound();
  return apiSuccess(product);
}, PERMISSIONS.PRODUCTS_READ);

export const PATCH = withAuth(async (request: NextRequest, { params }) => {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = productUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue.path.length ? `${issue.path.join(".")}: ` : "";
      return apiError(`${field}${issue.message}`);
    }

    const existing = await Product.findById(params?.id);
    if (!existing) return apiNotFound();

    const { categoryIds, brandId, media, weight, dimensions, ...rest } = parsed.data;
    const update: Record<string, unknown> = { ...rest };

    if (weight !== undefined) update.weight = weight ?? undefined;
    if (dimensions !== undefined) update.dimensions = dimensions ?? undefined;

    if (parsed.data.slug !== undefined) {
      const resolved = await resolveProductSlug({
        name: rest.name ?? existing.name,
        requestedSlug: rest.slug,
        excludeProductId: String(existing._id),
      });
      update.slug = resolved.slug;
    }

    if (parsed.data.sku !== undefined && rest.sku) {
      const resolved = await resolveProductSku({
        sku: rest.sku,
        excludeProductId: String(existing._id),
      });
      update.sku = resolved.sku;
    }

    if (categoryIds !== undefined) {
      const categoryFields = await resolveCategoryFields(categoryIds);
      Object.assign(update, categoryFields);
    }

    if (brandId !== undefined) {
      if (brandId) {
        const brandFields = await resolveBrandFields(brandId);
        Object.assign(update, brandFields);
      } else {
        update.brandId = null;
        update.brandName = null;
      }
    }

    if (media !== undefined) {
      update.media = normalizeMedia(media);
    }

    if (rest.pricing || rest.variants !== undefined) {
      const variants =
        rest.variants !== undefined ? rest.variants : existing.variants;
      const basePricing = {
        price: rest.pricing?.price ?? existing.pricing.price,
        compareAtPrice:
          rest.pricing?.compareAtPrice ?? existing.pricing.compareAtPrice,
        currency: rest.pricing?.currency ?? existing.pricing.currency,
      };
      update.pricing = resolveCatalogPricing(basePricing, variants);
    }

    if (rest.variants !== undefined) {
      update.variants = rest.variants;
    }

    const product = await Product.findByIdAndUpdate(
      params?.id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!product) return apiNotFound();
    return apiSuccess(product);
  } catch (err) {
    console.error(err);
    if (err instanceof ProductFieldConflictError) {
      return apiError(err.message, 409);
    }
    const duplicate = duplicateProductFieldMessage(err);
    return apiError(
      duplicate ?? "Failed to update product",
      duplicate ? 409 : 500
    );
  }
}, PERMISSIONS.PRODUCTS_WRITE);

export const DELETE = withAuth(async (_request, { params }) => {
  await connectDB();
  const id = params?.id;
  if (!id) return apiNotFound();

  const result = await deleteProductsByIds([id]);
  if (result.deleted === 0) return apiNotFound();
  return apiSuccess({ deleted: true });
}, PERMISSIONS.PRODUCTS_WRITE);
