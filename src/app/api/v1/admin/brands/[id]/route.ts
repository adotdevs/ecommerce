import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Brand } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api/response";

export const PATCH = withAuth(async (request: NextRequest, { params }) => {
  try {
    await connectDB();
    const body = await request.json();
    const brand = await Brand.findByIdAndUpdate(
      params?.id,
      { $set: body },
      { new: true }
    ).lean();
    if (!brand) return apiNotFound();
    return apiSuccess(brand);
  } catch {
    return apiError("Failed to update brand", 500);
  }
}, PERMISSIONS.PRODUCTS_WRITE);

export const DELETE = withAuth(async (_request, { params }) => {
  await connectDB();
  await Brand.findByIdAndDelete(params?.id);
  return apiSuccess({ deleted: true });
}, PERMISSIONS.PRODUCTS_WRITE);
