import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { CmsPage } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess } from "@/lib/api/response";

export const GET = withAuth(async () => {
  await connectDB();
  const pages = await CmsPage.find().sort({ updatedAt: -1 }).lean();
  return apiSuccess(pages);
}, PERMISSIONS.CMS_READ);
