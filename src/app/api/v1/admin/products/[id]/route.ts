import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api/response";

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
    const product = await Product.findByIdAndUpdate(
      params?.id,
      { $set: body },
      { new: true }
    ).lean();
    if (!product) return apiNotFound();
    return apiSuccess(product);
  } catch {
    return apiError("Failed to update product", 500);
  }
}, PERMISSIONS.PRODUCTS_WRITE);

export const DELETE = withAuth(async (_request, { params }) => {
  await connectDB();
  await Product.findByIdAndDelete(params?.id);
  return apiSuccess({ deleted: true });
}, PERMISSIONS.PRODUCTS_WRITE);
