import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Category } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api/response";

export const PATCH = withAuth(async (request: NextRequest, { params }) => {
  try {
    await connectDB();
    const body = await request.json();
    const category = await Category.findByIdAndUpdate(
      params?.id,
      { $set: body },
      { new: true }
    ).lean();
    if (!category) return apiNotFound();
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
