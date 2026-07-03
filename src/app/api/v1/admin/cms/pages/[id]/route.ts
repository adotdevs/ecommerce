import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { CmsPage } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api/response";

export const GET = withAuth(async (_request, { params }) => {
  await connectDB();
  const page = await CmsPage.findById(params?.id).lean();
  if (!page) return apiNotFound();
  return apiSuccess(page);
}, PERMISSIONS.CMS_READ);

export const PATCH = withAuth(async (request: NextRequest, { params }) => {
  try {
    await connectDB();
    const body = await request.json();
    if (body.status === "published") body.publishedAt = new Date();

    const page = await CmsPage.findByIdAndUpdate(
      params?.id,
      { $set: body },
      { new: true }
    ).lean();
    if (!page) return apiNotFound();
    return apiSuccess(page);
  } catch {
    return apiError("Failed to update page", 500);
  }
}, PERMISSIONS.CMS_WRITE);

export const DELETE = withAuth(async (_request, { params }) => {
  await connectDB();
  await CmsPage.findByIdAndDelete(params?.id);
  return apiSuccess({ deleted: true });
}, PERMISSIONS.CMS_WRITE);
