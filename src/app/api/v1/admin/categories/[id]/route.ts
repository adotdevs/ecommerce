import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Category } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { categorySchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api/response";
import { syncProductCategoryNames } from "@/lib/admin/product-helpers";

export const PATCH = withAuth(async (request: NextRequest, { params }) => {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = categorySchema.partial().safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const existing = await Category.findById(params?.id).lean();
    if (!existing) return apiNotFound();

    const data = { ...parsed.data };
    if (data.name && !data.slug) {
      data.slug = slugify(data.name);
    }

    const category = await Category.findByIdAndUpdate(
      params?.id,
      { $set: data },
      { new: true }
    ).lean();
    if (!category) return apiNotFound();

    if (data.name && data.name !== existing.name) {
      await syncProductCategoryNames(params!.id!);
    }

    return apiSuccess(category);
  } catch {
    return apiError("Failed to update category", 500);
  }
}, PERMISSIONS.PRODUCTS_WRITE);

export const DELETE = withAuth(async (_request, { params }) => {
  await connectDB();
  await Category.findByIdAndDelete(params?.id);
  return apiSuccess({ deleted: true });
}, PERMISSIONS.PRODUCTS_WRITE);
