import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { productUpdateSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api/response";
import {
  normalizeMedia,
  resolveBrandFields,
  resolveCategoryFields,
} from "@/lib/admin/product-helpers";

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
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const existing = await Product.findById(params?.id);
    if (!existing) return apiNotFound();

    const { categoryIds, brandId, media, weight, dimensions, ...rest } = parsed.data;
    const update: Record<string, unknown> = { ...rest };

    if (weight !== undefined) update.weight = weight ?? undefined;
    if (dimensions !== undefined) update.dimensions = dimensions ?? undefined;

    if (rest.name && !rest.slug) {
      update.slug = slugify(rest.name);
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

    if (rest.pricing) {
      update.pricing = {
        price: rest.pricing.price ?? existing.pricing.price,
        currency: rest.pricing.currency ?? existing.pricing.currency,
        compareAtPrice: rest.pricing.compareAtPrice ?? undefined,
      };
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
    const message =
      err instanceof Error && err.message.includes("duplicate")
        ? "SKU or slug already exists"
        : "Failed to update product";
    return apiError(message, 500);
  }
}, PERMISSIONS.PRODUCTS_WRITE);

export const DELETE = withAuth(async (_request, { params }) => {
  await connectDB();
  const deleted = await Product.findByIdAndDelete(params?.id);
  if (!deleted) return apiNotFound();
  return apiSuccess({ deleted: true });
}, PERMISSIONS.PRODUCTS_WRITE);
